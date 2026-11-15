import { ExecutionContext } from "../context";

export interface NodeHandlerInput {
  nodeId: string;
  nodeType: string;
  config: Record<string, unknown>;
  context: ExecutionContext;
  workspaceId: string;
  incomingEdgeHandle?: string | null;
}

export interface NodeHandlerOutput {
  success: boolean;
  output: unknown;
  selectedBranch?: string; // For condition ("true" / "false") or switch cases
  error?: string;
  logs?: string[];
}

export type NodeHandler = (input: NodeHandlerInput) => Promise<NodeHandlerOutput>;

