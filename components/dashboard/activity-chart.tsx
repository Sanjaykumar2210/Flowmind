"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ActivityChartProps {
  data: Array<{
    date: string;
    completed: number;
    failed: number;
  }>;
}

export function ActivityChart({ data }: ActivityChartProps) {
  // Format dates for display (e.g. "Nov 14")
  const chartData = data.map((d) => {
    const parts = d.date.split("-");
    const label = parts.length === 3 ? `${parts[1]}/${parts[2]}` : d.date;
    return {
      ...d,
      displayDate: label,
    };
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#252C3A" vertical={false} />
          <XAxis
            dataKey="displayDate"
            stroke="#929BAE"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#929BAE"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#141925",
              borderColor: "#252C3A",
              borderRadius: "8px",
              color: "#F5F7FA",
              fontSize: "12px",
            }}
          />
          <Area
            type="monotone"
            dataKey="completed"
            name="Completed"
            stroke="#10B981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#completedGrad)"
          />
          <Area
            type="monotone"
            dataKey="failed"
            name="Failed"
            stroke="#EF4444"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#failedGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

