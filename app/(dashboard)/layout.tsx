import * as React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090B12]">
      {/* Collapsible Left Sidebar */}
      <Sidebar user={{ name: session.name, email: session.email }} />

      {/* Main Content Pane */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={{ name: session.name, email: session.email }} />
        <main className="flex-1 overflow-y-auto p-6 text-[#F5F7FA]">
          {children}
        </main>
      </div>
    </div>
  );
}

