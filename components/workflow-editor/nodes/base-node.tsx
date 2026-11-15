"use client";

import * as React from "react";
import { Handle, Position } from "@xyflow/react";
import { LucideIcon, CheckCircle2, XCircle, Loader2, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkflowStore, NodeStatus } from "@/store/workflow-store";

export interface BaseNodeProps {
  id: string;
  selected?: boolean;
  title: string;
  subtitle?: string;
  category: "trigger" | "ai" | "logic" | "action" | "utility";
  icon: LucideIcon;
  hasInput?: boolean;
  hasOutput?: boolean;
  customHandles?: React.ReactNode;
  children?: React.ReactNode;
}

const CATEGORY_STYLES = {
  trigger: {
    accent: "border-amber-500/40 text-amber-400 bg-amber-500/10",
    glow: "shadow-amber-500/10",
    badge: "bg-amber-500/20 text-amber-300",
  },
  ai: {
    accent: "border-violet-500/40 text-violet-400 bg-violet-500/10",
    glow: "shadow-violet-500/10",
    badge: "bg-violet-500/20 text-violet-300",
  },
  logic: {
    accent: "border-sky-500/40 text-sky-400 bg-sky-500/10",
    glow: "shadow-sky-500/10",
    badge: "bg-sky-500/20 text-sky-300",
  },
  action: {
    accent: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
    glow: "shadow-emerald-500/10",
    badge: "bg-emerald-500/20 text-emerald-300",
  },
  utility: {
    accent: "border-slate-500/40 text-slate-400 bg-slate-500/10",
    glow: "shadow-slate-500/10",
    badge: "bg-slate-500/20 text-slate-300",
  },
};

export function BaseNode({
  id,
  selected,
  title,
  subtitle,
  category,
  icon: Icon,
  hasInput = true,
  hasOutput = true,
  customHandles,
  children,
}: BaseNodeProps) {
  const status: NodeStatus = useWorkflowStore((s) => s.nodeStatuses[id] || "idle");
  const duration = useWorkflowStore((s) => s.nodeDurations[id]);
  const style = CATEGORY_STYLES[category];

  return (
    <div
      className={cn(
        "group relative min-w-[220px] max-w-[280px] rounded-xl border border-[#252C3A] bg-[#141925] p-3 text-[#F5F7FA] shadow-lg transition-all",
        selected && "ring-2 ring-indigo-500 border-indigo-500/50 shadow-indigo-500/20 shadow-xl",
        status === "running" && "ring-2 ring-indigo-400 animate-pulse",
        status === "completed" && "border-emerald-500/60 ring-1 ring-emerald-500/30",
        status === "failed" && "border-rose-500/60 ring-1 ring-rose-500/30",
        status === "skipped" && "opacity-50"
      )}
    >
      {/* Input Handle (Left) */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !rounded-full !border-2 !border-[#141925] !bg-indigo-400 hover:!scale-125 transition-transform"
        />
      )}

      {/* Node Header */}
      <div className="flex items-center gap-2.5">
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", style.accent)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <h4 className="truncate text-xs font-semibold text-[#F5F7FA]">{title}</h4>
            {/* Status Icon */}
            {status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />}
            {status === "completed" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
            {status === "failed" && <XCircle className="h-3.5 w-3.5 text-rose-400" />}
            {status === "skipped" && <MinusCircle className="h-3.5 w-3.5 text-slate-500" />}
          </div>
          <p className="truncate text-[10px] text-[#929BAE]">{subtitle || category.toUpperCase()}</p>
        </div>
      </div>

      {/* Node Body / Custom Content */}
      {children && <div className="mt-2.5 pt-2 border-t border-[#252C3A]/60 text-xs">{children}</div>}

      {/* Execution Duration Badge */}
      {duration !== undefined && (
        <div className="mt-2 flex items-center justify-end text-[10px] text-emerald-400/80">
          <span>{duration}ms</span>
        </div>
      )}

      {/* Output Handle (Right) */}
      {hasOutput && !customHandles && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !rounded-full !border-2 !border-[#141925] !bg-indigo-400 hover:!scale-125 transition-transform"
        />
      )}

      {/* Custom handles (e.g. condition node with true/false outputs) */}
      {customHandles}
    </div>
  );
}

