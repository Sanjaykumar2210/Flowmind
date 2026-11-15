"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Search,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Header({ user }: { user?: { name: string; email: string } }) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="flex h-14 w-full items-center justify-between border-b border-[#252C3A] bg-[#0E111B]/80 px-6 backdrop-blur-md">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-[#929BAE]">
        <Link href="/dashboard" className="hover:text-[#F5F7FA] transition-colors">
          Flowmind
        </Link>
        {segments.map((seg, idx) => {
          const href = `/${segments.slice(0, idx + 1).join("/")}`;
          const isLast = idx === segments.length - 1;
          const formatted = seg.charAt(0).toUpperCase() + seg.slice(1);

          return (
            <React.Fragment key={href}>
              <ChevronRight className="h-3 w-3 text-[#929BAE]/50" />
              {isLast ? (
                <span className="font-medium text-[#F5F7FA]">{formatted}</span>
              ) : (
                <Link href={href} className="hover:text-[#F5F7FA] transition-colors">
                  {formatted}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Workspace Badge */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[#252C3A] bg-[#141925] px-2.5 py-1 text-xs text-[#929BAE]">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[#F5F7FA] font-medium">Primary Workspace</span>
        </div>

        {/* Notifications */}
        <button
          className="relative rounded-lg p-2 text-[#929BAE] hover:bg-[#1E2538] hover:text-[#F5F7FA] transition-colors"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500" />
        </button>

        {/* User Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-xs font-bold text-white shadow-sm">
          {user?.name?.[0]?.toUpperCase() || "A"}
        </div>
      </div>
    </header>
  );
}

