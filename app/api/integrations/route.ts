import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/app/api/_helpers";
import { IntegrationType, Prisma } from "@prisma/client";
import { ensureIntegrationSecretsEncrypted, presentIntegration, protectIntegrationConfig } from "@/lib/integrations/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();

    const integrations = await prisma.integration.findMany({
      where: { workspaceId: session.workspaceId },
      orderBy: { createdAt: "asc" },
    });

    const securedIntegrations = await Promise.all(integrations.map(ensureIntegrationSecretsEncrypted));
    const response = apiSuccess({ integrations: securedIntegrations.map(presentIntegration) });
    response.headers.set("Cache-Control", "no-store, max-age=0");
    return response;
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[integrations get] Request failed");
    return apiError("Failed to fetch integrations", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const { type, name, config } = body as { type?: unknown; name?: unknown; config?: unknown };
    if (
      typeof type !== "string" ||
      !Object.values(IntegrationType).includes(type as IntegrationType) ||
      typeof name !== "string" ||
      !name.trim()
    ) {
      return apiError("Type and Name are required", 400);
    }

    if (typeof config !== "object" || config === null || Array.isArray(config)) {
      return apiError("Integration configuration must be an object", 400);
    }

    const existing = await prisma.integration.findUnique({
      where: {
        workspaceId_type_name: {
          workspaceId: session.workspaceId,
          type: type as IntegrationType,
          name: name.trim(),
        },
      },
    });
    const protectedConfig = protectIntegrationConfig(type as IntegrationType, config, existing?.config);

    const integration = await prisma.integration.upsert({
      where: {
        workspaceId_type_name: {
          workspaceId: session.workspaceId,
          type: type as IntegrationType,
          name: name.trim(),
        },
      },
      update: {
        config: protectedConfig as Prisma.InputJsonObject,
        isConnected: false,
        lastTestedAt: null,
        updatedAt: new Date(),
      },
      create: {
        workspaceId: session.workspaceId,
        type: type as IntegrationType,
        name: name.trim(),
        config: protectedConfig as Prisma.InputJsonObject,
        isConnected: false,
      },
    });

    return apiSuccess({ integration: presentIntegration(integration) });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[integrations post] Request failed");
    return apiError("Failed to save integration", 500);
  }
}

