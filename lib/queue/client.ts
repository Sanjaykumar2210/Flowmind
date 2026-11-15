import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "@/lib/config/env";

const REDIS_URL = env.redisUrl;

declare global {
  var redisConnectionGlobal: IORedis | undefined;
  var executionQueueGlobal: Queue | undefined;
  var redisOfflineLogged: boolean | undefined;
}

function createRedisConnection(): IORedis {
  const client = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 3000,
    retryStrategy(times) {
      // Backoff gently, do not flood logs
      if (times > 3) {
        if (!global.redisOfflineLogged) {
          console.error("[Queue] Redis is unavailable; queued workflow execution cannot proceed.");
          global.redisOfflineLogged = true;
        }
        return 10000; // Retry every 10s quietly
      }
      return 1000;
    },
  });

  // Attach error handler to prevent unhandled AggregateError crashes
  client.on("error", () => {
    console.error("[Redis Warning] Redis connection failed.");
  });

  client.on("connect", () => {
    global.redisOfflineLogged = false;
    console.log("✅ Redis connected successfully");
  });

  return client;
}

export async function assertRedisAvailable(): Promise<void> {
  const probe = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
    lazyConnect: true,
    retryStrategy: () => null,
  });
  probe.on("error", () => {});

  try {
    await probe.connect();
    await probe.ping();
  } catch {
    throw new Error("Redis is unavailable; workflow execution could not be queued.");
  } finally {
    probe.disconnect();
  }
}

export function getRedisConnection(): IORedis {
  if (!global.redisConnectionGlobal) {
    global.redisConnectionGlobal = createRedisConnection();
  }
  return global.redisConnectionGlobal;
}

export function getExecutionQueue(): Queue {
  if (!global.executionQueueGlobal) {
    const connection = createRedisConnection();
    global.executionQueueGlobal = new Queue("workflow-executions", {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
  }
  return global.executionQueueGlobal;
}

export { REDIS_URL };
