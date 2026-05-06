import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getActiveSchoolId } from "@/lib/getActiveSchoolId";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined) {
    if (!value) return "N/A";
    return new Date(value).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function InfoCard({
    title,
    items,
}: {
    title: string;
    items: Array<{ label: string; value: string }>;
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
            <dl className="space-y-4">
                {items.map((item) => (
                    <div key={item.label} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                        <dt className="text-sm text-gray-500">{item.label}</dt>
                        <dd className="text-sm font-medium text-gray-900 sm:text-right">{item.value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

export default async function StudentDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        redirect("/auth/login");
    }

    const user = session.user as any;
    const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
    const schoolId = (await getActiveSchoolId(user.schoolId)) as any;
    const userId = typeof user.id === "string" ? user.id : "";
    const isAdmin =
        roles.includes(UserRole.SUPER_ADMIN) ||
        roles.includes(UserRole.SCHOOL_ADMIN);
    const isClassTeacher = roles.includes(UserRole.CLASS_TEACHER);

    if (!schoolId || (!isAdmin && !isClassTeacher)) {
        redirect("/dashboard");
    }

    let assignedClassArmIds: string[] = [];
    if (!isAdmin) {
        const assignedArms = await prisma.classArm.findMany({
            where: {
                classTeacherId: userId,
                class: { schoolId },
            },
            select: { id: true },
        });
        assignedClassArmIds = assignedArms.map((arm) => arm.id);
    }

    const student = await prisma.student.findFirst({
        where: {
            id,
            schoolId,
            ...(!isAdmin ? { classArmId: { in: assignedClassArmIds } } : {}),
        },
        include: {
            classArm: {
                include: {
                    class: true,
                },
            },
            user: {
                select: {
                    email: true,
                    isActive: true,
                    createdAt: true,
                },
            },
        },
    });

    if (!student) {
        notFound();
    }

    const studentName = `${student.firstName} ${student.lastName}`.trim();
    const classLabel = student.classArm
        ? `${student.classArm.class.name} ${student.classArm.armName}`.trim()
        : "Not assigned";

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <Link href="/dashboard/students" className="text-sm text-primary-600 hover:text-primary-700">
                        Back to Students
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900 mt-2">{studentName}</h1>
                    <p className="text-sm text-gray-500 mt-1">{student.admissionNumber}</p>
                </div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    student.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                }`}>
                    {student.isActive ? "Active" : "Inactive"}
                </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <div className="flex flex-col items-center text-center">
                        <div className={`w-28 h-28 rounded-full overflow-hidden flex items-center justify-center text-white text-3xl font-semibold ${
                            student.gender === "FEMALE" ? "bg-pink-500" : "bg-blue-500"
                        }`}>
                            {student.photoUrl ? (
                                <img src={student.photoUrl} alt={studentName} className="w-full h-full object-cover" />
                            ) : (
                                <span>{student.firstName[0]}{student.lastName[0]}</span>
                            )}
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 mt-4">{studentName}</h2>
                        <p className="text-sm text-gray-500">{classLabel}</p>
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Gender</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">
                                {student.gender === "FEMALE" ? "Female" : "Male"}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Date Of Birth</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(student.dateOfBirth)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Student Account</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{student.user?.email || "No login account"}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">Admission Date</p>
                            <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(student.admissionDate)}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <InfoCard
                        title="Student Information"
                        items={[
                            { label: "Admission Number", value: student.admissionNumber },
                            { label: "Class", value: classLabel },
                            { label: "Other Names", value: student.otherNames || "N/A" },
                            { label: "State Of Origin", value: student.stateOfOrigin || "N/A" },
                            { label: "Address", value: student.address || "N/A" },
                        ]}
                    />

                    <InfoCard
                        title="Parent / Guardian"
                        items={[
                            { label: "Parent Name", value: student.parentName || "N/A" },
                            { label: "Phone Number", value: student.parentPhone || "N/A" },
                            { label: "Email Address", value: student.parentEmail || "N/A" },
                            {
                                label: "Account Status",
                                value: student.user?.isActive ? "Active" : "Inactive",
                            },
                            {
                                label: "Student Account Created",
                                value: formatDate(student.user?.createdAt),
                            },
                        ]}
                    />
                </div>
            </div>
        </div>
    );
}
