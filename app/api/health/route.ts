import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import IORedis from "ioredis";
import { env } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();

  // Check database
  let database: "ok" | "error" = "error";
  let dbMessage: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "ok";
  } catch {
    dbMessage = "Database connection failed.";
  }

  // Check Redis
  let redis: "ok" | "error" = "error";
  let redisMessage: string | undefined;
  let redisClient: IORedis | null = null;
  try {
    redisClient = new IORedis(env.redisUrl, {
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    redisClient.on("error", () => {});
    await redisClient.connect();
    await redisClient.ping();
    redis = "ok";
  } catch {
    redisMessage = "Redis connection failed.";
  } finally {
    if (redisClient) {
      try {
        redisClient.disconnect();
      } catch {
        // ignore disconnect errors
      }
    }
  }

  const overallStatus = database === "ok" && redis === "ok" ? "healthy" : "degraded";

  return NextResponse.json(
    {
      status: overallStatus,
      database,
      dbMessage,
      redis,
      redisMessage,
      timestamp,
    },
    { status: 200 }
  );
}
