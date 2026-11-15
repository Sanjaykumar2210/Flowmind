"use client";

import * as React from "react";
import { type NodeProps } from "@xyflow/react";
import { Globe, Send, Mail, Shuffle, Database } from "lucide-react";
import { BaseNode } from "./base-node";

export function ActionNode({ id, type, data, selected }: NodeProps) {
  let icon = Globe;
  let fallbackLabel = "HTTP Request";

  if (type === "action-webhook") {
    icon = Send;
    fallbackLabel = "Send Webhook";
  } else if (type === "action-email") {
    icon = Mail;
    fallbackLabel = "Send Email";
  } else if (type === "action-transform") {
    icon = Shuffle;
    fallbackLabel = "Transform Data";
  } else if (type === "action-database") {
    icon = Database;
    fallbackLabel = "Database Op";
  }

  const label = (data?.label as string) || fallbackLabel;
  const config = (data?.config || {}) as Record<string, unknown>;

  return (
    <BaseNode
      id={id}
      selected={selected}
      title={label}
      subtitle={type?.replace("action-", "").toUpperCase()}
      category="action"
      icon={icon}
      hasInput={true}
      hasOutput={true}
    >
      <div className="flex items-center justify-between text-[11px] text-[#929BAE]">
        <span className="truncate max-w-[140px]">
          {config.method ? String(config.method) : config.url ? String(config.url) : "Action Handler"}
        </span>
        <span className="rounded bg-emerald-500/20 px-1 py-0.5 text-[9px] font-medium text-emerald-300">
          EXEC
        </span>
      </div>
    </BaseNode>
  );
}

