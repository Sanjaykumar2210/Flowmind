import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/app/api/_helpers";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { workspaceId } = session;
    const { id } = await params;

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        _count: { select: { executions: true } },
        versions: {
          where: { id: undefined },
          orderBy: { versionNumber: "desc" },
          take: 1,
        },
      },
    });

    if (!workflow) return apiError("Workflow not found", 404);
    if (workflow.workspaceId !== workspaceId) return apiError("Forbidden", 403);

    // Load current version if exists
    let currentVersion = null;
    if (workflow.currentVersionId) {
      currentVersion = await prisma.workflowVersion.findUnique({
        where: { id: workflow.currentVersionId },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          workflow: {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            status: workflow.status,
            triggerType: workflow.triggerType,
            isPublished: workflow.isPublished,
            currentVersionId: workflow.currentVersionId,
            currentVersion,
            createdAt: workflow.createdAt,
            updatedAt: workflow.updatedAt,
            executionCount: workflow._count.executions,
            latestVersion: workflow.versions[0] ?? null,
          },
        },
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[workflow GET] Request failed");
    return apiError("Internal server error", 500);
  }
}

const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
  definition: z.unknown().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { workspaceId } = session;
    const { id } = await params;

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) return apiError("Workflow not found", 404);
    if (workflow.workspaceId !== workspaceId) return apiError("Forbidden", 403);

    const body = await request.json();
    const parsed = updateWorkflowSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? "Invalid workflow request", 400);

    const { name, description, status, definition } = parsed.data;

    let newVersionId: string | undefined;

    if (definition !== undefined) {
      // Get latest version number
      const latestVersion = await prisma.workflowVersion.findFirst({
        where: { workflowId: id },
        orderBy: { versionNumber: "desc" },
      });
      const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

      const newVersion = await prisma.workflowVersion.create({
        data: {
          workflowId: id,
          versionNumber: nextVersionNumber,
          definition: definition as object,
          isPublished: false,
        },
      });
      newVersionId = newVersion.id;
    }

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(newVersionId !== undefined && { currentVersionId: newVersionId }),
      },
    });

    return NextResponse.json({ success: true, data: { workflow: updated } }, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[workflow PUT] Request failed");
    return apiError("Internal server error", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { workspaceId } = session;
    const { id } = await params;

    const workflow = await prisma.workflow.findUnique({ where: { id } });
    if (!workflow) return apiError("Workflow not found", 404);
    if (workflow.workspaceId !== workspaceId) return apiError("Forbidden", 403);

    // Soft delete — set status to ARCHIVED
    const archived = await prisma.workflow.update({
      where: { id },
      data: { status: "ARCHIVED", isPublished: false },
    });

    return NextResponse.json({ success: true, data: { workflow: archived } }, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[workflow DELETE] Request failed");
    return apiError("Internal server error", 500);
  }
}
