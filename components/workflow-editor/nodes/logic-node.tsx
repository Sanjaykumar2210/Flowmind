"use client";

import * as React from "react";
import { type NodeProps, Handle, Position } from "@xyflow/react";
import { GitBranch, ToggleLeft, Filter, GitMerge, Repeat } from "lucide-react";
import { BaseNode } from "./base-node";

export function LogicNode({ id, type, data, selected }: NodeProps) {
  const isCondition = type === "logic-condition";
  const isSwitch = type === "logic-switch";
  const isFilter = type === "logic-filter";
  const isMerge = type === "logic-merge";
  const isLoop = type === "logic-loop";

  let icon = GitBranch;
  let fallbackLabel = "Condition";

  if (isSwitch) {
    icon = ToggleLeft;
    fallbackLabel = "Switch Branch";
  } else if (isFilter) {
    icon = Filter;
    fallbackLabel = "Filter Items";
  } else if (isMerge) {
    icon = GitMerge;
    fallbackLabel = "Merge Branches";
  } else if (isLoop) {
    icon = Repeat;
    fallbackLabel = "Loop Iterator";
  }

  const label = (data?.label as string) || fallbackLabel;
  const config = (data?.config || {}) as Record<string, unknown>;

  // Condition node has dual outputs: "true" and "false"
  const conditionHandles = isCondition ? (
    <>
      <div className="absolute -right-3 top-4 flex items-center">
        <span className="mr-1.5 text-[9px] font-bold text-emerald-400">TRUE</span>
        <Handle
          id="true"
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !rounded-full !border-2 !border-[#141925] !bg-emerald-400 hover:!scale-125 transition-transform"
        />
      </div>
      <div className="absolute -right-3 bottom-4 flex items-center">
        <span className="mr-1.5 text-[9px] font-bold text-rose-400">FALSE</span>
        <Handle
          id="false"
          type="source"
          position={Position.Right}
          className="!h-3 !w-3 !rounded-full !border-2 !border-[#141925] !bg-rose-400 hover:!scale-125 transition-transform"
        />
      </div>
    </>
  ) : undefined;

  return (
    <BaseNode
      id={id}
      selected={selected}
      title={label}
      subtitle={type?.replace("logic-", "").toUpperCase()}
      category="logic"
      icon={icon}
      hasInput={true}
      hasOutput={!isCondition}
      customHandles={conditionHandles}
    >
      {isCondition && (
        <div className="text-[11px] text-[#929BAE] truncate">
          {config.operator ? `Op: ${String(config.operator)}` : "Evaluates If / Else"}
        </div>
      )}
      {isLoop && (
        <div className="text-[11px] text-[#929BAE] truncate">
          Max: {String(config.maxIterations || 50)} items
        </div>
      )}
    </BaseNode>
  );
}

