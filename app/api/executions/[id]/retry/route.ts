import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/app/api/_helpers";
import { assertRedisAvailable, getExecutionQueue } from "@/lib/queue/client";
import { ExecutionStatus } from "@prisma/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const original = await prisma.workflowExecution.findUnique({
      where: { id },
    });

    if (!original) return apiError("Execution not found", 404);
    if (original.workspaceId !== session.workspaceId) return apiError("Forbidden", 403);

    // Create a new execution retry record
    const retryExecution = await prisma.workflowExecution.create({
      data: {
        workflowId: original.workflowId,
        workflowVersionId: original.workflowVersionId,
        workspaceId: session.workspaceId,
        triggeredById: session.userId,
        status: ExecutionStatus.QUEUED,
        triggerSource: original.triggerSource,
        triggerPayload: original.triggerPayload ?? {},
        retryCount: original.retryCount + 1,
      },
    });

    try {
      await assertRedisAvailable();
      const queue = getExecutionQueue();
      await queue.add("execute", { executionId: retryExecution.id });
    } catch {
      await prisma.workflowExecution.update({
        where: { id: retryExecution.id },
        data: { status: ExecutionStatus.FAILED, errorMessage: "Redis is unavailable; workflow execution could not be queued." },
      });
      return apiError("Redis is unavailable; workflow execution could not be queued.", 503);
    }

    return apiSuccess({ executionId: retryExecution.id, status: "QUEUED" });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[execution retry] Request failed");
    return apiError("Failed to retry execution", 500);
  }
}

