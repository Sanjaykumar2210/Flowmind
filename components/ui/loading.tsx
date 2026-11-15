import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingSpinner({ className, text }: { className?: string; text?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 space-y-3", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      {text && <p className="text-sm text-[#929BAE]">{text}</p>}
    </div>
  );
}

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-[#1E2538]/80", className)}
      {...props}
    />
  );
}

