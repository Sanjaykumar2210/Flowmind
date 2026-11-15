import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/app/api/_helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAuth();
    const { workspaceId } = session;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Run all stat queries in parallel
    const [
      totalWorkflows,
      activeWorkflows,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      recentExecutions,
      recentWorkflows,
      executionsByDayRaw,
    ] = await Promise.all([
      prisma.workflow.count({ where: { workspaceId } }),
      prisma.workflow.count({ where: { workspaceId, status: "ACTIVE" } }),
      prisma.workflowExecution.count({ where: { workspaceId } }),
      prisma.workflowExecution.count({ where: { workspaceId, status: "COMPLETED" } }),
      prisma.workflowExecution.count({ where: { workspaceId, status: "FAILED" } }),
      prisma.workflowExecution.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { workflow: { select: { name: true } } },
      }),
      prisma.workflow.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.workflowExecution.findMany({
        where: {
          workspaceId,
          createdAt: { gte: sevenDaysAgo },
          status: { in: ["COMPLETED", "FAILED"] },
        },
        select: { createdAt: true, status: true },
      }),
    ]);

    const successRate = totalExecutions > 0
      ? Math.round((successfulExecutions / totalExecutions) * 100)
      : 0;

    // Group executions by day for last 7 days
    const dayMap: Record<string, { date: string; completed: number; failed: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      dayMap[key] = { date: key, completed: 0, failed: 0 };
    }
    for (const ex of executionsByDayRaw) {
      const key = ex.createdAt.toISOString().split("T")[0];
      if (dayMap[key]) {
        if (ex.status === "COMPLETED") dayMap[key].completed++;
        else if (ex.status === "FAILED") dayMap[key].failed++;
      }
    }
    const executionsByDay = Object.values(dayMap);

    return NextResponse.json(
      {
        success: true,
        data: {
          totalWorkflows,
          activeWorkflows,
          totalExecutions,
          successfulExecutions,
          failedExecutions,
          successRate,
          recentExecutions: recentExecutions.map((e) => ({
            id: e.id,
            status: e.status,
            workflowName: e.workflow.name,
            createdAt: e.createdAt,
            durationMs: e.durationMs,
          })),
          recentWorkflows: recentWorkflows.map((w) => ({
            id: w.id,
            name: w.name,
            status: w.status,
            createdAt: w.createdAt,
            updatedAt: w.updatedAt,
          })),
          executionsByDay,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[dashboard/stats] Request failed");
    return apiError("Internal server error", 500);
  }
}
