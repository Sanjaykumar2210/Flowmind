import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { WorkflowEditor } from "@/components/workflow-editor/editor";

export const dynamic = "force-dynamic";

export default async function WorkflowEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth().catch(() => null);
  if (!session) redirect("/login");

  const { id } = await params;

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!workflow) notFound();
  if (workflow.workspaceId !== session.workspaceId) redirect("/workflows");

  const latestVersion = workflow.versions[0];
  const definition = (latestVersion?.definition as any) || { nodes: [], edges: [] };

  return (
    <WorkflowEditor
      initialWorkflow={{
        id: workflow.id,
        name: workflow.name,
        description: workflow.description || "",
        status: workflow.status,
        isPublished: workflow.isPublished,
        definition,
      }}
    />
  );
}

