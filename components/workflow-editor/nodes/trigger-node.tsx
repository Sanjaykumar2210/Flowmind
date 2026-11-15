"use client";

import * as React from "react";
import { type NodeProps } from "@xyflow/react";
import { Play, Webhook, Clock } from "lucide-react";
import { BaseNode } from "./base-node";

export function TriggerNode({ id, type, data, selected }: NodeProps) {
  const isWebhook = type === "trigger-webhook";
  const isSchedule = type === "trigger-schedule";

  const icon = isWebhook ? Webhook : isSchedule ? Clock : Play;
  const label = (data?.label as string) || (isWebhook ? "Webhook Trigger" : isSchedule ? "Scheduled Trigger" : "Manual Trigger");
  const subtitle = (data?.description as string) || (isWebhook ? "HTTP Webhook" : isSchedule ? "Cron Schedule" : "Manual Start");

  return (
    <BaseNode
      id={id}
      selected={selected}
      title={label}
      subtitle={subtitle}
      category="trigger"
      icon={icon}
      hasInput={false}
      hasOutput={true}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-[#929BAE]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span>Workflow Entrypoint</span>
      </div>
    </BaseNode>
  );
}

