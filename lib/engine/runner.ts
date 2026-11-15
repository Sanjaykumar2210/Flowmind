import prisma from "@/lib/db";
import { ExecutionContext } from "./context";
import { validateWorkflowGraph, WorkflowDefinition } from "./dag";
import { getNodeHandler } from "./handlers";
import { executionBus, ExecutionEvent } from "@/lib/events/execution-bus";
import {
  ExecutionStatus,
  NodeExecutionStatus,
  LogLevel,
  TriggerType,
} from "@prisma/client";

const MAX_EXECUTION_NODES = 50;
const GLOBAL_TIMEOUT_MS = 120_000; // 2 minutes per execution

function getTargetType(status: ExecutionStatus): "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "WAITING" | "QUEUED" {
  return status as unknown as "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | "WAITING" | "QUEUED";
}

export async function executeWorkflow(executionId: string): Promise<void> {
  const startTime = Date.now();

  // 1. Fetch execution record
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: {
      workflowVersion: true,
      workflow: true,
    },
  });

  if (!execution) {
    throw new Error(`Execution ${executionId} not found`);
  }

  if (execution.status !== "QUEUED") {
    console.warn(`Execution ${executionId} is not in QUEUED state (is ${execution.status})`);
    return;
  }

  // Mark execution as running
  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: ExecutionStatus.RUNNING,
      startedAt: new Date(),
    },
  });

  emitExecutionEvent({
    executionId,
    status: "RUNNING",
    timestamp: new Date().toISOString(),
  });

  await addExecutionLog(executionId, null, "INFO", "Workflow execution started");

  // 2. Load & parse workflow definition
  const workflowVersion = execution.workflowVersion;
  if (!workflowVersion) {
    await failExecution(executionId, startTime, "No published workflow version found for execution.");
    return;
  }

  const definition = workflowVersion.definition as unknown as WorkflowDefinition;

  // 3. Validate the graph
  const validation = validateWorkflowGraph(definition);
  if (!validation.isValid) {
    await failExecution(executionId, startTime, `Workflow validation failed: ${validation.errors.join("; ")}`);
    return;
  }

  if (!validation.executionOrder || validation.executionOrder.length === 0) {
    await failExecution(executionId, startTime, "Could not compute valid execution order.");
    return;
  }

  // 4. Guard: execution node limit
  if (definition.nodes.length > MAX_EXECUTION_NODES) {
    await failExecution(executionId, startTime, `Workflow exceeds the maximum node limit of ${MAX_EXECUTION_NODES}.`);
    return;
  }

  // 5. Build node lookup map
  const nodeMap = new Map(definition.nodes.map((n) => [n.id, n]));

  // Build edges map: nodeId => [{ target, sourceHandle }]
  const edgeMap = new Map<string, Array<{ target: string; sourceHandle?: string | null }>>();
  for (const edge of definition.edges) {
    if (!edgeMap.has(edge.source)) {
      edgeMap.set(edge.source, []);
    }
    edgeMap.get(edge.source)!.push({ target: edge.target, sourceHandle: edge.sourceHandle });
  }

  // 6. Set up execution context
  const context = new ExecutionContext({
    executionId,
    workflowId: execution.workflowId,
    trigger: execution.triggerPayload || {},
    input: execution.triggerPayload || {},
  });

  // 7. Execute nodes in topological order with branch filtering
  const globalTimer = setTimeout(async () => {
    await failExecution(executionId, startTime, `Workflow execution timed out after ${GLOBAL_TIMEOUT_MS / 1000}s.`);
  }, GLOBAL_TIMEOUT_MS);

  const skippedNodes = new Set<string>();

  try {
    for (const nodeId of validation.executionOrder) {
      // Check global timeout
      if (Date.now() - startTime > GLOBAL_TIMEOUT_MS) break;

      const node = nodeMap.get(nodeId);
      if (!node) continue;

      const nodeConfig = (node.data?.config || {}) as Record<string, unknown>;
      const nodeName = String(node.data?.label || node.type || nodeId);
      const nodeType = node.type;

      // Skip nodes that were on the wrong branch
      if (skippedNodes.has(nodeId)) {
        await updateNodeStatus(executionId, nodeId, nodeType, nodeName, NodeExecutionStatus.SKIPPED);
        emitExecutionEvent({
          executionId,
          nodeId,
          nodeName,
          status: "SKIPPED",
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      // Create node execution record
      const nodeExecution = await prisma.nodeExecution.create({
        data: {
          executionId,
          nodeId,
          nodeType,
          nodeName,
          status: NodeExecutionStatus.RUNNING,
          startedAt: new Date(),
        },
      });

      emitExecutionEvent({
        executionId,
        nodeId,
        nodeType,
        nodeName,
        status: "RUNNING",
        timestamp: new Date().toISOString(),
      });

      const nodeStartTime = Date.now();

      try {
        // Get registered handler
        const handler = getNodeHandler(nodeType);
        if (!handler) {
          throw new Error(`No registered handler found for node type "${nodeType}"`);
        }

        // Execute node handler
        const result = await handler({
          nodeId,
          nodeType,
          config: nodeConfig,
          context,
          workspaceId: execution.workspaceId,
        });

        const nodeDuration = Date.now() - nodeStartTime;

        // Store node output in context
        context.setNodeOutput(nodeId, result.output);

        // Store logs
        for (const log of result.logs || []) {
          await addExecutionLog(executionId, nodeExecution.id, "INFO", log);
        }

        // Update node execution record
        await prisma.nodeExecution.update({
          where: { id: nodeExecution.id },
          data: {
            status: NodeExecutionStatus.COMPLETED,
            outputData: result.output as object,
            durationMs: nodeDuration,
            completedAt: new Date(),
          },
        });

        emitExecutionEvent({
          executionId,
          nodeId,
          nodeType,
          nodeName,
          status: "COMPLETED",
          outputData: result.output,
          durationMs: nodeDuration,
          timestamp: new Date().toISOString(),
        });

        // If node has a selectedBranch (conditions/switches): filter outgoing edges
        if (result.selectedBranch !== undefined) {
          const outEdges = edgeMap.get(nodeId) || [];
          for (const edge of outEdges) {
            if (edge.sourceHandle && edge.sourceHandle !== result.selectedBranch) {
              // Queue all downstream descendants of inactive branches for skipping
              markDescendantsSkipped(edge.target, edgeMap, skippedNodes, validation.executionOrder);
            }
          }
        }
      } catch (nodeErr: unknown) {
        const nodeErrorMsg = nodeErr instanceof Error ? nodeErr.message : String(nodeErr);
        const nodeDuration = Date.now() - nodeStartTime;

        await prisma.nodeExecution.update({
          where: { id: nodeExecution.id },
          data: {
            status: NodeExecutionStatus.FAILED,
            errorMessage: nodeErrorMsg,
            durationMs: nodeDuration,
            completedAt: new Date(),
          },
        });

        await addExecutionLog(executionId, nodeExecution.id, "ERROR", `Node "${nodeName}" failed: ${nodeErrorMsg}`);

        emitExecutionEvent({
          executionId,
          nodeId,
          nodeType,
          nodeName,
          status: "FAILED",
          errorMessage: nodeErrorMsg,
          durationMs: nodeDuration,
          timestamp: new Date().toISOString(),
        });

        clearTimeout(globalTimer);
        await failExecution(executionId, startTime, `Node "${nodeName}" failed: ${nodeErrorMsg}`);
        return;
      }
    }

    clearTimeout(globalTimer);

    // All nodes executed successfully
    const totalDuration = Date.now() - startTime;
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.COMPLETED,
        completedAt: new Date(),
        durationMs: totalDuration,
      },
    });

    await addExecutionLog(executionId, null, "INFO", `Workflow completed successfully in ${totalDuration}ms`);

    emitExecutionEvent({
      executionId,
      status: "COMPLETED",
      durationMs: totalDuration,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    clearTimeout(globalTimer);
    const errorMsg = err instanceof Error ? err.message : String(err);
    await failExecution(executionId, startTime, errorMsg);
  }
}

function markDescendantsSkipped(
  startNodeId: string,
  edgeMap: Map<string, Array<{ target: string; sourceHandle?: string | null }>>,
  skippedNodes: Set<string>,
  executionOrder: string[]
): void {
  const queue = [startNodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (skippedNodes.has(current)) continue;
    // Only skip if exists in execution order (is reachable)
    if (executionOrder.includes(current)) {
      skippedNodes.add(current);
      const nextEdges = edgeMap.get(current) || [];
      for (const e of nextEdges) {
        queue.push(e.target);
      }
    }
  }
}

async function failExecution(executionId: string, startTime: number, errorMessage: string): Promise<void> {
  const duration = Date.now() - startTime;
  await prisma.workflowExecution.update({
    where: { id: executionId },
    data: {
      status: ExecutionStatus.FAILED,
      completedAt: new Date(),
      durationMs: duration,
      errorMessage,
    },
  });

  await addExecutionLog(executionId, null, "ERROR", `Execution failed: ${errorMessage}`);

  emitExecutionEvent({
    executionId,
    status: "FAILED",
    errorMessage,
    durationMs: duration,
    timestamp: new Date().toISOString(),
  });
}

async function addExecutionLog(
  executionId: string,
  nodeExecutionId: string | null,
  level: "INFO" | "WARN" | "ERROR" | "DEBUG",
  message: string
): Promise<void> {
  try {
    await prisma.executionLog.create({
      data: {
        executionId,
        nodeExecutionId,
        level: level as LogLevel,
        message,
      },
    });
  } catch {
    // Non-fatal - log persistence failure should not stop execution
    console.error("Failed to persist execution log.");
  }
}

async function updateNodeStatus(
  executionId: string,
  nodeId: string,
  nodeType: string,
  nodeName: string,
  status: NodeExecutionStatus
): Promise<void> {
  await prisma.nodeExecution.create({
    data: {
      executionId,
      nodeId,
      nodeType,
      nodeName,
      status,
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 0,
    },
  }).catch(() => {});
}

function emitExecutionEvent(event: Omit<ExecutionEvent, "timestamp"> & { timestamp?: string }): void {
  executionBus.emitExecutionEvent({
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  });
}

// Export unused getTargetType to prevent TS dead-code errors
export { getTargetType };

