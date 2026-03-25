"use client";

import { signOut } from "next-auth/react";

export async function handleUnauthorizedApiResponse(response: Response): Promise<boolean> {
    if (response.status !== 401) {
        return false;
    }

    await signOut({ callbackUrl: "/auth/login" });
    return true;
}

export async function readApiError(response: Response, fallbackMessage: string): Promise<string> {
    const payload = await response.clone().json().catch(() => null);
    return typeof payload?.error === "string" ? payload.error : fallbackMessage;
}
