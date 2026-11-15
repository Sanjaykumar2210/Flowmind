import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/config/env";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  global.prismaGlobal ||
  new PrismaClient({ log: [] });

if (!env.isProduction) {
  global.prismaGlobal = prisma;
}

export default prisma;

