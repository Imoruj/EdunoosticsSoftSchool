"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Award, TrendingUp, UserSquare2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";

interface StudentInfoProps {
    session: any;
    admissionNumber?: string | null;
    classLabel?: string | null;
    currentSessionName?: string;
    currentTermName?: string;
}

const quickLinks = [
    {
        href: "/dashboard/assignments",
        label: "Assignments",
        description: "Open active tasks",
        icon: BookOpen,
        iconClassName: "bg-blue-50 text-blue-700",
    },
    {
        href: "/dashboard/reports",
        label: "Report Cards",
        description: "View published results",
        icon: Award,
        iconClassName: "bg-emerald-50 text-emerald-700",
    },
    {
        href: "/dashboard/scheme-of-work",
        label: "Scheme of Work",
        description: "Follow class coverage",
        icon: UserSquare2,
        iconClassName: "bg-orange-50 text-orange-700",
    },
    {
        href: "/dashboard/my-progress",
        label: "My Progress",
        description: "Track scores and trends",
        icon: TrendingUp,
        iconClassName: "bg-purple-50 text-purple-700",
    },
];

export function StudentInfo({
    session,
    admissionNumber,
    classLabel,
    currentSessionName,
    currentTermName,
}: StudentInfoProps) {
    const studentUser = session?.user;
    if (!studentUser) return null;

    return (
        <Card className="overflow-hidden border border-slate-200 shadow-sm">
            <CardContent className="p-6">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                                Student Overview
                            </p>
                            <h3 className="mt-2 text-2xl font-bold text-slate-900">{studentUser.name}</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Keep track of your class information, current term, and the main places you need most.
                            </p>
                        </div>
                        <Link
                            href="/dashboard/profile"
                            className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                            Open Profile
                        </Link>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Admission No.</p>
                            <p className="mt-2 text-base font-semibold text-slate-900 font-mono">
                                {admissionNumber || "Not available"}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Class</p>
                            <p className="mt-2 text-base font-semibold text-slate-900">
                                {classLabel || (studentUser as any)?.assignedClass || "Class not assigned"}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current Term</p>
                            <p className="mt-2 text-base font-semibold text-slate-900">
                                {currentSessionName && currentTermName
                                    ? `${currentSessionName} - ${currentTermName}`
                                    : "Term information unavailable"}
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {quickLinks.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="group rounded-2xl border border-slate-200 bg-white px-4 py-4 transition hover:border-primary-200 hover:bg-primary-50/40"
                                >
                                    <div className={`inline-flex rounded-xl p-2.5 ${item.iconClassName}`}>
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h4 className="mt-4 text-sm font-semibold text-slate-900 group-hover:text-primary-700">
                                        {item.label}
                                    </h4>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        {item.description}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
