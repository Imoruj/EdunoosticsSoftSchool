import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";

export default async function WardDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/auth/login");
    }

    const loginType = (session.user as any).loginType;
    if (loginType !== "parent") {
        redirect("/dashboard");
    }

    // Authorization: Ensure this parent is linked to this student
    const parent = await prisma.parent.findUnique({
        where: { userId: (session.user as any).id },
        include: {
            students: {
                where: { id }
            }
        }
    });

    if (!parent || parent.students.length === 0) {
        notFound();
    }

    const student = await prisma.student.findUnique({
        where: { id },
        include: {
            classArm: {
                include: {
                    class: true
                }
            },
            school: true,
            attendance: {
                take: 5,
                orderBy: { date: 'desc' }
            },
            reportCards: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                where: { isPublished: true },
                include: {
                    term: {
                        include: {
                            session: true
                        }
                    }
                }
            }
        }
    });

    if (!student) {
        notFound();
    }

    // Calculate attendance percentage
    const totalAttendance = await prisma.attendance.count({
        where: { studentId: student.id }
    });
    const presentCount = await prisma.attendance.count({
        where: {
            studentId: student.id,
            status: 'PRESENT'
        }
    });
    const attendancePercentage = totalAttendance > 0
        ? Math.round((presentCount / totalAttendance) * 100)
        : null;

    return (
        <div className="space-y-8">
            {/* Header / Profile Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-32 bg-primary-600"></div>
                <div className="px-8 pb-8">
                    <div className="relative flex flex-col items-center sm:items-start sm:flex-row gap-6 -mt-12">
                        <div className="w-32 h-32 bg-white rounded-2xl p-1 shadow-lg ring-4 ring-white">
                            <div className="w-full h-full bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 font-bold text-3xl">
                                {student.firstName[0]}{student.lastName[0]}
                            </div>
                        </div>
                        <div className="mt-4 sm:mt-14 flex-1 text-center sm:text-left">
                            <h1 className="text-2xl font-bold text-gray-900">{student.firstName} {student.lastName}</h1>
                            <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-2">
                                <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-primary-50 text-table-primary text-xs font-medium border border-primary-100">
                                    {student.classArm ? `${student.classArm.class.name} (${student.classArm.armName})` : 'Not Assigned'}
                                </span>
                                <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-gray-50 text-gray-600 text-xs font-medium border border-gray-100">
                                    ID: {student.admissionNumber}
                                </span>
                            </div>
                        </div>
                        <div className="mt-8 sm:mt-14 flex gap-3">
                            <Link
                                href={`/dashboard/reports?studentId=${student.id}`}
                                className="btn-primary py-2 px-6 text-sm"
                            >
                                Full Report
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Academic Snapshot */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Stats Overview */}
                    <div className="grid sm:grid-cols-3 gap-6">
                        <div className="card p-6 border-l-4 border-l-blue-500">
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Attendance</p>
                            <h3 className="text-2xl font-bold text-gray-900">{attendancePercentage ? `${attendancePercentage}%` : 'N/A'}</h3>
                            <p className="text-xs text-gray-400 mt-1">Current Term</p>
                        </div>
                        <div className="card p-6 border-l-4 border-l-green-500">
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Last Average</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                {student.reportCards[0]?.average ? `${student.reportCards[0].average.toString()}%` : '---'}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">
                                {student.reportCards[0]?.term?.name || 'No reports yet'}
                            </p>
                        </div>
                        <div className="card p-6 border-l-4 border-l-purple-500">
                            <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Class Position</p>
                            <h3 className="text-2xl font-bold text-gray-900">
                                {student.reportCards[0]?.classPosition ? `${student.reportCards[0].classPosition}/${student.reportCards[0].classSize}` : '---'}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">First Term (2025/26)</p>
                        </div>
                    </div>

                    {/* Recent Attendance */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Recent Attendance</h2>
                            <Link href="/dashboard/attendance" className="text-primary-600 text-xs font-semibold hover:underline">View All</Link>
                        </div>
                        <div className="space-y-4">
                            {student.attendance.length > 0 ? (
                                student.attendance.map((record) => (
                                    <div key={record.id} className="flex items-center justify-between py-3 border-b last:border-0 border-gray-50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span className="text-sm text-gray-700">{new Date(record.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        </div>
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${record.status === 'PRESENT' ? 'bg-green-50 text-green-700' :
                                            record.status === 'ABSENT' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                                            }`}>
                                            {record.status}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center py-4 text-gray-500 text-sm">No recent attendance records found.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    {/* Basic Info */}
                    <div className="card p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">Student Info</h2>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between py-2 border-b border-gray-50">
                                <span className="text-gray-500">Gender</span>
                                <span className="font-medium text-gray-900 capitalize">{student.gender.toLowerCase()}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-50">
                                <span className="text-gray-500">Admission Date</span>
                                <span className="font-medium text-gray-900">
                                    {student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-50">
                                <span className="text-gray-500">School</span>
                                <span className="font-medium text-gray-900 truncate ml-4 text-right">{student.school.name}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Support */}
                    <div className="bg-gradient-to-br from-indigo-500 to-primary-600 rounded-2xl p-6 text-white shadow-lg">
                        <h3 className="font-bold mb-2">Need Support?</h3>
                        <p className="text-white/80 text-sm mb-4">Contact the school administration for any questions regarding your child's data.</p>
                        <button className="w-full py-2.5 bg-white text-primary-600 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors">
                            Contact Admin
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
