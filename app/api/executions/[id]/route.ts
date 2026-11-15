import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/app/api/_helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const execution = await prisma.workflowExecution.findUnique({
      where: { id },
      include: {
        workflow: {
          select: { id: true, name: true, description: true },
        },
        workflowVersion: {
          select: { id: true, versionNumber: true, definition: true },
        },
        nodeExecutions: {
          orderBy: { startedAt: "asc" },
        },
        logs: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!execution) return apiError("Execution not found", 404);
    if (execution.workspaceId !== session.workspaceId) return apiError("Forbidden", 403);

    return apiSuccess({ execution });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[execution detail] Request failed");
    return apiError("Failed to fetch execution", 500);
  }
}

