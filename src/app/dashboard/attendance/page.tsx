"use client";

import { useState } from "react";

// Mock data
const mockClasses = ["Primary 1A", "Primary 1B", "Primary 2A", "JSS 1A", "SSS 1A"];

const mockStudents = [
    { id: "1", firstName: "Adaeze", lastName: "Okonkwo", admissionNumber: "SCH/2024/001" },
    { id: "2", firstName: "Chinedu", lastName: "Eze", admissionNumber: "SCH/2024/002" },
    { id: "3", firstName: "Fatima", lastName: "Ibrahim", admissionNumber: "SCH/2024/003" },
    { id: "4", firstName: "Oluwaseun", lastName: "Adeleke", admissionNumber: "SCH/2024/004" },
    { id: "5", firstName: "Amara", lastName: "Nwosu", admissionNumber: "SCH/2024/005" },
];

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface StudentAttendance {
    studentId: string;
    status: AttendanceStatus;
}

const statusColors: Record<AttendanceStatus, { bg: string; text: string }> = {
    PRESENT: { bg: "bg-green-100", text: "text-green-800" },
    ABSENT: { bg: "bg-red-100", text: "text-red-800" },
    LATE: { bg: "bg-amber-100", text: "text-amber-800" },
    EXCUSED: { bg: "bg-blue-100", text: "text-blue-800" },
};

export default function AttendancePage() {
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [attendance, setAttendance] = useState<StudentAttendance[]>(
        mockStudents.map((s) => ({ studentId: s.id, status: "PRESENT" }))
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setAttendance((prev) =>
            prev.map((a) => (a.studentId === studentId ? { ...a, status } : a))
        );
    };

    const handleMarkAll = (status: AttendanceStatus) => {
        setAttendance((prev) => prev.map((a) => ({ ...a, status })));
    };

    const handleSave = async () => {
        setIsSaving(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsSaving(false);
        alert("Attendance saved successfully!");
    };

    const showTable = selectedClass && selectedDate;

    const stats = {
        present: attendance.filter((a) => a.status === "PRESENT").length,
        absent: attendance.filter((a) => a.status === "ABSENT").length,
        late: attendance.filter((a) => a.status === "LATE").length,
        excused: attendance.filter((a) => a.status === "EXCUSED").length,
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
                    <p className="text-gray-500 mt-1">Mark and manage daily student attendance</p>
                </div>
                {showTable && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="btn-primary flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Saving...
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Save Attendance
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Selection */}
            <div className="card p-6">
                <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Class *
                        </label>
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="input w-full"
                        >
                            <option value="">Choose a class</option>
                            {mockClasses.map((cls) => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Select Date *
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="input w-full"
                        />
                    </div>
                    <div className="flex items-end">
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleMarkAll("PRESENT")}
                                className="btn-secondary text-sm"
                                disabled={!showTable}
                            >
                                Mark All Present
                            </button>
                            <button
                                onClick={() => handleMarkAll("ABSENT")}
                                className="btn-secondary text-sm"
                                disabled={!showTable}
                            >
                                Mark All Absent
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            {showTable && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-600">{stats.present}</p>
                                <p className="text-sm text-gray-500">Present</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
                                <p className="text-sm text-gray-500">Absent</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-amber-600">{stats.late}</p>
                                <p className="text-sm text-gray-500">Late</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-blue-600">{stats.excused}</p>
                                <p className="text-sm text-gray-500">Excused</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance Table */}
            {showTable ? (
                <div className="card overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900">
                            {selectedClass} - {new Date(selectedDate).toLocaleDateString("en-NG", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </h3>
                        <p className="text-sm text-gray-500">{mockStudents.length} students</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">
                                        S/N
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Student
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {mockStudents.map((student, index) => {
                                    const studentAttendance = attendance.find((a) => a.studentId === student.id);
                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        {student.lastName} {student.firstName}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-mono">
                                                        {student.admissionNumber}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map(
                                                        (status) => (
                                                            <button
                                                                key={status}
                                                                onClick={() => handleStatusChange(student.id, status)}
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${studentAttendance?.status === status
                                                                        ? `${statusColors[status].bg} ${statusColors[status].text} ring-2 ring-offset-1 ring-current`
                                                                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                                    }`}
                                                            >
                                                                {status.charAt(0) + status.slice(1).toLowerCase()}
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary Footer */}
                    <div className="p-4 bg-gray-50 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">
                                Attendance Rate:{" "}
                                <span className="font-bold text-green-600">
                                    {((stats.present / mockStudents.length) * 100).toFixed(1)}%
                                </span>
                            </span>
                            <span className="text-gray-500">
                                Total: <span className="font-medium">{mockStudents.length}</span> students
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card p-12 text-center">
                    <div className="flex flex-col items-center">
                        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Select Class and Date</h3>
                        <p className="text-gray-500 max-w-md">
                            Choose a class and date from the options above to start marking attendance.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
