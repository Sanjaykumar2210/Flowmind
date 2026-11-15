"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sparkles, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [triggerType, setTriggerType] = React.useState("MANUAL");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Workflow name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          triggerType,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to create workflow");
      }

      const json = await res.json();
      const newId = json.data?.workflow?.id;
      if (newId) {
        router.push(`/workflows/${newId}/edit`);
      } else {
        router.push("/workflows");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Creation failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pt-6">
      <Link
        href="/workflows"
        className="inline-flex items-center gap-1.5 text-xs text-[#929BAE] hover:text-[#F5F7FA] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to workflows
      </Link>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Create New Workflow</CardTitle>
            <CardDescription>
              Set up a blank workflow canvas or specify initial trigger configurations.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <Input
              label="Workflow Name *"
              placeholder="e.g., Customer Support AI Classifier"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#929BAE]">Description</label>
              <textarea
                rows={3}
                placeholder="What business operation does this workflow automate?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-[#252C3A] bg-[#1A2130] p-2 text-xs text-[#F5F7FA] focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <Select
              label="Initial Starting Trigger"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
            >
              <option value="MANUAL">Manual Trigger (Run on demand / test)</option>
              <option value="WEBHOOK">Webhook Trigger (External HTTP POST)</option>
              <option value="SCHEDULE">Scheduled Trigger (Recurring Cron)</option>
            </Select>
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-[#252C3A] pt-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/templates" className="gap-1 text-xs text-indigo-400">
                <Layers className="h-3 w-3" />
                Or start from template
              </Link>
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isLoading}>
                Create Canvas
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

