import * as React from "react";
import Link from "next/link";
import { Plus, GitFork, Play, Copy, Trash2, Edit3, Clock } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const session = await requireAuth();
  const { workspaceId } = session;
  const { status, search } = await searchParams;

  const whereClause: Record<string, unknown> = { workspaceId };
  if (status && ["ACTIVE", "DRAFT", "PAUSED"].includes(status)) {
    whereClause.status = status;
  }
  if (search) {
    whereClause.name = { contains: search, mode: "insensitive" };
  }

  const workflows = await prisma.workflow.findMany({
    where: whereClause,
    include: {
      _count: { select: { executions: true } },
      executions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true, status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#F5F7FA]">Workflows</h1>
          <p className="text-xs text-[#929BAE] mt-0.5">
            Create, configure, publish and manage your automated business workflows.
          </p>
        </div>

        <Button size="sm" asChild>
          <Link href="/workflows/new" className="gap-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Create Workflow
          </Link>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#252C3A] pb-3 text-xs">
        <Link
          href="/workflows"
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            !status ? "bg-indigo-600/20 text-indigo-400 font-semibold" : "text-[#929BAE] hover:text-[#F5F7FA]"
          }`}
        >
          All
        </Link>
        <Link
          href="/workflows?status=ACTIVE"
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            status === "ACTIVE" ? "bg-indigo-600/20 text-indigo-400 font-semibold" : "text-[#929BAE] hover:text-[#F5F7FA]"
          }`}
        >
          Active
        </Link>
        <Link
          href="/workflows?status=DRAFT"
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            status === "DRAFT" ? "bg-indigo-600/20 text-indigo-400 font-semibold" : "text-[#929BAE] hover:text-[#F5F7FA]"
          }`}
        >
          Drafts
        </Link>
      </div>

      {/* Workflow Cards Grid */}
      {workflows.length === 0 ? (
        <EmptyState
          icon={GitFork}
          title="No workflows found"
          description="Get started by creating your first workflow or launch from one of our pre-built templates."
          actionText="Create Workflow"
          actionHref="/workflows/new"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => {
            const lastExecution = wf.executions[0];
            return (
              <Card
                key={wf.id}
                className="hover:border-indigo-500/50 hover:bg-[#141925] transition-all flex flex-col justify-between"
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        wf.isPublished
                          ? "success"
                          : wf.status === "ACTIVE"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {wf.isPublished ? "PUBLISHED" : wf.status}
                    </Badge>
                    <span className="text-[11px] font-mono text-[#929BAE]">
                      {wf._count.executions} run{wf._count.executions === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div>
                    <Link
                      href={`/workflows/${wf.id}/edit`}
                      className="text-sm font-semibold text-[#F5F7FA] hover:text-indigo-400 transition-colors line-clamp-1"
                    >
                      {wf.name}
                    </Link>
                    <p className="mt-1 text-xs text-[#929BAE] line-clamp-2">
                      {wf.description || "No description provided."}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-[#252C3A]/60 text-[10px] text-[#929BAE] flex items-center justify-between">
                    <span>Updated {formatDate(wf.updatedAt)}</span>
                    {lastExecution && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last: {lastExecution.status}
                      </span>
                    )}
                  </div>
                </CardContent>

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-2 border-t border-[#252C3A]/60 bg-[#0E111B]/40 px-4 py-2.5">
                  <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                    <Link href={`/workflows/${wf.id}/edit`} className="gap-1">
                      <Edit3 className="h-3 w-3" />
                      Open Canvas
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

