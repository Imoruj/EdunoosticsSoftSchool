"use client";

import { useState, useEffect } from "react";

interface BirthdayStudent {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string; // ISO string
    photoUrl: string | null;
    className: string;
}

interface BirthdayWidgetProps {
    students: BirthdayStudent[];
}

function getDaysUntilBirthday(dob: string): number {
    const now = new Date();
    const birth = new Date(dob);
    const thisYearBday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
    // If birthday already passed this year, check next year
    if (thisYearBday.getTime() < now.getTime() - 5 * 60 * 1000) {
        // Past by more than 5 min — check if it's today but within grace
        const diffMs = now.getTime() - thisYearBday.getTime();
        if (diffMs <= 5 * 60 * 1000) return 0; // Still within 5 min grace
        return -1; // Expired
    }
    const diffMs = thisYearBday.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function isBirthdayToday(dob: string): boolean {
    const now = new Date();
    const birth = new Date(dob);
    return now.getMonth() === birth.getMonth() && now.getDate() === birth.getDate();
}

function getMinutesSinceBirthday(dob: string): number {
    const now = new Date();
    const birth = new Date(dob);
    const todayBday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
    return (now.getTime() - todayBday.getTime()) / (1000 * 60);
}

export default function BirthdayWidget({ students }: BirthdayWidgetProps) {
    const [visibleStudents, setVisibleStudents] = useState<BirthdayStudent[]>(students);

    useEffect(() => {
        // Re-filter every 60 seconds to handle the 5-minute expiry
        const filter = () => {
            setVisibleStudents(
                students.filter((s) => {
                    if (isBirthdayToday(s.dateOfBirth)) {
                        // Today's birthday — hide after 5 minutes past midnight
                        return getMinutesSinceBirthday(s.dateOfBirth) <= 5;
                    }
                    const days = getDaysUntilBirthday(s.dateOfBirth);
                    return days >= 0 && days <= 2;
                })
            );
        };

        filter(); // Initial filter
        const interval = setInterval(filter, 60_000); // Check every minute
        return () => clearInterval(interval);
    }, [students]);

    if (visibleStudents.length === 0) return null;

    return (
        <div className="card p-6 border border-pink-200 bg-gradient-to-br from-pink-50 to-rose-50 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 003 15.546V12a9 9 0 0118 0v3.546zM12 3v2m-4.243.757L6.343 7.17m8.486-1.414L16.243 7.17" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Upcoming Birthdays</h2>
                    <p className="text-xs text-pink-600 font-medium">{visibleStudents.length} student{visibleStudents.length !== 1 ? "s" : ""}</p>
                </div>
            </div>

            <div className="space-y-3">
                {visibleStudents.map((student) => {
                    const isToday = isBirthdayToday(student.dateOfBirth);
                    const days = getDaysUntilBirthday(student.dateOfBirth);
                    const birth = new Date(student.dateOfBirth);
                    const bdayStr = `${birth.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

                    return (
                        <div
                            key={student.id}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                                isToday
                                    ? "bg-pink-100 border border-pink-300 animate-pulse"
                                    : "bg-white border border-pink-100"
                            }`}
                        >
                            {/* Photo or initials */}
                            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-pink-200 flex items-center justify-center">
                                {student.photoUrl ? (
                                    <img
                                        src={student.photoUrl}
                                        alt={student.firstName}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-pink-700 font-bold text-sm">
                                        {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                                    </span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {student.firstName} {student.lastName}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{student.className}</p>
                            </div>

                            {/* Badge */}
                            <div className="flex-shrink-0 text-right">
                                <p className="text-xs text-gray-500">{bdayStr}</p>
                                {isToday ? (
                                    <span className="inline-block text-[10px] font-bold text-white bg-pink-500 px-2 py-0.5 rounded-full">
                                        Today!
                                    </span>
                                ) : (
                                    <span className="inline-block text-[10px] font-medium text-pink-600 bg-pink-100 px-2 py-0.5 rounded-full">
                                        in {days} day{days !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
