import { NextRequest } from "next/server";
import { executionBus, ExecutionEvent } from "@/lib/events/execution-bus";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: executionId } = await params;

  // Verify execution exists
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    select: { id: true, status: true },
  });

  if (!execution) {
    return new Response(JSON.stringify({ error: "Execution not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial status event
      const initialEvent = {
        executionId,
        status: execution.status,
        timestamp: new Date().toISOString(),
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialEvent)}\n\n`));

      // Subscribe to execution events
      const unsubscribe = executionBus.subscribe(executionId, (event: ExecutionEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
          if (["COMPLETED", "FAILED", "CANCELLED"].includes(event.status)) {
            // Execution reached terminal state
            setTimeout(() => {
              try {
                controller.close();
              } catch {}
            }, 1000);
          }
        } catch {
          unsubscribe();
        }
      });

      // Keepalive heartbeat every 15s
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 15000);

      _request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

