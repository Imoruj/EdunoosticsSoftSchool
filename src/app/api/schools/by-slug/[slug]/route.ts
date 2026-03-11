import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
    req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        const { slug } = params;

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
            },
        });

        if (!school) {
            return NextResponse.json(
                { error: "School not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(school);
    } catch (error: any) {
        console.error("Error fetching school branding by slug:", error);
        return NextResponse.json(
            { error: "Failed to fetch school branding" },
            { status: 500 }
        );
    }
}
