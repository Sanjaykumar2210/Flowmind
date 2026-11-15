"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  GitFork,
  Activity,
  Layers,
  Sparkles,
  Plug,
  Clock,
  Webhook,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAVIGATION: NavGroup[] = [
  {
    group: "MAIN",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Workflows", href: "/workflows", icon: GitFork },
      { label: "Executions", href: "/executions", icon: Activity },
      { label: "Templates", href: "/templates", icon: Layers },
    ],
  },
  {
    group: "AUTOMATION",
    items: [
      { label: "Integrations", href: "/integrations", icon: Plug },
      { label: "Schedules", href: "/schedules", icon: Clock },
      { label: "Webhooks", href: "/webhooks", icon: Webhook },
    ],
  },
  {
    group: "SETTINGS",
    items: [
      { label: "AI Configuration", href: "/settings/ai", icon: Sparkles },
      { label: "Account Settings", href: "/settings/account", icon: User },
      { label: "Workspace", href: "/settings/workspace", icon: Settings },
    ],
  },
];

export function Sidebar({ user }: { user?: { name: string; email: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-[#252C3A] bg-[#0E111B] transition-all duration-300 select-none z-30 shrink-0",
        isCollapsed ? "w-[4.5rem]" : "w-60"
      )}
    >
      {/* Brand Header */}
      <div className={cn(
        "flex h-14 items-center border-b border-[#252C3A]",
        isCollapsed ? "justify-between px-1.5" : "justify-between px-3.5"
      )}>
        <Link href="/dashboard" title={isCollapsed ? "Flowmind" : undefined} aria-label="Flowmind dashboard" className="flex shrink-0 items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-600/30">
            <Zap className="h-4 w-4 fill-current" />
          </div>
          {!isCollapsed && (
            <span className="font-bold tracking-tight text-[#F5F7FA] text-base">
              FLOW<span className="text-indigo-400">MIND</span>
            </span>
          )}
        </Link>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#929BAE] hover:bg-[#1E2538] hover:text-[#F5F7FA] transition-colors"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav Groups */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAVIGATION.map((group) => (
          <div key={group.group}>
            {!isCollapsed && (
              <div className="px-2.5 mb-1.5 text-[10px] font-bold tracking-wider text-[#929BAE]/70 uppercase">
                {group.group}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                      isActive
                        ? "bg-indigo-600/15 text-indigo-400 font-semibold"
                        : "text-[#929BAE] hover:bg-[#141925] hover:text-[#F5F7FA]"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-indigo-400" : "text-[#929BAE]")} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User & Logout */}
      <div className="border-t border-[#252C3A] p-2">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-lg p-2 bg-[#141925]/60 border border-[#252C3A]/40",
            isCollapsed && "flex-col justify-center gap-1.5 p-1.5"
          )}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 text-xs font-bold text-white">
            {user?.name?.[0]?.toUpperCase() || "A"}
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-[#F5F7FA]">{user?.name || "Admin"}</div>
              <div className="truncate text-[10px] text-[#929BAE]">{user?.email || "admin@flowmind.ai"}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-[#929BAE] hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

