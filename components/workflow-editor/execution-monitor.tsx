"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { useWorkflowStore, NodeStatus } from "@/store/workflow-store";
import { Badge } from "@/components/ui/badge";

export function ExecutionMonitor() {
  const executionId = useWorkflowStore((s) => s.executionId);
  const isExecuting = useWorkflowStore((s) => s.isExecuting);
  const setIsExecuting = useWorkflowStore((s) => s.setIsExecuting);
  const updateNodeStatus = useWorkflowStore((s) => s.updateNodeStatus);
  const setExecutionError = useWorkflowStore((s) => s.setExecutionError);
  const executionError = useWorkflowStore((s) => s.executionError);
  const resetExecution = useWorkflowStore((s) => s.resetExecution);

  const [isExpanded, setIsExpanded] = React.useState(true);
  const [executionStatus, setExecutionStatus] = React.useState<string>("IDLE");
  const [eventsLog, setEventsLog] = React.useState<Array<{ time: string; text: string; status?: string }>>([]);

  React.useEffect(() => {
    if (!executionId) {
      setExecutionStatus("IDLE");
      setEventsLog([]);
      return;
    }

    setExecutionStatus("RUNNING");
    setIsExecuting(true);
    setEventsLog([
      { time: new Date().toLocaleTimeString(), text: `Execution ${executionId.slice(0, 8)} started` },
    ]);

    // Connect to SSE stream
    const eventSource = new EventSource(`/api/executions/${executionId}/stream`);
    let isFinished = false;

    const syncExecutionStatus = async () => {
      try {
        const response = await fetch(`/api/executions/${executionId}`, { cache: "no-store" });
        if (!response.ok) return;

        const result = await response.json();
        const execution = result.data?.execution;
        if (!execution) return;

        if (execution.status === "FAILED" && execution.errorMessage) {
          setExecutionError(execution.errorMessage);
        }

        if (["COMPLETED", "FAILED", "CANCELLED"].includes(execution.status)) {
          isFinished = true;
          setExecutionStatus(execution.status);
          setIsExecuting(false);
          eventSource.close();
        }
      } catch {
        // Keep polling; transient request failures should not leave the monitor stale.
      }
    };

    void syncExecutionStatus();
    const statusPoll = window.setInterval(() => {
      if (!isFinished) void syncExecutionStatus();
    }, 1000);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.nodeId) {
          const mappedStatus: NodeStatus =
            data.status === "RUNNING"
              ? "running"
              : data.status === "COMPLETED"
              ? "completed"
              : data.status === "FAILED"
              ? "failed"
              : data.status === "SKIPPED"
              ? "skipped"
              : "idle";

          updateNodeStatus(data.nodeId, mappedStatus, data.outputData, data.durationMs);

          setEventsLog((prev) => [
            ...prev,
            {
              time: new Date().toLocaleTimeString(),
              text: `Node ${data.nodeName || data.nodeId} -> ${data.status}`,
              status: data.status,
            },
          ]);
        }

        if (["COMPLETED", "FAILED", "CANCELLED"].includes(data.status)) {
          isFinished = true;
          setExecutionStatus(data.status);
          setIsExecuting(false);
          if (data.errorMessage) {
            setExecutionError(data.errorMessage);
          }
          eventSource.close();
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      window.clearInterval(statusPoll);
      eventSource.close();
    };
  }, [executionId, setIsExecuting, updateNodeStatus, setExecutionError]);

  if (!executionId) return null;

  return (
    <div className="absolute bottom-4 left-72 right-4 z-40 max-w-xl rounded-xl border border-[#252C3A] bg-[#141925]/95 shadow-2xl backdrop-blur-md text-[#F5F7FA]">
      {/* Bar Header */}
      <div className="flex items-center justify-between p-3 border-b border-[#252C3A]">
        <div className="flex items-center gap-2.5">
          {executionStatus === "RUNNING" && <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />}
          {executionStatus === "COMPLETED" && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          {executionStatus === "FAILED" && <XCircle className="h-4 w-4 text-rose-400" />}
          <span className="text-xs font-semibold text-[#F5F7FA]">Live Execution Monitor</span>
          <Badge
            variant={
              executionStatus === "COMPLETED"
                ? "success"
                : executionStatus === "FAILED"
                ? "destructive"
                : "default"
            }
          >
            {executionStatus}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href={`/executions/${executionId}`}
            className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded hover:bg-[#1E2538] transition-colors"
          >
            <span>Inspect</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded p-1 text-[#929BAE] hover:bg-[#1E2538] hover:text-[#F5F7FA]"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
          <button
            onClick={resetExecution}
            className="rounded p-1 text-[#929BAE] hover:bg-[#1E2538] hover:text-[#F5F7FA]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded Logs */}
      {isExpanded && (
        <div className="p-3 space-y-2 max-h-48 overflow-y-auto font-mono text-[11px]">
          {executionError && (
            <div className="rounded bg-rose-500/10 border border-rose-500/20 p-2 text-rose-300">
              Error: {executionError}
            </div>
          )}
          {eventsLog.map((log, index) => (
            <div key={index} className="flex items-center gap-2 text-[#929BAE]">
              <span className="text-[10px] text-[#929BAE]/60">{log.time}</span>
              <span
                className={
                  log.status === "COMPLETED"
                    ? "text-emerald-400"
                    : log.status === "FAILED"
                    ? "text-rose-400"
                    : log.status === "RUNNING"
                    ? "text-indigo-300"
                    : "text-[#F5F7FA]"
                }
              >
                {log.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

