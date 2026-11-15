import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { loadEnvironment } from "../lib/config/load-env";

loadEnvironment();

// Worker runs in a separate process from Next.js
// Start with: npm run worker

async function main() {
  const { env } = await import("../lib/config/env");
  console.log("🔧 Flowmind Worker starting...");

  // Test Redis connection
  const redisConnection = new IORedis(env.redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    connectTimeout: 3000,
    lazyConnect: true,
    retryStrategy: () => null,
  });

  redisConnection.on("connect", () => console.log("✅ Redis connected"));
  redisConnection.on("error", () => console.error("❌ Redis connection failed"));
  await redisConnection.connect();
  await redisConnection.ping();

  // Lazy import engine to avoid loading Next.js internals
  const { executeWorkflow } = await import("../lib/engine/runner");

  const worker = new Worker(
    "workflow-executions",
    async (job: Job) => {
      const { executionId } = job.data;
      console.log(`⚡ Processing execution: ${executionId} (attempt ${job.attemptsMade + 1})`);

      await executeWorkflow(executionId);

      console.log(`✅ Execution completed: ${executionId}`);
    },
    {
      connection: new IORedis(env.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      }),
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on("failed", (job) => {
    console.error(`❌ Job ${job?.id} failed.`);
  });

  worker.on("error", () => {
    console.error("Worker error: Redis worker connection failed.");
  });

  console.log("🚀 Flowmind Worker ready. Listening for execution jobs...");

  // Handle graceful shutdown
  const shutdown = async () => {
    console.log("\n⏳ Shutting down worker...");
    await worker.close();
    await redisConnection.quit();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((error: unknown) => {
  const configurationError = error instanceof Error && /^(Missing required environment variable [A-Z0-9_]+|JWT_SECRET must|ENCRYPTION_KEY must|APP_URL must|PORT must)/.test(error.message);
  if (configurationError && error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Fatal worker error. Check required configuration and Redis availability.");
  }
  process.exit(1);
});

