import * as React from "react";
import Link from "next/link";
import {
  GitFork,
  Activity,
  CheckCircle2,
  XCircle,
  Percent,
  Plus,
  Play,
  ArrowRight,
  Sparkles,
  Layers,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActivityChart } from "@/components/dashboard/activity-chart";
import { formatDuration, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireAuth();
  const { workspaceId } = session;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Parallel database queries
  const [
    totalWorkflows,
    activeWorkflows,
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    recentExecutions,
    recentWorkflows,
    starterTemplates,
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
      include: { workflow: { select: { id: true, name: true } } },
    }),
    prisma.workflow.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.workflowTemplate.findMany({
      take: 3,
      orderBy: { createdAt: "asc" },
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
    : 100;

  // Build 7-day activity data
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
  const activityData = Object.values(dayMap);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F5F7FA]">
            Automation Overview
          </h1>
          <p className="text-xs text-[#929BAE] mt-0.5">
            Monitor workflow executions, AI operations, and automation health.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" asChild>
            <Link href="/templates" className="gap-1.5 text-xs">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              Browse Templates
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/workflows/new" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              New Workflow
            </Link>
          </Button>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Workflows"
          value={totalWorkflows}
          description={`${activeWorkflows} active and published`}
          icon={GitFork}
          accentColor="indigo"
        />
        <StatsCard
          title="Total Executions"
          value={totalExecutions}
          description="Lifetime workflow runs"
          icon={Activity}
          accentColor="indigo"
        />
        <StatsCard
          title="Success Rate"
          value={`${successRate}%`}
          description={`${successfulExecutions} succeeded / ${failedExecutions} failed`}
          icon={Percent}
          accentColor="emerald"
        />
        <StatsCard
          title="Failed Executions"
          value={failedExecutions}
          description="Runs requiring attention"
          icon={XCircle}
          accentColor={failedExecutions > 0 ? "rose" : "emerald"}
        />
      </div>

      {/* Execution Activity Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base font-semibold">Execution Activity</CardTitle>
            <p className="text-xs text-[#929BAE] mt-0.5">
              Completed vs failed runs across the last 7 days
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#929BAE]">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span>Failed</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ActivityChart data={activityData} />
        </CardContent>
      </Card>

      {/* Recent Executions & Workflows Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Executions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Recent Executions</CardTitle>
            <Link
              href="/executions"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentExecutions.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#929BAE]">
                No executions recorded yet. Run a workflow to see real execution logs.
              </div>
            ) : (
              <div className="divide-y divide-[#252C3A]/60">
                {recentExecutions.map((ex) => (
                  <Link
                    key={ex.id}
                    href={`/executions/${ex.id}`}
                    className="flex items-center justify-between p-3.5 hover:bg-[#1E2538]/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-medium text-[#F5F7FA]">
                          {ex.workflow.name}
                        </span>
                        <Badge
                          variant={
                            ex.status === "COMPLETED"
                              ? "success"
                              : ex.status === "FAILED"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {ex.status}
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-[10px] text-[#929BAE]">
                        {formatDate(ex.createdAt)}
                      </div>
                    </div>
                    <div className="text-right text-xs text-[#929BAE] shrink-0 font-mono">
                      {formatDuration(ex.durationMs)}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Workflows */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold">Active Workflows</CardTitle>
            <Link
              href="/workflows"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentWorkflows.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#929BAE]">
                No workflows created yet. Create one or select a template below.
              </div>
            ) : (
              <div className="divide-y divide-[#252C3A]/60">
                {recentWorkflows.map((wf) => (
                  <div
                    key={wf.id}
                    className="flex items-center justify-between p-3.5 hover:bg-[#1E2538]/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/workflows/${wf.id}/edit`}
                          className="truncate text-xs font-medium text-[#F5F7FA] hover:text-indigo-300 transition-colors"
                        >
                          {wf.name}
                        </Link>
                        <Badge
                          variant={
                            wf.isPublished
                              ? "success"
                              : wf.status === "ACTIVE"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {wf.isPublished ? "PUBLISHED" : wf.status}
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-[10px] text-[#929BAE] truncate max-w-sm">
                        {wf.description || "No description"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/workflows/${wf.id}/edit`} className="text-xs">
                          Edit
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick-Start Templates Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-[#F5F7FA]">
              Quick-Start Automation Templates
            </h2>
          </div>
          <Link
            href="/templates"
            className="text-xs text-indigo-400 hover:text-indigo-300"
          >
            Explore all 8 templates →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {starterTemplates.map((tpl) => (
            <Card
              key={tpl.id}
              className="hover:border-indigo-500/50 hover:bg-[#1A2130]/80 transition-all group flex flex-col justify-between"
            >
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge variant="default" className="text-[10px]">
                    {tpl.category}
                  </Badge>
                  <span className="text-[10px] text-[#929BAE] font-medium">
                    {tpl.difficulty}
                  </span>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[#F5F7FA] group-hover:text-indigo-300 transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-[11px] text-[#929BAE] mt-1 line-clamp-2">
                    {tpl.description}
                  </p>
                </div>
              </CardContent>
              <div className="p-4 pt-0">
                <Button variant="secondary" size="sm" asChild className="w-full text-xs">
                  <Link href={`/templates`}>
                    Use Template
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

