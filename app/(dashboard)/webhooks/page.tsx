import * as React from "react";
import Link from "next/link";
import { Webhook } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { env } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  const session = await requireAuth();

  const webhooks = await prisma.webhookEndpoint.findMany({
    where: { workflow: { workspaceId: session.workspaceId } },
    include: { workflow: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F5F7FA]">Webhook Endpoints</h1>
        <p className="text-xs text-[#929BAE] mt-0.5">
          Incoming webhook URLs for receiving third-party events (Stripe, GitHub, Shopify, PagerDuty).
        </p>
      </div>

      {webhooks.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="No webhook endpoints"
          description="Add a Webhook Trigger node to a workflow to generate a secure inbound HTTP POST endpoint."
          actionText="Create Workflow"
          actionHref="/workflows/new"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {webhooks.map((w) => (
            <Card key={w.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Link
                  href={`/workflows/${w.workflow.id}/edit`}
                  className="text-sm font-semibold text-[#F5F7FA] hover:text-indigo-400"
                >
                  {w.workflow.name}
                </Link>
                <Badge variant={w.isActive ? "success" : "secondary"}>
                  {w.method}
                </Badge>
              </div>
              <div className="text-[11px] font-mono text-emerald-300 bg-[#090B12] p-2 rounded break-all select-all">
                {env.appUrl.replace(/\/+$/, "")}/api/webhooks/{w.token}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

