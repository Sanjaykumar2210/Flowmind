import * as React from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: string;
  trendPositive?: boolean;
  accentColor?: "indigo" | "emerald" | "amber" | "rose";
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendPositive,
  accentColor = "indigo",
}: StatsCardProps) {
  const colorMap = {
    indigo: "border-indigo-500/20 text-indigo-400 bg-indigo-500/10",
    emerald: "border-emerald-500/20 text-emerald-400 bg-emerald-500/10",
    amber: "border-amber-500/20 text-amber-400 bg-amber-500/10",
    rose: "border-rose-500/20 text-rose-400 bg-rose-500/10",
  };

  return (
    <Card className="hover:border-[#3B4459] transition-all">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[#929BAE]">{title}</p>
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", colorMap[accentColor])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-[#F5F7FA]">{value}</span>
          {trend && (
            <span
              className={cn(
                "text-xs font-semibold",
                trendPositive ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {trend}
            </span>
          )}
        </div>

        {description && (
          <p className="mt-1 text-[11px] text-[#929BAE]">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

