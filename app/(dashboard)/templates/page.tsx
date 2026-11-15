import * as React from "react";
import { Layers, Sparkles, ArrowRight, Shield, Zap } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { TemplateUseButton } from "./template-use-button";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  await requireAuth();

  const templates = await prisma.workflowTemplate.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const categories = Array.from(new Set(templates.map((t) => t.category)));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#F5F7FA]">Starter Templates</h1>
        <p className="text-xs text-[#929BAE] mt-0.5">
          Pre-built production workflows with AI nodes, triggers, branching logic and actions.
        </p>
      </div>

      {/* Templates by Category */}
      {categories.map((category) => {
        const categoryTemplates = templates.filter((t) => t.category === category);
        return (
          <div key={category} className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              {category}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryTemplates.map((template) => {
                const nodeCount = (template.definition as any)?.nodes?.length || 0;
                return (
                  <Card
                    key={template.id}
                    className="flex flex-col justify-between hover:border-indigo-500/50 hover:bg-[#141925] transition-all group"
                  >
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="default">{template.category}</Badge>
                        <span className="text-[10px] text-[#929BAE] font-medium">
                          {template.difficulty}
                        </span>
                      </div>
                      <CardTitle className="text-sm font-semibold text-[#F5F7FA] group-hover:text-indigo-300 transition-colors">
                        {template.name}
                      </CardTitle>
                      <CardDescription className="text-xs line-clamp-3 mt-1">
                        {template.description}
                      </CardDescription>
                    </CardHeader>

                    <CardFooter className="p-5 pt-3 border-t border-[#252C3A]/60 flex items-center justify-between">
                      <span className="text-[10px] text-[#929BAE] font-mono">
                        {nodeCount} nodes configured
                      </span>
                      <TemplateUseButton templateId={template.id} />
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

