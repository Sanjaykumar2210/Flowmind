import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError, apiSuccess } from "@/app/api/_helpers";
import { ExecutionStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const workflowId = searchParams.get("workflowId");
    const status = searchParams.get("status") as ExecutionStatus | null;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {
      workspaceId: session.workspaceId,
    };

    if (workflowId) {
      whereClause.workflowId = workflowId;
    }

    if (status && Object.values(ExecutionStatus).includes(status)) {
      whereClause.status = status;
    }

    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where: whereClause,
        include: {
          workflow: {
            select: { id: true, name: true },
          },
          nodeExecutions: {
            select: { id: true, nodeId: true, nodeName: true, status: true, durationMs: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.workflowExecution.count({ where: whereClause }),
    ]);

    return apiSuccess({
      executions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[executions list] Request failed");
    return apiError("Failed to fetch executions", 500);
  }
}

