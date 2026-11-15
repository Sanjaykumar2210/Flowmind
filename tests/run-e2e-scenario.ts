import { prisma } from "../lib/db";
import { executeWorkflow } from "../lib/engine/runner";

async function runScenario() {
  console.log("🚀 Starting End-to-End Scenario: AI-Powered Customer Support Automation");

  // 1. Fetch published workflow
  const workflow = await prisma.workflow.findFirst({
    where: { isPublished: true },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
    },
  });

  if (!workflow || !workflow.versions[0]) {
    throw new Error("No published workflow found");
  }

  console.log(`📋 Found workflow: "${workflow.name}" (ID: ${workflow.id})`);

  // 2. Create Execution with real customer support input
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: workflow.id,
      workflowVersionId: workflow.versions[0].id,
      workspaceId: workflow.workspaceId,
      status: "QUEUED",
      triggerSource: "MANUAL",
      triggerPayload: {
        ticketId: "TCK-8921",
        customerEmail: "sarah.connor@example.com",
        message: "We need an urgent password reset. Our production deployment is completely locked down!",
        department: "Infrastructure",
      },
    },
  });

  console.log(`⚡ Execution queued: ${execution.id}`);

  // 3. Execute through the real engine
  await executeWorkflow(execution.id);

  // 4. Verify results
  const finished = await prisma.workflowExecution.findUnique({
    where: { id: execution.id },
    include: {
      nodeExecutions: {
        orderBy: { startedAt: "asc" },
      },
      logs: {
        orderBy: { timestamp: "asc" },
      },
    },
  });

  if (!finished) throw new Error("Execution not found");

  console.log("\n================ EXECUTION REPORT ================");
  console.log(`Status: ${finished.status}`);
  console.log(`Total Duration: ${finished.durationMs}ms`);
  console.log(`Nodes Processed: ${finished.nodeExecutions.length}`);

  for (const n of finished.nodeExecutions) {
    console.log(`\n▶ Node: "${n.nodeName}" (${n.nodeType})`);
    console.log(`  Status: ${n.status} (${n.durationMs}ms)`);
    if (n.outputData) {
      console.log(`  Output:`, JSON.stringify(n.outputData, null, 2));
    }
    if (n.errorMessage) {
      console.log(`  Error: ${n.errorMessage}`);
    }
  }

  console.log("\nLogs Summary:");
  for (const log of finished.logs) {
    console.log(`  [${log.level}] ${log.message}`);
  }
}

runScenario()
  .catch((err) => {
    console.error("❌ Scenario Failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

