import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as any;
    const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
    const schoolId = typeof user.schoolId === 'string' ? user.schoolId : null;
    const userId = typeof user.id === 'string' ? user.id : '';
    const isAdmin =
      roles.includes(UserRole.SUPER_ADMIN) || roles.includes(UserRole.SCHOOL_ADMIN);
    const isClassTeacher = roles.includes(UserRole.CLASS_TEACHER);

    if (!schoolId || (!isAdmin && !isClassTeacher)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let assignedClassArmIds: string[] = [];
    if (!isAdmin) {
      const assignedArms = await prisma.classArm.findMany({
        where: { classTeacherId: userId, class: { schoolId } },
        select: { id: true },
      });
      assignedClassArmIds = assignedArms.map((arm) => arm.id);
    }

    const student = await prisma.student.findFirst({
      where: {
        id: params.id,
        schoolId,
        ...(!isAdmin ? { classArmId: { in: assignedClassArmIds } } : {}),
      },
      include: {
        classArm: { include: { class: true } },
        user: { select: { email: true, isActive: true, createdAt: true } },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (err) {
    console.error('[API] GET /api/students/[id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
