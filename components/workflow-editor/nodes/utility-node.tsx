"use client";

import * as React from "react";
import { type NodeProps } from "@xyflow/react";
import { Variable, Braces, Timer, Calendar, Type } from "lucide-react";
import { BaseNode } from "./base-node";

export function UtilityNode({ id, type, data, selected }: NodeProps) {
  let icon = Variable;
  let fallbackLabel = "Set Variables";

  if (type === "utility-json") {
    icon = Braces;
    fallbackLabel = "JSON Parser";
  } else if (type === "utility-delay") {
    icon = Timer;
    fallbackLabel = "Delay Timer";
  } else if (type === "utility-date") {
    icon = Calendar;
    fallbackLabel = "Format Date";
  } else if (type === "utility-text") {
    icon = Type;
    fallbackLabel = "Text Process";
  }

  const label = (data?.label as string) || fallbackLabel;

  return (
    <BaseNode
      id={id}
      selected={selected}
      title={label}
      subtitle={type?.replace("utility-", "").toUpperCase()}
      category="utility"
      icon={icon}
      hasInput={true}
      hasOutput={true}
    />
  );
}

