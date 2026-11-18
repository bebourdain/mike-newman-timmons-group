import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaNeon } from "@prisma/adapter-neon";

declare global {
  var cachedPrisma: PrismaClient | undefined;
  var cachedPrismaSchemaVersion: string | undefined;
}

// Prisma Client configuration with connection pooling and lifecycle management
const prismaClientSingleton = () => {
  const connectionString = `${process.env.DATABASE_URL}`;
  const isNeon = new URL(connectionString).hostname.endsWith(".neon.tech");
  const adapter = isNeon
    ? new PrismaNeon({ connectionString })
    : new PrismaPg(new Pool({ connectionString }));

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  // Ensure graceful shutdown on hot reload in development
  if (process.env.NODE_ENV !== "production") {
    // Clean up on process termination
    const cleanup = async () => {
      await client.$disconnect();
    };

    process.on("beforeExit", cleanup);
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);
  }

  return client;
};

let prisma: PrismaClient;

if (process.env.NODE_ENV === "production") {
  prisma = prismaClientSingleton();
} else {
  // Refresh the development singleton after scanner schema changes.
  const schemaVersion = "scanner-pull-status-v1";
  if (!global.cachedPrisma || global.cachedPrismaSchemaVersion !== schemaVersion) {
    if (global.cachedPrisma) void global.cachedPrisma.$disconnect();
    global.cachedPrisma = prismaClientSingleton();
    global.cachedPrismaSchemaVersion = schemaVersion;
  }
  prisma = global.cachedPrisma;
}

export const prismadb = prisma;
