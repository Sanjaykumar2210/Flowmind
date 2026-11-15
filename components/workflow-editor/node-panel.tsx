"use client";

import * as React from "react";
import {
  Search,
  Play,
  Webhook,
  Clock,
  Sparkles,
  Tags,
  FileText,
  Database,
  GitBranch,
  ToggleLeft,
  Filter,
  GitMerge,
  Repeat,
  Globe,
  Send,
  Mail,
  Shuffle,
  Variable,
  Braces,
  Timer,
  Calendar,
  Type,
  GripVertical,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface NodeCategory {
  title: string;
  color: string;
  items: Array<{
    type: string;
    label: string;
    description: string;
    icon: React.ElementType;
  }>;
}

const NODE_CATEGORIES: NodeCategory[] = [
  {
    title: "TRIGGERS",
    color: "text-amber-400 border-amber-500/20 bg-amber-500/10",
    items: [
      { type: "trigger-manual", label: "Manual Trigger", description: "Start manually with test payload", icon: Play },
      { type: "trigger-webhook", label: "Webhook Trigger", description: "Start from HTTP POST webhook", icon: Webhook },
      { type: "trigger-schedule", label: "Scheduled Trigger", description: "Start on a cron schedule", icon: Clock },
    ],
  },
  {
    title: "AI NODES",
    color: "text-violet-400 border-violet-500/20 bg-violet-500/10",
    items: [
      { type: "ai-generate", label: "AI Text Generate", description: "Generate text with Ollama model", icon: Sparkles },
      { type: "ai-classify", label: "AI Classification", description: "Classify into custom categories", icon: Tags },
      { type: "ai-summarize", label: "AI Summarizer", description: "Summarize long-form text", icon: FileText },
      { type: "ai-extract", label: "AI Data Extraction", description: "Extract structured JSON schema", icon: Database },
    ],
  },
  {
    title: "LOGIC",
    color: "text-sky-400 border-sky-500/20 bg-sky-500/10",
    items: [
      { type: "logic-condition", label: "If / Else Condition", description: "Branch based on boolean logic", icon: GitBranch },
      { type: "logic-switch", label: "Switch Branch", description: "Multi-branch rule selector", icon: ToggleLeft },
      { type: "logic-filter", label: "Filter Items", description: "Filter arrays by attribute", icon: Filter },
      { type: "logic-merge", label: "Merge Branches", description: "Combine upstream branches", icon: GitMerge },
      { type: "logic-loop", label: "Loop Iterator", description: "Iterate over list of items", icon: Repeat },
    ],
  },
  {
    title: "ACTIONS",
    color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    items: [
      { type: "action-http", label: "HTTP Request", description: "Safe API fetch with SSRF guard", icon: Globe },
      { type: "action-webhook", label: "Send Webhook", description: "Dispatch external POST webhook", icon: Send },
      { type: "action-email", label: "Email Notification", description: "Send email via SMTP server", icon: Mail },
      { type: "action-transform", label: "Transform Data", description: "Map and project JSON objects", icon: Shuffle },
      { type: "action-database", label: "Database Op", description: "Safe context state storage", icon: Database },
    ],
  },
  {
    title: "UTILITIES",
    color: "text-slate-400 border-slate-500/20 bg-slate-500/10",
    items: [
      { type: "utility-variables", label: "Set Variables", description: "Store values in context", icon: Variable },
      { type: "utility-json", label: "JSON Parser", description: "Parse or stringify JSON", icon: Braces },
      { type: "utility-delay", label: "Delay Timer", description: "Pause execution safely", icon: Timer },
      { type: "utility-date", label: "Format Date", description: "Convert and format dates", icon: Calendar },
      { type: "utility-text", label: "Text Process", description: "Case, trim, split, replace", icon: Type },
    ],
  },
];

export function NodePanel() {
  const [search, setSearch] = React.useState("");

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData("application/reactflow", JSON.stringify({ type: nodeType, label }));
    event.dataTransfer.effectAllowed = "move";
  };

  const filteredCategories = NODE_CATEGORIES.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-[#252C3A] bg-[#0E111B] text-[#F5F7FA]">
      {/* Header */}
      <div className="p-3 border-b border-[#252C3A]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#929BAE] mb-2">
          Node Palette
        </h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#929BAE]" />
          <Input
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs bg-[#141925]"
          />
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {filteredCategories.map((cat) => (
          <div key={cat.title}>
            <div className="mb-2 text-[10px] font-bold tracking-wider text-[#929BAE]">
              {cat.title}
            </div>
            <div className="space-y-1.5">
              {cat.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, item.type, item.label)}
                    className="group flex cursor-grab active:cursor-grabbing items-center gap-2.5 rounded-lg border border-[#252C3A]/60 bg-[#141925] p-2 hover:border-indigo-500/50 hover:bg-[#1E2538] transition-all select-none"
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${cat.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-[#F5F7FA] group-hover:text-indigo-300">
                        {item.label}
                      </div>
                      <div className="truncate text-[10px] text-[#929BAE]">{item.description}</div>
                    </div>
                    <GripVertical className="h-3.5 w-3.5 text-[#929BAE]/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

