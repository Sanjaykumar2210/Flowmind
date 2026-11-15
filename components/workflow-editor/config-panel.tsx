"use client";

import * as React from "react";
import { X, Trash2, Sliders, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useWorkflowStore } from "@/store/workflow-store";
import { type Node } from "@xyflow/react";

interface ConfigPanelProps {
  selectedNode: Node | null;
  onUpdateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

export function ConfigPanel({
  selectedNode,
  onUpdateNodeData,
  onDeleteNode,
  onClose,
}: ConfigPanelProps) {
  const selectedNodeId = selectedNode?.id;
  const lastOutput = useWorkflowStore((s) => selectedNodeId ? s.nodeOutputs[selectedNodeId] : undefined);
  const status = useWorkflowStore((s) => selectedNodeId ? s.nodeStatuses[selectedNodeId] : undefined);

  if (!selectedNode) return null;

  const { id, type, data } = selectedNode;
  const label = (data?.label as string) || "";
  const description = (data?.description as string) || "";
  const config = ((data?.config as Record<string, unknown>) || {});

  const updateConfigField = (key: string, value: unknown) => {
    onUpdateNodeData(id, {
      ...data,
      config: {
        ...config,
        [key]: value,
      },
    });
  };

  const updateLabel = (newLabel: string) => {
    onUpdateNodeData(id, {
      ...data,
      label: newLabel,
    });
  };

  const updateDescription = (newDesc: string) => {
    onUpdateNodeData(id, {
      ...data,
      description: newDesc,
    });
  };

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-[#252C3A] bg-[#0E111B] text-[#F5F7FA]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#252C3A] p-3.5">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-indigo-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F5F7FA]">
            Configure Node
          </h3>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-[#929BAE] hover:bg-[#1E2538] hover:text-[#F5F7FA] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* General Meta */}
        <div className="space-y-3 pb-3 border-b border-[#252C3A]">
          <Input
            label="Node Label"
            value={label}
            onChange={(e) => updateLabel(e.target.value)}
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => updateDescription(e.target.value)}
          />
          <div className="text-[10px] text-[#929BAE]">
            Type: <span className="font-mono text-indigo-300">{type}</span> (ID: {id})
          </div>
        </div>

        {/* Dynamic Config Form by Node Type */}
        <div className="space-y-3">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#929BAE]">
            Node Parameters
          </h4>

          {/* Trigger: Manual */}
          {type === "trigger-manual" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#929BAE]">Default JSON Payload</label>
              <textarea
                rows={6}
                value={typeof config.defaultPayload === "string" ? config.defaultPayload : JSON.stringify(config.defaultPayload, null, 2)}
                onChange={(e) => updateConfigField("defaultPayload", e.target.value)}
                className="w-full rounded-lg border border-[#252C3A] bg-[#141925] p-2 font-mono text-xs text-[#F5F7FA] focus:border-indigo-500 focus:outline-none"
                placeholder='{\n  "ticketId": "TCK-100",\n  "message": "..."\n}'
              />
            </div>
          )}

          {/* Trigger: Webhook */}
          {type === "trigger-webhook" && (
            <div className="space-y-2">
              <Select
                label="HTTP Method"
                value={String(config.method || "POST")}
                onChange={(e) => updateConfigField("method", e.target.value)}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
              </Select>
              <p className="text-xs text-[#929BAE]">
                Webhook URL will be activated when this workflow is published.
              </p>
            </div>
          )}

          {/* Trigger: Schedule */}
          {type === "trigger-schedule" && (
            <div className="space-y-3">
              <Input
                label="Cron Expression"
                placeholder="*/5 * * * *"
                value={String(config.cronExpression || "0 * * * *")}
                onChange={(e) => updateConfigField("cronExpression", e.target.value)}
              />
              <p className="text-[11px] text-[#929BAE]">
                Examples: `*/5 * * * *` (Every 5 mins), `0 * * * *` (Hourly)
              </p>
            </div>
          )}

          {/* AI Nodes */}
          {type === "ai-classify" && (
            <div className="space-y-3">
              <Input
                label="Input Field Template"
                placeholder="{{node-trigger-1.message}}"
                value={String(config.inputField || "")}
                onChange={(e) => updateConfigField("inputField", e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#929BAE]">Allowed Categories (Comma separated)</label>
                <textarea
                  rows={4}
                  value={Array.isArray(config.categories) ? config.categories.join(", ") : String(config.categories || "")}
                  onChange={(e) => updateConfigField("categories", e.target.value.split(",").map((s) => s.trim()))}
                  className="w-full rounded-lg border border-[#252C3A] bg-[#141925] p-2 text-xs text-[#F5F7FA] focus:border-indigo-500 focus:outline-none"
                  placeholder="Critical Outage, Billing Support, General Inquiry"
                />
              </div>
            </div>
          )}

          {type === "ai-generate" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#929BAE]">Prompt Template</label>
                <textarea
                  rows={5}
                  value={String(config.prompt || "")}
                  onChange={(e) => updateConfigField("prompt", e.target.value)}
                  className="w-full rounded-lg border border-[#252C3A] bg-[#141925] p-2 text-xs text-[#F5F7FA] focus:border-indigo-500 focus:outline-none"
                  placeholder="Analyze the following inquiry: {{trigger.message}}"
                />
              </div>
            </div>
          )}

          {type === "ai-summarize" && (
            <div className="space-y-3">
              <Input
                label="Input Field Template"
                placeholder="{{trigger.text}}"
                value={String(config.inputField || "")}
                onChange={(e) => updateConfigField("inputField", e.target.value)}
              />
              <Select
                label="Format"
                value={String(config.format || "paragraph")}
                onChange={(e) => updateConfigField("format", e.target.value)}
              >
                <option value="paragraph">Paragraph</option>
                <option value="bullet-points">Bullet Points</option>
                <option value="executive-summary">Executive Summary</option>
              </Select>
            </div>
          )}

          {type === "ai-extract" && (
            <div className="space-y-3">
              <Input
                label="Input Field Template"
                placeholder="{{trigger.rawInvoice}}"
                value={String(config.inputField || "")}
                onChange={(e) => updateConfigField("inputField", e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#929BAE]">Target Schema Definition</label>
                <textarea
                  rows={5}
                  value={String(config.schemaDefinition || "")}
                  onChange={(e) => updateConfigField("schemaDefinition", e.target.value)}
                  className="w-full rounded-lg border border-[#252C3A] bg-[#141925] p-2 font-mono text-xs text-[#F5F7FA] focus:border-indigo-500 focus:outline-none"
                  placeholder='{\n  "totalAmount": "number",\n  "vendor": "string"\n}'
                />
              </div>
            </div>
          )}

          {/* Logic: Condition */}
          {type === "logic-condition" && (
            <div className="space-y-3">
              <Input
                label="Variable / Field"
                placeholder="{{node-ai-classify-1.priority}}"
                value={String(config.field || "")}
                onChange={(e) => updateConfigField("field", e.target.value)}
              />
              <Select
                label="Operator"
                value={String(config.operator || "equals")}
                onChange={(e) => updateConfigField("operator", e.target.value)}
              >
                <option value="equals">Equals (==)</option>
                <option value="notEquals">Not Equals (!=)</option>
                <option value="contains">Contains substring</option>
                <option value="notContains">Does not contain</option>
                <option value="greaterThan">Greater than (&gt;)</option>
                <option value="lessThan">Less than (&lt;)</option>
                <option value="isEmpty">Is Empty</option>
                <option value="isNotEmpty">Is Not Empty</option>
              </Select>
              <Input
                label="Expected Value"
                placeholder="High"
                value={String(config.value || "")}
                onChange={(e) => updateConfigField("value", e.target.value)}
              />
            </div>
          )}

          {/* Action: HTTP */}
          {type === "action-http" && (
            <div className="space-y-3">
              <Input
                label="Target URL"
                placeholder="https://api.example.com/v1/resource"
                value={String(config.url || "")}
                onChange={(e) => updateConfigField("url", e.target.value)}
              />
              <Select
                label="Method"
                value={String(config.method || "GET")}
                onChange={(e) => updateConfigField("method", e.target.value)}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </Select>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#929BAE]">Request Body (Optional)</label>
                <textarea
                  rows={4}
                  value={String(config.body || "")}
                  onChange={(e) => updateConfigField("body", e.target.value)}
                  className="w-full rounded-lg border border-[#252C3A] bg-[#141925] p-2 font-mono text-xs text-[#F5F7FA] focus:border-indigo-500 focus:outline-none"
                  placeholder='{\n  "data": "{{node-1.result}}"\n}'
                />
              </div>
            </div>
          )}

          {/* Action: Webhook */}
          {type === "action-webhook" && (
            <div className="space-y-3">
              <Input
                label="Destination URL"
                placeholder="https://hooks.slack.com/services/..."
                value={String(config.url || "")}
                onChange={(e) => updateConfigField("url", e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#929BAE]">Payload JSON</label>
                <textarea
                  rows={4}
                  value={String(config.payload || "")}
                  onChange={(e) => updateConfigField("payload", e.target.value)}
                  className="w-full rounded-lg border border-[#252C3A] bg-[#141925] p-2 font-mono text-xs text-[#F5F7FA] focus:border-indigo-500 focus:outline-none"
                  placeholder='{\n  "event": "alert"\n}'
                />
              </div>
            </div>
          )}

          {/* Action: Email */}
          {type === "action-email" && (
            <div className="space-y-3">
              <Input
                label="To"
                placeholder="{{trigger.customerEmail}}"
                value={String(config.to || "")}
                onChange={(e) => updateConfigField("to", e.target.value)}
              />
              <Input
                label="Subject"
                placeholder="Ticket Received"
                value={String(config.subject || "")}
                onChange={(e) => updateConfigField("subject", e.target.value)}
              />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#929BAE]">Body</label>
                <textarea
                  rows={4}
                  value={String(config.body || "")}
                  onChange={(e) => updateConfigField("body", e.target.value)}
                  className="w-full rounded-lg border border-[#252C3A] bg-[#141925] p-2 text-xs text-[#F5F7FA] focus:border-indigo-500 focus:outline-none"
                  placeholder="Hello {{trigger.name}}, we received your request..."
                />
              </div>
            </div>
          )}

          {/* Utility: Text Process */}
          {type === "utility-text" && (
            <div className="space-y-3">
              <Input
                label="Input String"
                placeholder="{{trigger.text}}"
                value={String(config.input || "")}
                onChange={(e) => updateConfigField("input", e.target.value)}
              />
              <Select
                label="Operation"
                value={String(config.operation || "trim")}
                onChange={(e) => updateConfigField("operation", e.target.value)}
              >
                <option value="uppercase">Uppercase</option>
                <option value="lowercase">Lowercase</option>
                <option value="trim">Trim Whitespace</option>
                <option value="split">Split into Array</option>
                <option value="wordCount">Word Count</option>
              </Select>
            </div>
          )}
        </div>

        {/* Live Execution Output Inspector */}
        {lastOutput !== undefined && (
          <div className="mt-4 rounded-lg border border-[#252C3A] bg-[#141925] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-[#F5F7FA]">
              <span className="flex items-center gap-1.5">
                <PlayCircle className="h-3.5 w-3.5 text-emerald-400" />
                Latest Output ({status})
              </span>
            </div>
            <pre className="max-h-40 overflow-auto rounded bg-[#090B12] p-2 text-[10px] font-mono text-emerald-300">
              {JSON.stringify(lastOutput, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Footer / Delete */}
      <div className="border-t border-[#252C3A] p-3">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDeleteNode(id)}
          className="w-full justify-center gap-1.5 text-xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete Node
        </Button>
      </div>
    </aside>
  );
}

