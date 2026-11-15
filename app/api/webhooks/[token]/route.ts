import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { assertRedisAvailable, getExecutionQueue } from "@/lib/queue/client";
import { ExecutionStatus, TriggerType } from "@prisma/client";

async function handleWebhookRequest(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
  method: string,
) {
  try {
    const { token } = await params;

    // Find webhook endpoint
    const endpoint = await prisma.webhookEndpoint.findUnique({
      where: { token },
      include: {
        workflow: {
          include: {
            versions: {
              orderBy: { versionNumber: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!endpoint || !endpoint.isActive) {
      return NextResponse.json({ error: "Webhook endpoint not found or inactive" }, { status: 404 });
    }
    if (endpoint.method !== method) {
      return NextResponse.json({ error: `This endpoint accepts ${endpoint.method} requests only.` }, { status: 405 });
    }

    const body = method === "GET"
      ? Object.fromEntries(request.nextUrl.searchParams.entries())
      : await request.json().catch(() => ({}));

    const workflow = endpoint.workflow;
    const versionId = workflow.currentVersionId || workflow.versions[0]?.id;

    if (!versionId) {
      return NextResponse.json({ error: "Workflow has no valid version" }, { status: 400 });
    }

    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        workflowVersionId: versionId,
        workspaceId: workflow.workspaceId,
        status: ExecutionStatus.QUEUED,
        triggerSource: TriggerType.WEBHOOK,
        triggerPayload: body,
      },
    });

    try {
      await assertRedisAvailable();
      const queue = getExecutionQueue();
      await queue.add("execute", { executionId: execution.id });
    } catch {
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: ExecutionStatus.FAILED, errorMessage: "Redis is unavailable; workflow execution could not be queued." },
      });
      return NextResponse.json({ error: "Redis is unavailable; workflow execution could not be queued." }, { status: 503 });
    }

    return NextResponse.json({
      received: true,
      executionId: execution.id,
      status: "QUEUED",
    });
  } catch {
    console.error("[incoming webhook] Request failed");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

type WebhookRouteContext = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, context: WebhookRouteContext) {
  return handleWebhookRequest(request, context, "GET");
}

export async function POST(request: NextRequest, context: WebhookRouteContext) {
  return handleWebhookRequest(request, context, "POST");
}

export async function PUT(request: NextRequest, context: WebhookRouteContext) {
  return handleWebhookRequest(request, context, "PUT");
}

