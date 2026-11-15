import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/app/api/_helpers";
import { assertRedisAvailable, getExecutionQueue } from "@/lib/queue/client";
import { ExecutionStatus, TriggerType } from "@prisma/client";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const payload = body.payload ?? {};

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!workflow) return apiError("Workflow not found", 404);
    if (workflow.workspaceId !== session.workspaceId) return apiError("Forbidden", 403);

    // Get current or latest version
    const versionId = workflow.currentVersionId || workflow.versions[0]?.id;
    if (!versionId) {
      return apiError("Workflow has no saved version to execute. Save the workflow first.", 400);
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        workflowVersionId: versionId,
        workspaceId: session.workspaceId,
        triggeredById: session.userId,
        status: ExecutionStatus.QUEUED,
        triggerSource: TriggerType.MANUAL,
        triggerPayload: payload,
      },
    });

    try {
      await assertRedisAvailable();
      const queue = getExecutionQueue();
      await queue.add("execute", { executionId: execution.id }, { attempts: 3 });
    } catch {
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: ExecutionStatus.FAILED, errorMessage: "Redis is unavailable; workflow execution could not be queued." },
      });
      return apiError("Redis is unavailable; workflow execution could not be queued.", 503);
    }

    return NextResponse.json({
      success: true,
      data: {
        executionId: execution.id,
        status: "QUEUED",
        enqueuedViaBullMQ: true,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[workflow execute] Request failed");
    return apiError("Failed to trigger execution", 500);
  }
}

