"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Rocket,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkflowStore } from "@/store/workflow-store";

interface TopToolbarProps {
  onSave: () => Promise<void>;
  onPublish: () => Promise<void>;
  onOpenRunModal: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  isSaving?: boolean;
  isPublishing?: boolean;
}

export function TopToolbar({
  onSave,
  onPublish,
  onOpenRunModal,
  onZoomIn,
  onZoomOut,
  onFitView,
  isSaving,
  isPublishing,
}: TopToolbarProps) {
  const workflowName = useWorkflowStore((s) => s.workflowName);
  const setWorkflowName = useWorkflowStore((s) => s.setWorkflowName);
  const status = useWorkflowStore((s) => s.status);
  const isPublished = useWorkflowStore((s) => s.isPublished);

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameInput, setNameInput] = React.useState(workflowName);
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  React.useEffect(() => {
    setNameInput(workflowName);
  }, [workflowName]);

  const handleSaveName = () => {
    if (nameInput.trim()) {
      setWorkflowName(nameInput.trim());
    }
    setIsEditingName(false);
  };

  const handleSaveClick = async () => {
    await onSave();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-[#252C3A] bg-[#0E111B] px-4 text-[#F5F7FA]">
      {/* Left: Back & Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/workflows"
          className="rounded-lg p-1.5 text-[#929BAE] hover:bg-[#1E2538] hover:text-[#F5F7FA] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="h-4 w-px bg-[#252C3A]" />

        {isEditingName ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              autoFocus
              className="h-7 rounded border border-indigo-500 bg-[#141925] px-2 text-sm font-semibold text-[#F5F7FA] focus:outline-none"
            />
            <button
              onClick={handleSaveName}
              className="rounded p-1 text-emerald-400 hover:bg-[#1E2538]"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1
              onClick={() => setIsEditingName(true)}
              className="cursor-pointer text-sm font-semibold text-[#F5F7FA] hover:text-indigo-300 transition-colors"
              title="Click to rename"
            >
              {workflowName}
            </h1>
            <Badge
              variant={
                isPublished
                  ? "success"
                  : status === "ACTIVE"
                  ? "default"
                  : "secondary"
              }
            >
              {isPublished ? "PUBLISHED" : status}
            </Badge>
          </div>
        )}
      </div>

      {/* Center: Canvas Controls */}
      <div className="hidden md:flex items-center gap-1 rounded-lg border border-[#252C3A] bg-[#141925] p-0.5">
        {onZoomIn && (
          <button
            onClick={onZoomIn}
            className="rounded p-1.5 text-[#929BAE] hover:bg-[#1E2538] hover:text-[#F5F7FA]"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        )}
        {onZoomOut && (
          <button
            onClick={onZoomOut}
            className="rounded p-1.5 text-[#929BAE] hover:bg-[#1E2538] hover:text-[#F5F7FA]"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
        )}
        {onFitView && (
          <button
            onClick={onFitView}
            className="rounded p-1.5 text-[#929BAE] hover:bg-[#1E2538] hover:text-[#F5F7FA]"
            title="Fit View"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSaveClick}
          isLoading={isSaving}
          className="gap-1.5 text-xs"
        >
          {savedSuccess ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-3.5 w-3.5" />
              Save Draft
            </>
          )}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onPublish}
          isLoading={isPublishing}
          className="gap-1.5 text-xs text-indigo-300 hover:text-white"
        >
          <Rocket className="h-3.5 w-3.5 text-indigo-400" />
          Publish
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={onOpenRunModal}
          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          Run Workflow
        </Button>
      </div>
    </header>
  );
}

