import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  Zap,
  ArrowRight,
  Sparkles,
  Layers,
  Cpu,
  Shield,
  Activity,
  Play,
  CheckCircle2,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#090B12] text-[#F5F7FA] flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Navigation */}
      <header className="border-b border-[#252C3A]/80 bg-[#0E111B]/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/30">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#F5F7FA]">
              FLOW<span className="text-indigo-400">MIND</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="text-xs shadow-md shadow-indigo-600/20">
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-[600px] rounded-full bg-gradient-to-tr from-indigo-600/20 to-violet-600/20 blur-3xl pointer-events-none" />

        <div className="max-w-3xl space-y-6 z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI-Native Visual Automation SaaS</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#F5F7FA] leading-tight">
            Build intelligent workflows with{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              visual AI nodes
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#929BAE] max-w-2xl mx-auto leading-relaxed">
            Automate repetitive operations, customer support ticket triage, invoice extraction, and data routing using a drag-and-drop canvas connected to your workspace integrations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button size="lg" asChild className="w-full sm:w-auto text-sm gap-2">
              <Link href="/login">
                <span>Launch Studio</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto text-sm">
              <Link href="/signup">Create a workspace</Link>
            </Button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 z-10 text-left">
          <div className="rounded-xl border border-[#252C3A] bg-[#141925]/80 p-6 space-y-3 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <GitBranch className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-[#F5F7FA]">Visual React Flow Canvas</h3>
            <p className="text-xs text-[#929BAE] leading-relaxed">
              Drag-and-drop triggers, conditions, AI extraction, and actions with live connection validations and cycle detection.
            </p>
          </div>

          <div className="rounded-xl border border-[#252C3A] bg-[#141925]/80 p-6 space-y-3 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-[#F5F7FA]">Your AI integrations</h3>
            <p className="text-xs text-[#929BAE] leading-relaxed">
              Connect the provider and model that fit your workspace, then use them for extraction, classification, and summarization.
            </p>
          </div>

          <div className="rounded-xl border border-[#252C3A] bg-[#141925]/80 p-6 space-y-3 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Activity className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-[#F5F7FA]">Real-Time Execution Engine</h3>
            <p className="text-xs text-[#929BAE] leading-relaxed">
              Distributed background queues powered by BullMQ, SSRF-protected actions, and live Server-Sent Events monitoring.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#252C3A] bg-[#0E111B] py-6 text-center text-xs text-[#929BAE]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-400" />
            <span className="font-semibold text-[#F5F7FA]">FLOWMIND SaaS Platform</span>
          </div>
          <div>PostgreSQL 17 • Prisma • Next.js 16 • React Flow • BullMQ • Ollama AI</div>
        </div>
      </footer>
    </div>
  );
}
