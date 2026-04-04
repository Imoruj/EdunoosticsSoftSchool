import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getSafeServerSession(routeLabel: string): Promise<Session | null> {
    try {
        return await getServerSession(authOptions);
    } catch (error) {
        console.warn(`Session resolution failed for ${routeLabel}`, error);
        return null;
    }
}
