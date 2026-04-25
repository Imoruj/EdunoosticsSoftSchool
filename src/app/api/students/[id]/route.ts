import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import {
  ensureUniqueStudentEmail,
  generateStudentDefaultPassword,
  syncStudentTemporaryLoginCredentials,
} from '@/lib/studentLoginCredentials';

export const dynamic = 'force-dynamic';

function buildPortalUrl(req: NextRequest, slug?: string | null) {
  const origin = new URL(req.url).origin;
  return slug ? `${origin}/s/${slug}/login` : `${origin}/auth/login`;
}

function resolveLoginInstructions(params: {
  allowStudentEmailLogin: boolean;
  allowStudentAdmissionNumberLogin: boolean;
}) {
  const { allowStudentEmailLogin, allowStudentAdmissionNumberLogin } = params;

  if (allowStudentEmailLogin && allowStudentAdmissionNumberLogin) {
    return 'Student can sign in with either the school email address or admission number below.';
  }

  if (allowStudentEmailLogin) {
    return 'Student can sign in with the school email address below.';
  }

  return 'Student can sign in with the admission number below.';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
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
        id: id,
        schoolId,
        ...(!isAdmin ? { classArmId: { in: assignedClassArmIds } } : {}),
      },
      include: {
        classArm: { include: { class: true } },
        user: { select: { email: true, isActive: true, createdAt: true, mustChangePassword: true } },
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true,
        slug: true,
        allowStudentAdmissionNumberLogin: true,
        allowStudentEmailLogin: true,
      },
    });

    const allowStudentEmailLogin = school?.allowStudentEmailLogin ?? true;
    const allowStudentAdmissionNumberLogin = school?.allowStudentAdmissionNumberLogin ?? true;
    let canonicalEmail = allowStudentEmailLogin
      ? await ensureUniqueStudentEmail(prisma, {
          firstName: student.firstName,
          lastName: student.lastName,
          schoolName: school?.name || '',
          excludeUserId: student.userId,
        })
      : null;

    if (school?.name && student.userId && student.user) {
      const syncedCredentials = await syncStudentTemporaryLoginCredentials(prisma, {
        userId: student.userId,
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
        schoolName: school.name,
        mustChangePassword: student.user.mustChangePassword,
        isActive: student.user.isActive,
      });

      canonicalEmail = allowStudentEmailLogin ? syncedCredentials.email : null;
      student.user.email = syncedCredentials.email;
    }

    const defaultPassword = school
      ? generateStudentDefaultPassword({
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          schoolName: school.name,
        })
      : null;

    return NextResponse.json(
      {
        student,
        loginCredentials: {
          portalUrl: buildPortalUrl(req, school?.slug),
          allowStudentEmailLogin,
          allowStudentAdmissionNumberLogin,
          email: allowStudentEmailLogin ? canonicalEmail : null,
          admissionNumber: allowStudentAdmissionNumberLogin ? student.admissionNumber : null,
          defaultPassword,
          defaultPasswordActive: Boolean(student.userId && student.user?.mustChangePassword),
          loginInstructions: resolveLoginInstructions({
            allowStudentEmailLogin,
            allowStudentAdmissionNumberLogin,
          }),
          isProvisioned: Boolean(student.userId),
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  } catch (err) {
    console.error('[API] GET /api/students/[id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
