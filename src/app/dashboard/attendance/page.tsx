
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { showSuccessMessage } from "@/lib/successMessage";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface StudentAttendance {
    id: string; // studentId
    firstName: string;
    lastName: string;
    admissionNumber: string;
    status: AttendanceStatus;
}

const statusColors: Record<AttendanceStatus, { bg: string; text: string }> = {
    PRESENT: { bg: "bg-green-100", text: "text-green-800" },
    ABSENT: { bg: "bg-red-100", text: "text-red-800" },
    LATE: { bg: "bg-amber-100", text: "text-amber-800" },
    EXCUSED: { bg: "bg-blue-100", text: "text-blue-800" },
};

export default function AttendancePage() {
    const { data: session } = useSession();
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClassArmId, setSelectedClassArmId] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
    const [students, setStudents] = useState<StudentAttendance[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchClasses();
    }, []);

    useEffect(() => {
        if (selectedClassArmId && selectedDate) {
            fetchAttendance();
        }
    }, [selectedClassArmId, selectedDate]);

    const fetchClasses = async () => {
        try {
            const res = await fetch("/api/classes");
            if (res.ok) {
                const data = await res.json();
                // Flatten classes into arms
                const arms = data.classes.flatMap((c: any) =>
                    c.arms.map((a: any) => ({
                        id: a.id,
                        name: `${c.name} ${a.armName}`,
                        classTeacherId: a.classTeacherId
                    }))
                );
                setClasses(arms);
            }
        } catch (err) {
            console.error("Failed to fetch classes", err);
        }
    };

    const fetchAttendance = async () => {
        setIsLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/attendance?classArmId=${selectedClassArmId}&date=${selectedDate}`);
            if (res.ok) {
                const data = await res.json();
                setStudents(data);
            } else {
                setError("Failed to fetch attendance records");
            }
        } catch (err) {
            setError("Connection error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
        setStudents((prev) =>
            prev.map((s) => (s.id === studentId ? { ...s, status } : s))
        );
    };

    const handleMarkAll = (status: AttendanceStatus) => {
        setStudents((prev) => prev.map((s) => ({ ...s, status })));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError("");
        try {
            const res = await fetch("/api/attendance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    classArmId: selectedClassArmId,
                    date: selectedDate,
                    attendance: students.map(s => ({ studentId: s.id, status: s.status }))
                })
            });
            if (res.ok) {
                showSuccessMessage("Attendance saved successfully!", { title: "Attendance Saved!" });
            } else {
                const data = await res.json();
                setError(data.error || "Failed to save attendance");
                toast.error(data.error || "Failed to save attendance");
            }
        } catch (err) {
            setError("Failed to save attendance");
            toast.error("Failed to save attendance");
        } finally {
            setIsSaving(false);
        }
    };

    const showTable = selectedClassArmId && selectedDate;
    const selectedClassName = classes.find(c => c.id === selectedClassArmId)?.name || "";

    const stats = {
        present: students.filter((s) => s.status === "PRESENT").length,
        absent: students.filter((s) => s.status === "ABSENT").length,
        late: students.filter((s) => s.status === "LATE").length,
        excused: students.filter((s) => s.status === "EXCUSED").length,
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
                        disabled={isSaving || students.length === 0}
                        className="btn-primary flex items-center gap-2"
                    >
                        {isSaving ? "Saving..." : "Save Attendance"}
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
                            value={selectedClassArmId}
                            onChange={(e) => setSelectedClassArmId(e.target.value)}
                            className="input w-full"
                        >
                            <option value="">Choose a class</option>
                            {classes.map((cls) => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
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
                                disabled={!showTable || students.length === 0}
                            >
                                Mark All Present
                            </button>
                            <button
                                onClick={() => handleMarkAll("ABSENT")}
                                className="btn-secondary text-sm"
                                disabled={!showTable || students.length === 0}
                            >
                                Mark All Absent
                            </button>
                        </div>
                    </div>
                </div>
                {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
            </div>

            {/* Stats */}
            {showTable && students.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-green-600 font-bold">{stats.present}</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Present</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                <span className="text-red-600 font-bold">{stats.absent}</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Absent</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <span className="text-amber-600 font-bold">{stats.late}</span>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Late</p>
                            </div>
                        </div>
                    </div>
                    <div className="card p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-blue-600 font-bold">{stats.excused}</span>
                            </div>
                            <div>
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
                            {selectedClassName} - {new Date(selectedDate).toLocaleDateString("en-NG", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                            })}
                        </h3>
                        <p className="text-sm text-gray-500">{students.length} students</p>
                    </div>
                    <div className="overflow-x-auto">
                        {isLoading ? (
                            <div className="p-12 text-center text-gray-500">Loading students...</div>
                        ) : students.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">No students found in this class.</div>
                        ) : (
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
                                    {students.map((student, index) => (
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
                                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${student.status === status
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
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Summary Footer */}
                    {!isLoading && students.length > 0 && (
                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">
                                    Attendance Rate:{" "}
                                    <span className="font-bold text-green-600">
                                        {((stats.present / students.length) * 100).toFixed(1)}%
                                    </span>
                                </span>
                                <span className="text-gray-500">
                                    Total: <span className="font-medium">{students.length}</span> students
                                </span>
                            </div>
                        </div>
                    )}
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
