import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import ScoreReviewDesk from "@/components/scores/ScoreReviewDesk";

interface ReviewTermOption {
    id: string;
    label: string;
    isCurrent: boolean;
}

interface ReviewClassArmOption {
    id: string;
    label: string;
}

interface ReviewAssessmentType {
    id: string;
    name: string;
    maxScore: number;
    order: number;
}

export default async function ScoreReviewsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect("/auth/login");
    }

    const user = session.user as any;
    const userId = typeof user.id === "string" ? user.id : "";
    const schoolId = typeof user.schoolId === "string" ? user.schoolId : null;
    const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("SCHOOL_ADMIN");
    const isClassTeacher = roles.includes("CLASS_TEACHER");

    if (!schoolId) {
        redirect("/auth/login");
    }

    if (!isAdmin && !isClassTeacher) {
        redirect("/dashboard");
    }

    const [currentSession, latestSession, dbClassArms, dbAssessmentTypes] = await Promise.all([
        prisma.academicSession.findFirst({
            where: { schoolId, isCurrent: true },
            include: {
                terms: {
                    orderBy: { termNumber: "asc" },
                    select: {
                        id: true,
                        name: true,
                        isCurrent: true,
                    },
                },
            },
        }),
        prisma.academicSession.findFirst({
            where: { schoolId },
            include: {
                terms: {
                    orderBy: { termNumber: "asc" },
                    select: {
                        id: true,
                        name: true,
                        isCurrent: true,
                    },
                },
            },
            orderBy: { startDate: "desc" },
        }),
        prisma.classArm.findMany({
            where: isAdmin
                ? { class: { schoolId } }
                : {
                    class: { schoolId },
                    classTeacherId: userId,
                },
            select: {
                id: true,
                armName: true,
                class: { select: { name: true } },
            },
            orderBy: [{ class: { name: "asc" } }, { armName: "asc" }],
        }),
        prisma.assessmentType.findMany({
            where: { schoolId, isActive: true },
            select: {
                id: true,
                name: true,
                maxScore: true,
                order: true,
            },
            orderBy: { order: "asc" },
        }),
    ]);

    const assignedSession = currentSession || latestSession;

    const terms: ReviewTermOption[] = (assignedSession?.terms || []).map((term) => ({
            id: term.id,
            label: `${assignedSession?.name || ""} - ${term.name}`,
            isCurrent: !!term.isCurrent,
        }));

    const defaultTerm = terms.find((term) => term.isCurrent) || terms[0] || null;

    const classArms: ReviewClassArmOption[] = dbClassArms.map((arm) => ({
        id: arm.id,
        label: `${arm.class.name} ${arm.armName}`,
    }));

    const assessmentTypes: ReviewAssessmentType[] = dbAssessmentTypes.map((item) => ({
        id: item.id,
        name: item.name,
        maxScore: item.maxScore,
        order: item.order,
    }));

    return (
        <ScoreReviewDesk
            terms={terms}
            classArms={classArms}
            defaultTermId={defaultTerm?.id || null}
            assessmentTypes={assessmentTypes}
        />
    );
}
