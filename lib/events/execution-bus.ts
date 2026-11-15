import { EventEmitter } from "events";
import { env } from "@/lib/config/env";

export interface ExecutionEvent {
  executionId: string;
  nodeId?: string;
  nodeType?: string;
  nodeName?: string;
  status: "QUEUED" | "RUNNING" | "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED" | "SKIPPED";
  inputData?: unknown;
  outputData?: unknown;
  durationMs?: number;
  errorMessage?: string;
  timestamp: string;
}

class ExecutionEventBus extends EventEmitter {
  constructor() {
    super();
    // Allow high concurrency of listeners for multiple active executions
    this.setMaxListeners(200);
  }

  emitExecutionEvent(event: ExecutionEvent): void {
    this.emit(`execution:${event.executionId}`, event);
    this.emit("execution:*", event);
  }

  subscribe(executionId: string, listener: (event: ExecutionEvent) => void): () => void {
    const eventName = `execution:${executionId}`;
    this.on(eventName, listener);
    return () => {
      this.off(eventName, listener);
    };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var executionBusGlobal: ExecutionEventBus | undefined;
}

export const executionBus = global.executionBusGlobal || new ExecutionEventBus();

if (!env.isProduction) {
  global.executionBusGlobal = executionBus;
}

