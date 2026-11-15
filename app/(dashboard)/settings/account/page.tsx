import * as React from "react";
import { User, Shield, Mail, Key } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function AccountSettingsPage() {
  const session = await requireAuth();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F5F7FA]">Account Settings</h1>
        <p className="text-xs text-[#929BAE] mt-0.5">
          Manage your personal profile and authentication credentials.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-indigo-400" />
            <div>
              <CardTitle className="text-base">Profile Information</CardTitle>
              <CardDescription className="text-xs">Your public display information</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            label="Full Name"
            defaultValue={user?.name || ""}
            disabled
          />
          <Input
            label="Email Address"
            defaultValue={user?.email || ""}
            disabled
          />
          <p className="text-[11px] text-[#929BAE]">
            Account managed via workspace session: <span className="font-mono text-[#F5F7FA]">{user?.id}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

