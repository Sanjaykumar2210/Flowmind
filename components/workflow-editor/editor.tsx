"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ReactFlowProvider } from "@xyflow/react";
import { LoadingSpinner } from "@/components/ui/loading";

const DynamicInnerEditor = dynamic(
  () => import("./workflow-editor-inner").then((mod) => mod.WorkflowEditorInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-0 w-full min-w-0 items-center justify-center bg-[#090B12]">
        <LoadingSpinner text="Loading Flowmind Visual Canvas..." />
      </div>
    ),
  }
);

interface WorkflowEditorProps {
  initialWorkflow: {
    id: string;
    name: string;
    description?: string;
    status: string;
    isPublished: boolean;
    definition?: {
      nodes: any[];
      edges: any[];
      viewport?: { x: number; y: number; zoom: number };
    };
  };
}

export function WorkflowEditor({ initialWorkflow }: WorkflowEditorProps) {
  return (
    <ReactFlowProvider>
      <DynamicInnerEditor initialWorkflow={initialWorkflow} />
    </ReactFlowProvider>
  );
}

