export interface WorkflowNode {
  id: string;
  type: string;
  data?: {
    label?: string;
    description?: string;
    config?: Record<string, unknown>;
    [key: string]: unknown;
  };
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: { x: number; y: number; zoom: number };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  triggerNodeId?: string;
  executionOrder?: string[];
}

/**
 * Validates a workflow definition:
 * - Checks for at least one trigger node
 * - Detects cycles using Kahn's algorithm
 * - Detects unreachable / orphan nodes
 * - Computes topological sort execution order
 */
export function validateWorkflowGraph(definition: WorkflowDefinition): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodes = definition.nodes || [];
  const edges = definition.edges || [];

  if (nodes.length === 0) {
    return {
      isValid: false,
      errors: ["Workflow does not contain any nodes."],
      warnings: [],
    };
  }

  // 1. Identify trigger nodes
  const triggerNodes = nodes.filter((n) => n.type && n.type.startsWith("trigger-"));
  if (triggerNodes.length === 0) {
    errors.push("Workflow must contain at least one Trigger node (e.g., Manual Trigger, Webhook, Schedule).");
  }

  const triggerNodeId = triggerNodes[0]?.id;

  // 2. Build adjacency list and in-degree map
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};
  const nodeMap = new Map<string, WorkflowNode>();

  for (const node of nodes) {
    inDegree[node.id] = 0;
    adjList[node.id] = [];
    nodeMap.set(node.id, node);
  }

  for (const edge of edges) {
    if (!nodeMap.has(edge.source)) {
      errors.push(`Edge connects from unknown node ID: "${edge.source}"`);
      continue;
    }
    if (!nodeMap.has(edge.target)) {
      errors.push(`Edge connects to unknown node ID: "${edge.target}"`);
      continue;
    }

    adjList[edge.source].push(edge.target);
    inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
  }

  // 3. Cycle detection using Kahn's algorithm (Topological sort)
  const queue: string[] = [];
  const sortedOrder: string[] = [];
  const inDegreeCopy = { ...inDegree };

  for (const nodeId of Object.keys(inDegreeCopy)) {
    if (inDegreeCopy[nodeId] === 0) {
      queue.push(nodeId);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    sortedOrder.push(current);

    for (const neighbor of adjList[current] || []) {
      inDegreeCopy[neighbor]--;
      if (inDegreeCopy[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (sortedOrder.length !== nodes.length) {
    errors.push("Workflow graph contains an invalid circular dependency (cycle detected). Workflows must be a Directed Acyclic Graph (DAG).");
  }

  // 4. Check for orphan non-trigger nodes (unconnected input)
  for (const node of nodes) {
    if (!node.type.startsWith("trigger-") && (inDegree[node.id] || 0) === 0) {
      warnings.push(`Node "${node.data?.label || node.id}" has no incoming connections and will not execute.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    triggerNodeId,
    executionOrder: sortedOrder,
  };
}

