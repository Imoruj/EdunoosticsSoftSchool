import { createRequire } from "node:module";
import type { PrismaClient as PrismaClientType } from "@prisma/client";

const require = createRequire(import.meta.url);
type PrismaModule = typeof import("@prisma/client");
type PrismaClientConstructor = PrismaModule["PrismaClient"];

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientType | undefined;
    prismaSchemaVersion: string | undefined;
};

// Bump this version when schema changes to force a fresh client in dev
const SCHEMA_VERSION = "v6-student-change-requests";

const schemaChanged = globalForPrisma.prismaSchemaVersion !== SCHEMA_VERSION;

if (schemaChanged) {
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaSchemaVersion = SCHEMA_VERSION;
}

function loadPrismaClient(): PrismaClientConstructor {
    if (process.env.NODE_ENV !== "production" && schemaChanged) {
        for (const cacheKey of Object.keys(require.cache)) {
            if (/[\\/]node_modules[\\/](?:\.prisma|@prisma)[\\/]client/.test(cacheKey)) {
                delete require.cache[cacheKey];
            }
        }
    }

    return (require("@prisma/client") as PrismaModule).PrismaClient;
}

const PrismaClient = loadPrismaClient();

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
