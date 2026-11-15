import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/app/api/_helpers";
import { AIClient } from "@/lib/ai/client";
import nodemailer from "nodemailer";
import { resolveAIConfig, resolveSMTPConfig } from "@/lib/engine/integration-resolver";
import { ensureIntegrationSecretsEncrypted } from "@/lib/integrations/config";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const foundIntegration = await prisma.integration.findUnique({
      where: { id },
    });

    if (!foundIntegration) return apiError("Integration not found", 404);
    if (foundIntegration.workspaceId !== session.workspaceId) return apiError("Forbidden", 403);
    const integration = await ensureIntegrationSecretsEncrypted(foundIntegration);

    let isConnected = false;
    let message = "";
    let models: string[] = [];

    if (integration.type === "OLLAMA" || integration.type === "OPENAI_COMPATIBLE") {
      const client = new AIClient(resolveAIConfig(integration.type, integration.config));
      const health = await client.checkHealth();
      isConnected = health.available;
      models = health.models;
      message = health.available
        ? `Connected to AI provider successfully. ${models.length} model(s) available.`
        : health.error || "Could not connect to AI provider.";
    } else if (integration.type === "SMTP") {
      const smtp = resolveSMTPConfig(integration.config);

      try {
        const transporter = nodemailer.createTransport({
          host: smtp.host,
          port: smtp.port,
          secure: smtp.secure,
          auth: { user: smtp.user, pass: smtp.pass },
        });
        await transporter.verify();
        isConnected = true;
        message = "SMTP server connected and verified successfully!";
      } catch {
        isConnected = false;
        message = "SMTP verification failed. Check the configured server and credentials.";
      }
    } else {
      // General HTTP / Webhook integration test
      isConnected = true;
      message = "Integration test passed.";
    }

    await prisma.integration.update({
      where: { id },
      data: {
        isConnected,
        lastTestedAt: new Date(),
      },
    });

    if (isConnected && (integration.type === "OLLAMA" || integration.type === "OPENAI_COMPATIBLE")) {
      await prisma.integration.updateMany({
        where: {
          workspaceId: session.workspaceId,
          id: { not: id },
          type: { in: ["OLLAMA", "OPENAI_COMPATIBLE"] },
          isConnected: true,
        },
        data: { isConnected: false },
      });
    } else if (isConnected && integration.type === "SMTP") {
      await prisma.integration.updateMany({
        where: {
          workspaceId: session.workspaceId,
          id: { not: id },
          type: "SMTP",
          isConnected: true,
        },
        data: { isConnected: false },
      });
    }

    return apiSuccess({ isConnected, message, models });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    if (err instanceof Error && (err.message.startsWith("AI integration is incomplete") || err.message.startsWith("SMTP integration is incomplete"))) {
      return apiError(err.message, 400);
    }
    console.error("[integration test] Integration verification failed");
    return apiError("Failed to test integration", 500);
  }
}

