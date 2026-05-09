import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { requireSchoolAdmin } from "@/lib/rbac";
import { STALE_SCHOOL_SESSION_MESSAGE, sessionSchoolExists } from "@/lib/session-school";
import { normalizeSignatureDataUrl } from "@/lib/signature-images";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";
import { getBranchName, getSharedSchoolName } from "@/lib/branchDisplay";

export async function GET(req: NextRequest) {
    try {
        let session;
        try {
            session = await getServerSession(authOptions);
        } catch (sessionError) {
            console.warn("Session resolution failed for /api/school", sessionError);
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;

        if (!schoolId) {
            return NextResponse.json(
                { error: "No school associated with user" },
                { status: 400 }
            );
        }

        const activeSchool = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                name: true,
                organizationId: true,
                branchCode: true,
                isHeadBranch: true,
                organization: { select: { name: true } },
                motto: true,
                address: true,
                city: true,
                state: true,
                country: true,
                phone: true,
                email: true,
                website: true,
                logoUrl: true,
                principalSignatureUrl: true,
                stampUrl: true,
                allowStudentAdmissionNumberLogin: true,
                allowStudentEmailLogin: true,
            },
        });

        if (!activeSchool) {
            return NextResponse.json(
                { error: STALE_SCHOOL_SESSION_MESSAGE },
                { status: 401 }
            );
        }

        const sharedSchool = activeSchool.organizationId
            ? await prisma.school.findFirst({
                where: { organizationId: activeSchool.organizationId, isHeadBranch: true },
                select: {
                    id: true,
                    name: true,
                    organizationId: true,
                    branchCode: true,
                    isHeadBranch: true,
                    organization: { select: { name: true } },
                    motto: true,
                    address: true,
                    city: true,
                    state: true,
                    country: true,
                    phone: true,
                    email: true,
                    website: true,
                    logoUrl: true,
                    principalSignatureUrl: true,
                    stampUrl: true,
                    allowStudentAdmissionNumberLogin: true,
                    allowStudentEmailLogin: true,
                },
            }) ?? activeSchool
            : activeSchool;

        return NextResponse.json({
            ...sharedSchool,
            id: activeSchool.id,
            name: getSharedSchoolName(activeSchool),
            schoolName: getSharedSchoolName(activeSchool),
            branchName: getBranchName(activeSchool),
            branchCode: activeSchool.branchCode,
            isHeadBranch: activeSchool.isHeadBranch,
        }, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
            },
        });
    } catch (error: any) {
        console.error("Error fetching school:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch school" },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await requireSchoolAdmin(req);

        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const schoolId = (await getActiveSchoolId((session.user as any).schoolId)) as any;

        if (!schoolId) {
            return NextResponse.json(
                { error: "No school associated with user" },
                { status: 400 }
            );
        }

        const schoolExists = await sessionSchoolExists(prisma, schoolId);
        if (!schoolExists) {
            return NextResponse.json(
                { error: STALE_SCHOOL_SESSION_MESSAGE },
                { status: 401 }
            );
        }

        const body = await req.json();
        const {
            name,
            motto,
            address,
            city,
            state,
            phone,
            email,
            website,
            logoUrl,
            principalSignatureUrl,
            allowStudentAdmissionNumberLogin,
            allowStudentEmailLogin,
        } = body;

        const currentSchool = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { organizationId: true },
        });

        const normalizedAllowStudentAdmissionNumberLogin =
            typeof allowStudentAdmissionNumberLogin === "boolean" ? allowStudentAdmissionNumberLogin : true;
        const normalizedAllowStudentEmailLogin =
            typeof allowStudentEmailLogin === "boolean" ? allowStudentEmailLogin : true;

        if (!normalizedAllowStudentAdmissionNumberLogin && !normalizedAllowStudentEmailLogin) {
            return NextResponse.json(
                { error: "Enable at least one student login method." },
                { status: 400 }
            );
        }
        const normalizedPrincipalSignatureUrl =
            typeof principalSignatureUrl === "string" && principalSignatureUrl.startsWith("data:image/")
                ? await normalizeSignatureDataUrl(principalSignatureUrl)
                : principalSignatureUrl;

        const sharedSchoolId = currentSchool?.organizationId
            ? (await prisma.school.findFirst({
                where: { organizationId: currentSchool.organizationId, isHeadBranch: true },
                select: { id: true },
            }))?.id ?? schoolId
            : schoolId;

        await prisma.school.update({
            where: { id: sharedSchoolId },
            data: {
                name,
                motto,
                address,
                city,
                state,
                phone,
                email,
                website,
                logoUrl,
                principalSignatureUrl: normalizedPrincipalSignatureUrl,
                allowStudentAdmissionNumberLogin: normalizedAllowStudentAdmissionNumberLogin,
                allowStudentEmailLogin: normalizedAllowStudentEmailLogin,
            },
        });

        const updatedSchool = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                name: true,
                organizationId: true,
                branchCode: true,
                isHeadBranch: true,
                organization: { select: { name: true } },
                motto: true,
                address: true,
                city: true,
                state: true,
                country: true,
                phone: true,
                email: true,
                website: true,
                logoUrl: true,
                principalSignatureUrl: true,
                stampUrl: true,
                allowStudentAdmissionNumberLogin: true,
                allowStudentEmailLogin: true,
            },
        });

        const sharedUpdatedSchool = updatedSchool?.organizationId
            ? await prisma.school.findFirst({
                where: { organizationId: updatedSchool.organizationId, isHeadBranch: true },
                select: {
                    id: true,
                    name: true,
                    organizationId: true,
                    branchCode: true,
                    isHeadBranch: true,
                    organization: { select: { name: true } },
                    motto: true,
                    address: true,
                    city: true,
                    state: true,
                    country: true,
                    phone: true,
                    email: true,
                    website: true,
                    logoUrl: true,
                    principalSignatureUrl: true,
                    stampUrl: true,
                    allowStudentAdmissionNumberLogin: true,
                    allowStudentEmailLogin: true,
                },
            }) ?? updatedSchool
            : updatedSchool;

        return NextResponse.json(updatedSchool && sharedUpdatedSchool ? {
            ...sharedUpdatedSchool,
            id: updatedSchool.id,
            name: getSharedSchoolName(updatedSchool),
            schoolName: getSharedSchoolName(updatedSchool),
            branchName: getBranchName(updatedSchool),
            branchCode: updatedSchool.branchCode,
            isHeadBranch: updatedSchool.isHeadBranch,
        } : null, {
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
            },
        });
    } catch (error: any) {
        console.error("Error updating school:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update school" },
            { status: 500 }
        );
    }
}

