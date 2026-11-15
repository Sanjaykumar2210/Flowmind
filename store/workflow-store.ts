import { create } from "zustand";

export type NodeStatus = "idle" | "running" | "completed" | "failed" | "skipped";

interface WorkflowState {
  workflowId: string | null;
  workflowName: string;
  workflowDescription: string;
  status: string;
  isPublished: boolean;
  selectedNodeId: string | null;
  executionId: string | null;
  isExecuting: boolean;
  nodeStatuses: Record<string, NodeStatus>;
  nodeOutputs: Record<string, unknown>;
  nodeDurations: Record<string, number>;
  executionError: string | null;

  setWorkflow: (data: {
    id: string;
    name: string;
    description?: string;
    status: string;
    isPublished: boolean;
  }) => void;
  setWorkflowName: (name: string) => void;
  setSelectedNodeId: (id: string | null) => void;
  setExecutionId: (id: string | null) => void;
  setIsExecuting: (val: boolean) => void;
  updateNodeStatus: (nodeId: string, status: NodeStatus, output?: unknown, durationMs?: number) => void;
  setExecutionError: (err: string | null) => void;
  resetExecution: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflowId: null,
  workflowName: "Untitled Workflow",
  workflowDescription: "",
  status: "DRAFT",
  isPublished: false,
  selectedNodeId: null,
  executionId: null,
  isExecuting: false,
  nodeStatuses: {},
  nodeOutputs: {},
  nodeDurations: {},
  executionError: null,

  setWorkflow: (data) =>
    set({
      workflowId: data.id,
      workflowName: data.name,
      workflowDescription: data.description || "",
      status: data.status,
      isPublished: data.isPublished,
    }),

  setWorkflowName: (name) => set({ workflowName: name }),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setExecutionId: (id) => set({ executionId: id }),

  setIsExecuting: (val) => set({ isExecuting: val }),

  updateNodeStatus: (nodeId, status, output, durationMs) =>
    set((state) => ({
      nodeStatuses: { ...state.nodeStatuses, [nodeId]: status },
      nodeOutputs: output !== undefined ? { ...state.nodeOutputs, [nodeId]: output } : state.nodeOutputs,
      nodeDurations: durationMs !== undefined ? { ...state.nodeDurations, [nodeId]: durationMs } : state.nodeDurations,
    })),

  setExecutionError: (err) => set({ executionError: err }),

  resetExecution: () =>
    set({
      executionId: null,
      isExecuting: false,
      nodeStatuses: {},
      nodeOutputs: {},
      nodeDurations: {},
      executionError: null,
    }),
}));

