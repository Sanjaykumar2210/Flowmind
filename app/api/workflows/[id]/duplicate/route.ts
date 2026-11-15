import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/app/api/_helpers";
import { WorkflowStatus } from "@prisma/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const original = await prisma.workflow.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!original) return apiError("Workflow not found", 404);
    if (original.workspaceId !== session.workspaceId) return apiError("Forbidden", 403);

    const duplicated = await prisma.workflow.create({
      data: {
        workspaceId: session.workspaceId,
        name: `${original.name} (Copy)`,
        description: original.description,
        status: WorkflowStatus.DRAFT,
        triggerType: original.triggerType,
        isPublished: false,
      },
    });

    if (original.versions.length > 0) {
      const v = original.versions[0];
      const newVersion = await prisma.workflowVersion.create({
        data: {
          workflowId: duplicated.id,
          versionNumber: 1,
          description: "Duplicated from " + original.name,
          definition: v.definition as object,
          isPublished: false,
        },
      });

      await prisma.workflow.update({
        where: { id: duplicated.id },
        data: { currentVersionId: newVersion.id },
      });
    }

    return apiSuccess({ workflow: duplicated });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[workflow duplicate] Request failed");
    return apiError("Failed to duplicate workflow", 500);
  }
}

