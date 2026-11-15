import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { apiError } from "@/app/api/_helpers";
import { WorkflowStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const createWorkflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  triggerType: z.enum(["MANUAL", "WEBHOOK", "SCHEDULE"]).optional().default("MANUAL"),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { workspaceId } = session;

    const { searchParams } = request.nextUrl;
    const statusFilter = searchParams.get("status") as WorkflowStatus | null;
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "updated";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;

    const where = {
      workspaceId,
      ...(statusFilter && { status: statusFilter }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const orderBy =
      sort === "name"
        ? { name: "asc" as const }
        : sort === "created"
        ? { createdAt: "desc" as const }
        : { updatedAt: "desc" as const };

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: { select: { executions: true } },
          executions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
      prisma.workflow.count({ where }),
    ]);

    return NextResponse.json(
      {
        success: true,
        data: {
          workflows: workflows.map((w) => ({
            id: w.id,
            name: w.name,
            description: w.description,
            status: w.status,
            triggerType: w.triggerType,
            isPublished: w.isPublished,
            currentVersionId: w.currentVersionId,
            createdAt: w.createdAt,
            updatedAt: w.updatedAt,
            executionCount: w._count.executions,
            lastExecutedAt: w.executions[0]?.createdAt ?? null,
          })),
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        },
      },
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[workflows GET] Request failed");
    return apiError("Internal server error", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { workspaceId } = session;

    const body = await request.json();
    const parsed = createWorkflowSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid workflow request", 400);
    }

    const { name, description, triggerType } = parsed.data;

    const workflow = await prisma.workflow.create({
      data: {
        workspaceId,
        name,
        description,
        triggerType,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ success: true, data: { workflow } }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return apiError("Unauthorized", 401);
    }
    console.error("[workflows POST] Request failed");
    return apiError("Internal server error", 500);
  }
}
