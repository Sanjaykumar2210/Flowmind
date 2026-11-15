import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/app/api/_helpers";
import { WorkflowStatus, TriggerType } from "@prisma/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const template = await prisma.workflowTemplate.findUnique({
      where: { id },
    });

    if (!template) return apiError("Template not found", 404);

    // Create workflow from template definition
    const workflow = await prisma.workflow.create({
      data: {
        workspaceId: session.workspaceId,
        name: template.name,
        description: template.description,
        status: WorkflowStatus.DRAFT,
        triggerType: TriggerType.MANUAL,
        isPublished: false,
      },
    });

    const version = await prisma.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        versionNumber: 1,
        description: `Created from template: ${template.name}`,
        definition: template.definition as object,
        isPublished: false,
      },
    });

    await prisma.workflow.update({
      where: { id: workflow.id },
      data: { currentVersionId: version.id },
    });

    return apiSuccess({ workflowId: workflow.id });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[use template] Request failed");
    return apiError("Failed to apply template", 500);
  }
}

