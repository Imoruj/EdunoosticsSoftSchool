import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    prismaDirect: PrismaClient | undefined;
    prismaSchemaVersion: string | undefined;
};

// Bump this version when schema changes to force a fresh client in dev.
const SCHEMA_VERSION = "v16-role-permission-controls";

function createPrismaClient(url?: string) {
    return new PrismaClient({
        ...(url
            ? {
                datasources: {
                    db: { url },
                },
            }
            : {}),
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
}

const directDatabaseUrl = process.env.DIRECT_DATABASE_URL?.trim();

if (globalForPrisma.prismaSchemaVersion !== SCHEMA_VERSION) {
    void globalForPrisma.prisma?.$disconnect().catch(() => undefined);
    void globalForPrisma.prismaDirect?.$disconnect().catch(() => undefined);
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaDirect = undefined;
    globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION;
}

export const prisma =
    globalForPrisma.prisma ??
    createPrismaClient();

export const prismaDirect =
    !directDatabaseUrl || directDatabaseUrl === process.env.DATABASE_URL
        ? prisma
        : globalForPrisma.prismaDirect ?? createPrismaClient(directDatabaseUrl);

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
    globalForPrisma.prismaDirect = prismaDirect;
}
