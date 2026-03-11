import { NextResponse } from "next/server";

/**
 * Return a safe JSON error response.
 * Never exposes raw error.message to clients in production —
 * always log internally and return a generic message.
 */
export function apiError(
    message: string,
    status: number,
    internalError?: unknown,
): NextResponse {
    if (internalError !== undefined) {
        console.error(`[API ${status}] ${message}`, internalError);
    }
    return NextResponse.json({ error: message }, { status });
}

/**
 * Cap an untrusted pagination limit to prevent resource exhaustion.
 */
export function clampLimit(raw: number | string | null | undefined, max = 100): number {
    const parsed = typeof raw === "number" ? raw : parseInt(String(raw ?? "20"), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return 20;
    return Math.min(parsed, max);
}
