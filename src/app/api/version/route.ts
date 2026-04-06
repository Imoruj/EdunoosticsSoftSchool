import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    return NextResponse.json({
        commitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
        commitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
        deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,
        environment: process.env.VERCEL_ENV || null,
    });
}
