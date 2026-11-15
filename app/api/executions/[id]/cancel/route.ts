import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/app/api/_helpers";
import { ExecutionStatus } from "@prisma/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const execution = await prisma.workflowExecution.findUnique({
      where: { id },
    });

    if (!execution) return apiError("Execution not found", 404);
    if (execution.workspaceId !== session.workspaceId) return apiError("Forbidden", 403);

    if (execution.status !== ExecutionStatus.QUEUED && execution.status !== ExecutionStatus.RUNNING) {
      return apiError(`Cannot cancel execution with status ${execution.status}`, 400);
    }

    const updated = await prisma.workflowExecution.update({
      where: { id },
      data: {
        status: ExecutionStatus.CANCELLED,
        completedAt: new Date(),
        errorMessage: "Cancelled by user",
      },
    });

    return apiSuccess({ execution: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[execution cancel] Request failed");
    return apiError("Failed to cancel execution", 500);
  }
}

