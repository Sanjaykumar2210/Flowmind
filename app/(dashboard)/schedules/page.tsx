import * as React from "react";
import Link from "next/link";
import { Clock, Plus, ExternalLink } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SchedulesPage() {
  const session = await requireAuth();

  const schedules = await prisma.scheduledTrigger.findMany({
    where: { workflow: { workspaceId: session.workspaceId } },
    include: { workflow: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F5F7FA]">Scheduled Triggers</h1>
        <p className="text-xs text-[#929BAE] mt-0.5">
          Cron-based automation schedules running in background worker queues.
        </p>
      </div>

      {schedules.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No scheduled triggers"
          description="Add a Scheduled Trigger node to any workflow and publish it to run on a recurring cron interval."
          actionText="Create Workflow"
          actionHref="/workflows/new"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {schedules.map((s) => (
            <Card key={s.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Link
                  href={`/workflows/${s.workflow.id}/edit`}
                  className="text-sm font-semibold text-[#F5F7FA] hover:text-indigo-400"
                >
                  {s.workflow.name}
                </Link>
                <Badge variant={s.isActive ? "success" : "secondary"}>
                  {s.isActive ? "ACTIVE" : "PAUSED"}
                </Badge>
              </div>
              <div className="text-xs font-mono text-indigo-300 bg-[#090B12] p-2 rounded">
                Cron: {s.cronExpression} ({s.timezone})
              </div>
              <div className="text-[11px] text-[#929BAE]">
                Last Run: {formatDate(s.lastRunAt)}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

