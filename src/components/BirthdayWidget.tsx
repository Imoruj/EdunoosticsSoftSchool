"use client";

import { useEffect, useMemo, useState } from "react";

interface BirthdayStudent {
    id: string;
    firstName: string;
    lastName: string;
    gender: "MALE" | "FEMALE";
    dateOfBirth: string;
    photoUrl: string | null;
    className: string;
}

interface BirthdayWidgetProps {
    students: BirthdayStudent[];
}

const PARTICLE_POSITIONS = [
    { top: "14%", left: "10%", delay: "0s", duration: "4.4s" },
    { top: "22%", left: "82%", delay: "0.8s", duration: "5.1s" },
    { top: "58%", left: "8%", delay: "1.4s", duration: "4.8s" },
    { top: "70%", left: "84%", delay: "0.5s", duration: "5.6s" },
    { top: "16%", left: "56%", delay: "1.1s", duration: "4.9s" },
    { top: "76%", left: "48%", delay: "1.8s", duration: "5.4s" },
];

function getDaysUntilBirthday(dob: string): number {
    const now = new Date();
    const birth = new Date(dob);
    const thisYearBday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());

    if (thisYearBday.getTime() < now.getTime() - 5 * 60 * 1000) {
        const diffMs = now.getTime() - thisYearBday.getTime();
        if (diffMs <= 5 * 60 * 1000) return 0;
        return -1;
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

function getBirthdayBadgeLabel(days: number, isToday: boolean) {
    if (isToday) return "Today";
    if (days === 1) return "Tomorrow";
    return `In ${days} days`;
}

function getPalette(gender: BirthdayStudent["gender"]) {
    if (gender === "FEMALE") {
        return {
            shell: "border-rose-200/80 dark:border-rose-800/40 bg-gradient-to-br from-rose-50 via-white to-fuchsia-50 dark:from-rose-950/40 dark:via-gray-800 dark:to-fuchsia-950/40",
            frame: "from-rose-400 via-pink-400 to-fuchsia-500",
            accent: "text-rose-700 dark:text-rose-300",
            subtle: "text-rose-500 dark:text-rose-400",
            badge: "bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300",
            count: "bg-white/80 dark:bg-gray-700/80 text-rose-700 dark:text-rose-300 ring-1 ring-rose-200/70 dark:ring-rose-700/50",
            particle: "bg-rose-300/70 dark:bg-rose-700/50",
            highlight: "from-white/60 via-rose-100/0 to-transparent dark:from-gray-700/30",
        };
    }

    return {
        shell: "border-sky-200/80 dark:border-sky-800/40 bg-gradient-to-br from-sky-50 via-white to-cyan-50 dark:from-sky-950/40 dark:via-gray-800 dark:to-cyan-950/40",
        frame: "from-sky-400 via-blue-400 to-cyan-500",
        accent: "text-sky-700 dark:text-sky-300",
        subtle: "text-sky-500 dark:text-sky-400",
        badge: "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300",
        count: "bg-white/80 dark:bg-gray-700/80 text-sky-700 dark:text-sky-300 ring-1 ring-sky-200/70 dark:ring-sky-700/50",
        particle: "bg-sky-300/70 dark:bg-sky-700/50",
        highlight: "from-white/60 via-sky-100/0 to-transparent dark:from-gray-700/30",
    };
}

export default function BirthdayWidget({ students }: BirthdayWidgetProps) {
    const [visibleStudents, setVisibleStudents] = useState<BirthdayStudent[]>(students);

    useEffect(() => {
        const filter = () => {
            setVisibleStudents(
                students.filter((student) => {
                    if (isBirthdayToday(student.dateOfBirth)) {
                        return getMinutesSinceBirthday(student.dateOfBirth) <= 5;
                    }

                    const days = getDaysUntilBirthday(student.dateOfBirth);
                    return days >= 0 && days <= 2;
                })
            );
        };

        filter();
        const interval = setInterval(filter, 60_000);
        return () => clearInterval(interval);
    }, [students]);

    const decoratedStudents = useMemo(
        () =>
            visibleStudents.map((student) => {
                const days = getDaysUntilBirthday(student.dateOfBirth);
                const today = isBirthdayToday(student.dateOfBirth);
                const birth = new Date(student.dateOfBirth);

                return {
                    ...student,
                    days,
                    today,
                    badgeLabel: getBirthdayBadgeLabel(days, today),
                    displayDate: birth.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                    palette: getPalette(student.gender),
                };
            }),
        [visibleStudents]
    );

    if (decoratedStudents.length === 0) return null;

    return (
        <div className="rounded-3xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-3 border-b border-slate-100 dark:border-gray-700 pb-5 md:flex-row md:items-end md:justify-between">
                <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 via-rose-100 to-fuchsia-100 shadow-inner">
                        <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0A1.75 1.75 0 003 15.546V12a9 9 0 0118 0v3.546zM12 3v2m-4.243.757L6.343 7.17m8.486-1.414L16.243 7.17" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-gray-100">Upcoming Birthdays</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                            Celebrations coming up within the next two days.
                        </p>
                    </div>
                </div>

                <div className="inline-flex w-fit items-center rounded-full border border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-950/30 px-3 py-1 text-sm font-medium text-rose-700 dark:text-rose-300">
                    {decoratedStudents.length} student{decoratedStudents.length !== 1 ? "s" : ""}
                </div>
            </div>

            <div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {decoratedStudents.map((student) => (
                    <article
                        key={student.id}
                        className={`group relative isolate flex h-full min-h-[18rem] flex-col overflow-hidden rounded-3xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${student.palette.shell}`}
                    >
                        <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${student.palette.highlight}`} />
                        <div className="pointer-events-none absolute inset-0 opacity-90">
                            {PARTICLE_POSITIONS.map((particle, index) => (
                                <span
                                    key={index}
                                    className={`birthday-particle absolute h-2 w-2 rounded-full ${student.palette.particle}`}
                                    style={{
                                        top: particle.top,
                                        left: particle.left,
                                        animationDelay: particle.delay,
                                        animationDuration: particle.duration,
                                    }}
                                />
                            ))}
                        </div>

                        <div className="relative flex h-full flex-col gap-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-4">
                                    <div className={`birthday-frame shrink-0 rounded-3xl bg-gradient-to-br p-[3px] ${student.palette.frame}`}>
                                        <div className="rounded-[1.35rem] bg-white/90 dark:bg-gray-800/90 p-1.5 backdrop-blur-sm">
                                            <div className="h-20 w-20 overflow-hidden rounded-[1.1rem] bg-slate-100 dark:bg-gray-600">
                                                {student.photoUrl ? (
                                                    <img
                                                        src={student.photoUrl}
                                                        alt={`${student.firstName} ${student.lastName}`}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className={`flex h-full w-full items-center justify-center text-xl font-bold ${student.palette.accent}`}>
                                                        {student.firstName.charAt(0)}
                                                        {student.lastName.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-gray-100">
                                            {student.firstName} {student.lastName}
                                        </p>
                                        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{student.className}</p>
                                        <div className="mt-3 inline-flex items-center rounded-full bg-white/80 dark:bg-gray-700/80 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-gray-300 ring-1 ring-slate-200/70 dark:ring-gray-600/70">
                                            Birthday {student.displayDate}
                                        </div>
                                    </div>
                                </div>

                                <div className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${student.palette.badge}`}>
                                    {student.badgeLabel}
                                </div>
                            </div>

                            <div className="mt-auto flex items-center justify-between gap-3 rounded-2xl bg-white/70 dark:bg-gray-700/60 px-4 py-3 ring-1 ring-white/70 dark:ring-gray-600/50 backdrop-blur-sm">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-gray-500">
                                        Celebration note
                                    </p>
                                    <p className={`mt-1 text-sm font-medium ${student.palette.accent}`}>
                                        {student.today ? "Send birthday wishes today" : "Prepare greetings for the parent"}
                                    </p>
                                </div>
                                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${student.palette.count}`}>
                                    {student.gender === "FEMALE" ? "Female" : "Male"}
                                </div>
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            <style jsx>{`
                .birthday-particle {
                    animation-name: birthday-float;
                    animation-timing-function: ease-in-out;
                    animation-iteration-count: infinite;
                    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.22);
                }

                .birthday-frame {
                    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
                }

                @keyframes birthday-float {
                    0%,
                    100% {
                        transform: translate3d(0, 0, 0) scale(0.9);
                        opacity: 0.45;
                    }
                    50% {
                        transform: translate3d(0, -10px, 0) scale(1.08);
                        opacity: 1;
                    }
                }
            `}</style>
        </div>
    );
}
