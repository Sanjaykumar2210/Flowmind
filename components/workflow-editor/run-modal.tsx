"use client";

import * as React from "react";
import { Play, AlertCircle, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface RunModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (payload: Record<string, unknown>) => Promise<void>;
  defaultPayload?: Record<string, unknown> | string;
  isExecuting?: boolean;
}

export function RunModal({
  isOpen,
  onClose,
  onExecute,
  defaultPayload,
  isExecuting,
}: RunModalProps) {
  const [jsonText, setJsonText] = React.useState("");
  const [parseError, setParseError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (defaultPayload) {
      if (typeof defaultPayload === "string") {
        try {
          const parsed = JSON.parse(defaultPayload);
          setJsonText(JSON.stringify(parsed, null, 2));
        } catch {
          setJsonText(defaultPayload);
        }
      } else {
        setJsonText(JSON.stringify(defaultPayload, null, 2));
      }
    } else {
      setJsonText(
        JSON.stringify(
          {
            ticketId: "TCK-" + Math.floor(1000 + Math.random() * 9000),
            customerEmail: "user@example.com",
            message: "Our authentication endpoint is returning HTTP 500 error on checkout. Urgent fix required!",
            priority: "High",
          },
          null,
          2
        )
      );
    }
  }, [defaultPayload, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setParseError(null);

    let parsedPayload: Record<string, unknown> = {};
    if (jsonText.trim()) {
      try {
        parsedPayload = JSON.parse(jsonText);
      } catch (err: unknown) {
        setParseError(err instanceof Error ? err.message : "Invalid JSON input");
        return;
      }
    }

    await onExecute(parsedPayload);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Execute Workflow"
      description="Provide trigger input data to execute this workflow graph."
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#929BAE]">
            Trigger Input Payload (JSON)
          </label>
          <textarea
            rows={8}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setParseError(null);
            }}
            className="w-full rounded-lg border border-[#252C3A] bg-[#090B12] p-3 font-mono text-xs text-emerald-300 focus:border-indigo-500 focus:outline-none"
            placeholder="{ ... }"
          />
          {parseError && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{parseError}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#252C3A]">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isExecuting}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Start Execution
          </Button>
        </div>
      </form>
    </Modal>
  );
}

