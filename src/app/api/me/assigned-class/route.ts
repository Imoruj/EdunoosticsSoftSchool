import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ assignedClass: null }, { status: 401 });
    }

    const user = session.user as any;
    const schoolId = await getActiveSchoolId(user.schoolId);
    if (!schoolId) {
        return NextResponse.json({ assignedClass: null });
    }

    // If the active branch is the primary branch, the JWT value is already correct
    if (schoolId === user.schoolId) {
        return NextResponse.json({ assignedClass: user.assignedClass ?? null });
    }

    // For a non-primary branch, query the teacher's class arm assignment in that school
    try {
        const classArm = await prisma.classArm.findFirst({
            where: {
                class: { schoolId },
                classTeacherId: user.id,
            },
            include: { class: { select: { name: true } } },
        });

        const assignedClass = classArm
            ? `${classArm.class.name} ${classArm.armName}`
            : null;

        return NextResponse.json({ assignedClass });
    } catch {
        return NextResponse.json({ assignedClass: null });
    }
}
