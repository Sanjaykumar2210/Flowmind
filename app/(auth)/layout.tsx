import * as React from "react";
import Link from "next/link";
import { Zap, Sparkles, CheckCircle2 } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-screen bg-[#090B12] text-[#F5F7FA]">
      {/* Left Marketing Hero Pane */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-[#252C3A] bg-[#0E111B] p-12 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/30">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#F5F7FA]">
            FLOW<span className="text-indigo-400">MIND</span>
          </span>
        </Link>

        {/* Highlights */}
        <div className="space-y-6 z-10 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-Native Automation SaaS</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-[#F5F7FA] leading-tight">
            Automate mission-critical business workflows without writing code.
          </h2>

          <div className="space-y-3 text-sm text-[#929BAE]">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Full-screen visual builder powered by React Flow</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Workflow automation with your configured AI provider</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Live real-time node monitoring with Server-Sent Events</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Enterprise-grade SSRF protection and audit logging</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-[#929BAE]/60 z-10">
          © 2026 Flowmind Automation Inc. All rights reserved.
        </div>
      </div>

      {/* Right Form Pane */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

