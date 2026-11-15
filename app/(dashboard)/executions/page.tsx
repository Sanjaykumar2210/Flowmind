import * as React from "react";
import Link from "next/link";
import { Activity, CheckCircle2, XCircle, Loader2, Clock, Filter, ArrowRight } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDuration } from "@/lib/utils";
import { ExecutionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ExecutionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; workflowId?: string }>;
}) {
  const session = await requireAuth();
  const { workspaceId } = session;
  const { status, workflowId } = await searchParams;

  const whereClause: Record<string, unknown> = { workspaceId };
  if (status && Object.values(ExecutionStatus).includes(status as ExecutionStatus)) {
    whereClause.status = status;
  }
  if (workflowId) {
    whereClause.workflowId = workflowId;
  }

  const executions = await prisma.workflowExecution.findMany({
    where: whereClause,
    include: {
      workflow: { select: { id: true, name: true } },
      nodeExecutions: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F5F7FA]">Execution History</h1>
          <p className="text-xs text-[#929BAE] mt-0.5">
            Audit logs, timing, outputs, and status for all workflow executions.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#252C3A] pb-3 text-xs">
        <Link
          href="/executions"
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            !status ? "bg-indigo-600/20 text-indigo-400 font-semibold" : "text-[#929BAE] hover:text-[#F5F7FA]"
          }`}
        >
          All Runs
        </Link>
        <Link
          href="/executions?status=COMPLETED"
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            status === "COMPLETED" ? "bg-indigo-600/20 text-indigo-400 font-semibold" : "text-[#929BAE] hover:text-[#F5F7FA]"
          }`}
        >
          Completed
        </Link>
        <Link
          href="/executions?status=FAILED"
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            status === "FAILED" ? "bg-indigo-600/20 text-indigo-400 font-semibold" : "text-[#929BAE] hover:text-[#F5F7FA]"
          }`}
        >
          Failed
        </Link>
        <Link
          href="/executions?status=RUNNING"
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            status === "RUNNING" ? "bg-indigo-600/20 text-indigo-400 font-semibold" : "text-[#929BAE] hover:text-[#F5F7FA]"
          }`}
        >
          Running
        </Link>
      </div>

      {/* Executions Table */}
      {executions.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No executions found"
          description="Workflows that are triggered manually, via webhook, or on schedule will appear here."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#252C3A] bg-[#0E111B]/60 text-[#929BAE]">
                    <th className="py-3 px-4 font-semibold">Workflow</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Trigger</th>
                    <th className="py-3 px-4 font-semibold">Nodes Executed</th>
                    <th className="py-3 px-4 font-semibold">Duration</th>
                    <th className="py-3 px-4 font-semibold">Started At</th>
                    <th className="py-3 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#252C3A]/60">
                  {executions.map((ex) => (
                    <tr key={ex.id} className="hover:bg-[#1E2538]/40 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[#F5F7FA]">
                        <Link
                          href={`/executions/${ex.id}`}
                          className="hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                        >
                          {ex.workflow.name}
                        </Link>
                        <span className="text-[10px] font-mono text-[#929BAE] block">
                          ID: {ex.id.slice(0, 8)}...
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            ex.status === "COMPLETED"
                              ? "success"
                              : ex.status === "FAILED"
                              ? "destructive"
                              : ex.status === "RUNNING"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {ex.status}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-[#929BAE] font-medium uppercase text-[10px]">
                        {ex.triggerSource}
                      </td>

                      <td className="py-3.5 px-4 text-[#F5F7FA]">
                        {ex.nodeExecutions.length} nodes
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#929BAE]">
                        {formatDuration(ex.durationMs)}
                      </td>

                      <td className="py-3.5 px-4 text-[#929BAE]">
                        {formatDate(ex.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                          <Link href={`/executions/${ex.id}`} className="gap-1">
                            <span>Inspect</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

