import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/app/api/_helpers";
import { env } from "@/lib/config/env";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { workspaceId } = session;
    const { id } = await params;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      },
    });

    if (!workflow) return apiError("Workflow not found", 404);
    if (workflow.workspaceId !== workspaceId) return apiError("Forbidden", 403);

    const latestVersion = workflow.versions[0];
    if (!latestVersion) return apiError("No workflow version found to publish", 400);

    const definition = latestVersion.definition as { nodes?: unknown };
    const webhookNode = Array.isArray(definition.nodes)
      ? definition.nodes.find((node): node is Record<string, unknown> =>
          typeof node === "object" && node !== null && "type" in node && node.type === "trigger-webhook",
        )
      : undefined;
    const nodeData = webhookNode?.data as Record<string, unknown> | undefined;
    const nodeConfig = nodeData?.config as Record<string, unknown> | undefined;
    const configuredMethod = String(nodeConfig?.method || "POST").toUpperCase();
    const method = ["GET", "POST", "PUT"].includes(configuredMethod) ? configuredMethod : "POST";

    const publishResult = await prisma.$transaction(async (transaction) => {
      await transaction.workflowVersion.update({
        where: { id: latestVersion.id },
        data: { isPublished: true },
      });
      const updatedWorkflow = await transaction.workflow.update({
        where: { id },
        data: {
          isPublished: true,
          status: "ACTIVE",
          currentVersionId: latestVersion.id,
        },
      });

      let webhookEndpoint = null;
      if (webhookNode) {
        const existingEndpoint = await transaction.webhookEndpoint.findFirst({
          where: { workflowId: id },
          orderBy: { createdAt: "asc" },
        });
        webhookEndpoint = existingEndpoint
          ? await transaction.webhookEndpoint.update({
              where: { id: existingEndpoint.id },
              data: { method, isActive: true },
            })
          : await transaction.webhookEndpoint.create({
              data: { workflowId: id, method },
            });
      } else {
        await transaction.webhookEndpoint.updateMany({
          where: { workflowId: id, isActive: true },
          data: { isActive: false },
        });
      }

      return { workflow: updatedWorkflow, webhookEndpoint };
    });

    const webhookUrl = publishResult.webhookEndpoint
      ? `${env.appUrl.replace(/\/+$/, "")}/api/webhooks/${publishResult.webhookEndpoint.token}`
      : null;

    return NextResponse.json({
      success: true,
      data: { workflow: publishResult.workflow, webhookEndpoint: publishResult.webhookEndpoint, webhookUrl },
    }, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[workflow publish] Request failed");
    return apiError("Internal server error", 500);
  }
}
