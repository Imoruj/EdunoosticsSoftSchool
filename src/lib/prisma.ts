import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    prismaSchemaVersion: string | undefined;
};

// Bump this version when schema changes to force a fresh client in dev
const SCHEMA_VERSION = "v2-broadsheet";

if (globalForPrisma.prismaSchemaVersion !== SCHEMA_VERSION) {
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION;
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
