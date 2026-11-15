import * as React from "react";
import { Building2, Users, Shield } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function WorkspaceSettingsPage() {
  const session = await requireAuth();

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.workspaceId },
    include: {
      members: {
        include: { user: true },
      },
    },
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F5F7FA]">Workspace Settings</h1>
        <p className="text-xs text-[#929BAE] mt-0.5">
          Manage workspace settings, members, and tenant isolation policies.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-400" />
            <div>
              <CardTitle className="text-base">{workspace?.name || "Workspace"}</CardTitle>
              <CardDescription className="text-xs">Slug: {workspace?.slug}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#929BAE]">
            Workspace Members ({workspace?.members.length})
          </div>

          <div className="divide-y divide-[#252C3A]/60 rounded-lg border border-[#252C3A] bg-[#0E111B]/40">
            {workspace?.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 text-xs">
                <div>
                  <div className="font-medium text-[#F5F7FA]">{m.user.name}</div>
                  <div className="text-[11px] text-[#929BAE]">{m.user.email}</div>
                </div>
                <Badge variant="default">{m.role}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

