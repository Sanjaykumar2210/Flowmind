import * as React from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "./button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionHref?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  actionHref,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#252C3A] bg-[#141925]/40 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 mb-4">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold text-[#F5F7FA] mb-1">{title}</h3>
      <p className="text-sm text-[#929BAE] max-w-sm mb-6">{description}</p>
      {actionText && (
        actionHref ? (
          <Button asChild>
            <a href={actionHref}>{actionText}</a>
          </Button>
        ) : (
          <Button onClick={onAction}>{actionText}</Button>
        )
      )}
    </div>
  );
}

