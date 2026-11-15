"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export function TemplateUseButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleUse = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/templates/${templateId}/use`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to use template");
      const json = await res.json();
      const workflowId = json.data?.workflowId;
      if (workflowId) {
        router.push(`/workflows/${workflowId}/edit`);
      }
    } catch {
      console.error("[template use] Request failed");
      alert("Failed to create workflow from template");
      setIsLoading(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleUse}
      isLoading={isLoading}
      className="h-8 gap-1.5 text-xs text-indigo-300 hover:text-white"
    >
      <Zap className="h-3.5 w-3.5 text-indigo-400 fill-indigo-400/20" />
      Use Template
    </Button>
  );
}

