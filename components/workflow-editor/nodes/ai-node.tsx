"use client";

import * as React from "react";
import { type NodeProps } from "@xyflow/react";
import { Sparkles, Tags, FileText, Database } from "lucide-react";
import { BaseNode } from "./base-node";

export function AiNode({ id, type, data, selected }: NodeProps) {
  let icon = Sparkles;
  let fallbackLabel = "AI Generate";

  if (type === "ai-classify") {
    icon = Tags;
    fallbackLabel = "AI Classification";
  } else if (type === "ai-summarize") {
    icon = FileText;
    fallbackLabel = "AI Summarizer";
  } else if (type === "ai-extract") {
    icon = Database;
    fallbackLabel = "AI Data Extraction";
  }

  const label = (data?.label as string) || fallbackLabel;
  return (
    <BaseNode
      id={id}
      selected={selected}
      title={label}
      subtitle={type?.replace("ai-", "").toUpperCase()}
      category="ai"
      icon={icon}
      hasInput={true}
      hasOutput={true}
    >
      <div className="flex items-center justify-between text-[11px] text-[#929BAE]">
        <span className="truncate max-w-[140px]">Model configured in Integrations</span>
        <span className="rounded bg-violet-500/20 px-1 py-0.5 text-[9px] font-medium text-violet-300">
          AI
        </span>
      </div>
    </BaseNode>
  );
}

