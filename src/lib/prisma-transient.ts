type PrismaLikeError = {
    code?: string;
    message?: string;
};

const TRANSIENT_PRISMA_CODES = new Set([
    "P1001",
    "P1017",
    "P2024",
    "P2028",
]);

export function isTransientPrismaError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
        return false;
    }

    const prismaError = error as PrismaLikeError;
    if (typeof prismaError.code === "string" && TRANSIENT_PRISMA_CODES.has(prismaError.code)) {
        return true;
    }

    const message = (prismaError.message || "").toLowerCase();
    return (
        message.includes("can't reach database server") ||
        message.includes("server has closed the connection") ||
        message.includes("timed out fetching a new connection from the connection pool") ||
        message.includes("transaction not found")
    );
}

export async function withPrismaRetry<T>(
    label: string,
    operation: () => Promise<T>,
    retries = 2
): Promise<T> {
    let attempt = 0;

    while (true) {
        try {
            return await operation();
        } catch (error) {
            if (!isTransientPrismaError(error) || attempt >= retries) {
                throw error;
            }

            attempt += 1;
            const delayMs = attempt * 250;

            console.warn(
                `Transient Prisma error in ${label}. Retrying ${attempt} of ${retries}...`,
                error
            );

            await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
    }
}
