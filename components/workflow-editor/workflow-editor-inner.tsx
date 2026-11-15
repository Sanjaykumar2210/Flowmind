"use client";

import * as React from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TriggerNode } from "./nodes/trigger-node";
import { AiNode } from "./nodes/ai-node";
import { LogicNode } from "./nodes/logic-node";
import { ActionNode } from "./nodes/action-node";
import { UtilityNode } from "./nodes/utility-node";
import { NodePanel } from "./node-panel";
import { ConfigPanel } from "./config-panel";
import { TopToolbar } from "./top-toolbar";
import { RunModal } from "./run-modal";
import { ExecutionMonitor } from "./execution-monitor";
import { useWorkflowStore } from "@/store/workflow-store";

// Map custom nodes to registered components
const NODE_TYPES: NodeTypes = {
  "trigger-manual": TriggerNode,
  "trigger-webhook": TriggerNode,
  "trigger-schedule": TriggerNode,
  "ai-generate": AiNode,
  "ai-classify": AiNode,
  "ai-summarize": AiNode,
  "ai-extract": AiNode,
  "logic-condition": LogicNode,
  "logic-switch": LogicNode,
  "logic-filter": LogicNode,
  "logic-merge": LogicNode,
  "logic-loop": LogicNode,
  "action-http": ActionNode,
  "action-webhook": ActionNode,
  "action-email": ActionNode,
  "action-transform": ActionNode,
  "action-database": ActionNode,
  "utility-variables": UtilityNode,
  "utility-json": UtilityNode,
  "utility-delay": UtilityNode,
  "utility-date": UtilityNode,
  "utility-text": UtilityNode,
};

interface WorkflowEditorInnerProps {
  initialWorkflow: {
    id: string;
    name: string;
    description?: string;
    status: string;
    isPublished: boolean;
    definition?: {
      nodes: Node[];
      edges: Edge[];
      viewport?: { x: number; y: number; zoom: number };
    };
  };
}

export function WorkflowEditorInner({ initialWorkflow }: WorkflowEditorInnerProps) {
  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();

  const setWorkflow = useWorkflowStore((s) => s.setWorkflow);
  const workflowName = useWorkflowStore((s) => s.workflowName);
  const setExecutionId = useWorkflowStore((s) => s.setExecutionId);
  const setIsExecuting = useWorkflowStore((s) => s.setIsExecuting);
  const isExecuting = useWorkflowStore((s) => s.isExecuting);

  const initialNodes = initialWorkflow.definition?.nodes || [];
  const initialEdges = initialWorkflow.definition?.edges || [];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [isRunModalOpen, setIsRunModalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isPublishing, setIsPublishing] = React.useState(false);

  // Initialize store with workflow metadata
  React.useEffect(() => {
    setWorkflow({
      id: initialWorkflow.id,
      name: initialWorkflow.name,
      description: initialWorkflow.description,
      status: initialWorkflow.status,
      isPublished: initialWorkflow.isPublished,
    });
  }, [initialWorkflow, setWorkflow]);

  // Connect handler
  const onConnect = React.useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
  );

  // Drag over handler for canvas
  const onDragOver = React.useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Drop handler to add node onto canvas
  const onDrop = React.useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowData = event.dataTransfer.getData("application/reactflow");
      if (!reactFlowData) return;

      try {
        const { type, label } = JSON.parse(reactFlowData);
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNode: Node = {
          id: `node-${Date.now()}`,
          type,
          position,
          data: {
            label,
            config: {},
          },
        };

        setNodes((nds) => nds.concat(newNode));
        setSelectedNodeId(newNode.id);
      } catch (err) {
        console.error("Drop error:", err);
      }
    },
    [screenToFlowPosition, setNodes]
  );

  // Selection handlers
  const onNodeClick = React.useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = React.useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // Node data updater from config panel
  const handleUpdateNodeData = React.useCallback(
    (nodeId: string, updatedData: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...updatedData } } : n))
      );
    },
    [setNodes]
  );

  // Delete node handler
  const handleDeleteNode = React.useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId(null);
    },
    [setNodes, setEdges]
  );

  // Save workflow definition to backend
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const definition = {
        nodes,
        edges,
      };

      const res = await fetch(`/api/workflows/${initialWorkflow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflowName,
          definition,
        }),
      });

      if (!res.ok) throw new Error("Failed to save workflow");
    } catch (err) {
      console.error("Save error:", err);
      alert("Error saving workflow");
    } finally {
      setIsSaving(false);
    }
  };

  // Publish workflow
  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await handleSave();
      const res = await fetch(`/api/workflows/${initialWorkflow.id}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to publish workflow");
      const json = await res.json();
      setWorkflow({
        id: initialWorkflow.id,
        name: workflowName,
        status: "ACTIVE",
        isPublished: true,
      });
      alert("Workflow published successfully!");
    } catch (err) {
      console.error("Publish error:", err);
      alert("Error publishing workflow");
    } finally {
      setIsPublishing(false);
    }
  };

  // Execute workflow
  const handleExecute = async (payload: Record<string, unknown>) => {
    setIsExecuting(true);
    try {
      // First save current draft so backend executes latest graph
      await handleSave();

      const res = await fetch(`/api/workflows/${initialWorkflow.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || "Execution trigger failed");
      }

      const json = await res.json();
      const execId = json.data?.executionId;
      if (execId) {
        setExecutionId(execId);
      }
    } catch (err: unknown) {
      console.error("Execute error:", err);
      alert(err instanceof Error ? err.message : "Failed to execute workflow");
      setIsExecuting(false);
    }
  };

  const selectedNode = React.useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  // Find trigger default payload for run modal
  const triggerNode = nodes.find((n) => n.type?.startsWith("trigger-"));
  const defaultPayload = (triggerNode?.data?.config as Record<string, unknown>)?.defaultPayload as
    | Record<string, unknown>
    | string;

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[#090B12]">
      {/* Top Toolbar */}
      <TopToolbar
        onSave={handleSave}
        onPublish={handlePublish}
        onOpenRunModal={() => setIsRunModalOpen(true)}
        onZoomIn={() => zoomIn()}
        onZoomOut={() => zoomOut()}
        onFitView={() => fitView()}
        isSaving={isSaving}
        isPublishing={isPublishing}
      />

      {/* Main Workspace Area */}
      <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
        {/* Left: Node Palette */}
        <NodePanel />

        {/* Center: React Flow Canvas */}
        <div className="relative h-full min-h-0 min-w-0 flex-1" onDrop={onDrop} onDragOver={onDragOver}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={NODE_TYPES}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode={["Backspace", "Delete"]}
            className="bg-[#090B12]"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              color="#252C3A"
            />
            <Controls className="!bg-[#141925] !border-[#252C3A]" />
            <MiniMap
              nodeColor="#6366F1"
              maskColor="rgba(9, 11, 18, 0.7)"
              className="!bg-[#0E111B] !border-[#252C3A]"
            />
          </ReactFlow>

          {/* Live Execution Monitor Bar */}
          <ExecutionMonitor />
        </div>

        {/* Right: Node Config Panel */}
        {selectedNode && (
          <ConfigPanel
            selectedNode={selectedNode}
            onUpdateNodeData={handleUpdateNodeData}
            onDeleteNode={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>

      {/* Run Execution Modal */}
      <RunModal
        isOpen={isRunModalOpen}
        onClose={() => setIsRunModalOpen(false)}
        onExecute={handleExecute}
        defaultPayload={defaultPayload}
        isExecuting={isExecuting}
      />
    </div>
  );
}

