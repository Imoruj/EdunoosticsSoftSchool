import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    try {

        if (!slug) {
            return NextResponse.json(
                { error: "Slug is required" },
                { status: 400 }
            );
        }

        const school = await prisma.school.findFirst({
            where: { slug },
            select: {
                id: true,
                name: true,
                logoUrl: true,
                primaryColor: true,
                motto: true,
                allowStudentAdmissionNumberLogin: true,
                allowStudentEmailLogin: true,
            },
        });

        if (!school) {
            return NextResponse.json(
                { error: "School not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(school, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
            },
        });
    } catch (error: any) {
        console.error("Error fetching school branding by slug:", error);
        return NextResponse.json(
            { error: "Failed to fetch school branding" },
            { status: 500 }
        );
    }
}
