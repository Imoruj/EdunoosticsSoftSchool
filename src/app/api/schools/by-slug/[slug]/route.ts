import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBranchName, getSharedSchoolName, tenantSlugMatchesSchool } from "@/lib/branchDisplay";

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

        const select = {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            primaryColor: true,
            motto: true,
            branchCode: true,
            isHeadBranch: true,
            organization: { select: { name: true, slug: true } },
            allowStudentAdmissionNumberLogin: true,
            allowStudentEmailLogin: true,
        } as const;

        const normalizedSlug = slug.trim().toLowerCase();
        let school = await prisma.school.findFirst({
            where: { slug },
            select,
        }) ?? await prisma.school.findFirst({
            where: {
                OR: [
                    { slug: { startsWith: `${normalizedSlug}-` } },
                    { slug: { contains: `-${normalizedSlug}-` } },
                    { slug: { endsWith: `-${normalizedSlug}` } },
                    { organization: { slug: normalizedSlug } },
                    { organization: { slug: { startsWith: `${normalizedSlug}-` } } },
                ],
                isActive: true,
            },
            select,
            orderBy: [{ isHeadBranch: "desc" }, { name: "asc" }],
        });

        if (!school) {
            const activeSchools = await prisma.school.findMany({
                where: { isActive: true },
                select,
                orderBy: [{ isHeadBranch: "desc" }, { name: "asc" }],
            });
            school = activeSchools.find((candidate) => tenantSlugMatchesSchool(normalizedSlug, candidate)) ?? null;
        }

        if (!school) {
            return NextResponse.json(
                { error: "School not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            ...school,
            name: getSharedSchoolName(school),
            schoolName: getSharedSchoolName(school),
            branchName: getBranchName(school),
        }, {
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
