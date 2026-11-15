import * as React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  RotateCcw,
  AlertCircle,
  Terminal,
  FileCode,
  Layers,
} from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDate, formatDuration } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExecutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const { id } = await params;

  const execution = await prisma.workflowExecution.findUnique({
    where: { id },
    include: {
      workflow: { select: { id: true, name: true, description: true } },
      workflowVersion: { select: { id: true, versionNumber: true } },
      nodeExecutions: { orderBy: { startedAt: "asc" } },
      logs: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!execution) notFound();
  if (execution.workspaceId !== session.workspaceId) redirect("/executions");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/executions"
            className="rounded-lg p-1.5 text-[#929BAE] hover:bg-[#1E2538] hover:text-[#F5F7FA] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-[#F5F7FA]">
                Execution: {execution.workflow.name}
              </h1>
              <Badge
                variant={
                  execution.status === "COMPLETED"
                    ? "success"
                    : execution.status === "FAILED"
                    ? "destructive"
                    : execution.status === "RUNNING"
                    ? "default"
                    : "secondary"
                }
              >
                {execution.status}
              </Badge>
            </div>
            <p className="text-xs font-mono text-[#929BAE] mt-0.5">
              ID: {execution.id} • Trigger: {execution.triggerSource}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/workflows/${execution.workflowId}/edit`} className="text-xs gap-1">
              <Layers className="h-3 w-3" />
              Open Workflow Canvas
            </Link>
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-[11px] text-[#929BAE]">Started At</span>
          <div className="text-sm font-semibold text-[#F5F7FA] mt-1">
            {formatDate(execution.startedAt || execution.createdAt)}
          </div>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] text-[#929BAE]">Completed At</span>
          <div className="text-sm font-semibold text-[#F5F7FA] mt-1">
            {execution.completedAt ? formatDate(execution.completedAt) : "In Progress"}
          </div>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] text-[#929BAE]">Total Duration</span>
          <div className="text-sm font-semibold font-mono text-[#F5F7FA] mt-1">
            {formatDuration(execution.durationMs)}
          </div>
        </Card>
        <Card className="p-4">
          <span className="text-[11px] text-[#929BAE]">Nodes Processed</span>
          <div className="text-sm font-semibold text-[#F5F7FA] mt-1">
            {execution.nodeExecutions.length} nodes
          </div>
        </Card>
      </div>

      {/* Error Banner if Failed */}
      {execution.errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-sm text-rose-200">
            <AlertCircle className="h-4 w-4" />
            Execution Failure Reason
          </div>
          <p className="text-xs font-mono">{execution.errorMessage}</p>
        </div>
      )}

      {/* Node Executions Timeline */}
      <Card>
        <CardHeader className="pb-3 border-b border-[#252C3A]">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileCode className="h-4 w-4 text-indigo-400" />
            Node-by-Node Execution Steps
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-[#252C3A]/60">
          {execution.nodeExecutions.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#929BAE]">
              No nodes were executed.
            </div>
          ) : (
            execution.nodeExecutions.map((ne, idx) => (
              <div key={ne.id} className="p-4 space-y-3 hover:bg-[#1E2538]/30 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1A2130] text-[10px] font-bold text-[#929BAE]">
                      {idx + 1}
                    </span>
                    {ne.status === "COMPLETED" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    {ne.status === "FAILED" && <XCircle className="h-4 w-4 text-rose-400" />}
                    {ne.status === "RUNNING" && <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />}
                    <div>
                      <div className="text-xs font-semibold text-[#F5F7FA]">{ne.nodeName}</div>
                      <div className="text-[10px] font-mono text-[#929BAE]">
                        Type: {ne.nodeType} (ID: {ne.nodeId})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-[#929BAE]">
                      {formatDuration(ne.durationMs)}
                    </span>
                    <Badge
                      variant={
                        ne.status === "COMPLETED"
                          ? "success"
                          : ne.status === "FAILED"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {ne.status}
                    </Badge>
                  </div>
                </div>

                {/* Node Error if present */}
                {ne.errorMessage && (
                  <div className="rounded bg-rose-500/10 border border-rose-500/20 p-2 text-xs font-mono text-rose-300">
                    Error: {ne.errorMessage}
                  </div>
                )}

                {/* Node Output Preview */}
                {ne.outputData !== null && ne.outputData !== undefined && (
                  <div className="rounded-lg border border-[#252C3A] bg-[#090B12] p-2.5 space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#929BAE]">
                      Output Data
                    </span>
                    <pre className="max-h-36 overflow-auto text-[11px] font-mono text-emerald-300">
                      {JSON.stringify(ne.outputData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Structured Execution Logs */}
      <Card>
        <CardHeader className="pb-3 border-b border-[#252C3A]">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Terminal className="h-4 w-4 text-indigo-400" />
            Execution Logs ({execution.logs.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {execution.logs.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#929BAE]">No logs recorded.</div>
          ) : (
            <div className="p-4 space-y-1 font-mono text-xs max-h-80 overflow-y-auto bg-[#090B12]/80 rounded-b-xl">
              {execution.logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 py-0.5">
                  <span className="text-[10px] text-[#929BAE]/60 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1 rounded shrink-0 ${
                      log.level === "ERROR"
                        ? "bg-rose-500/20 text-rose-400"
                        : log.level === "WARN"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-indigo-500/20 text-indigo-300"
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-[#F5F7FA] break-all">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

