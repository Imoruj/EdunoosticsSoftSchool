"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";

interface TeacherStatsProps {
    myClasses: any[];
    mySubjects: any[];
    stats: {
        totalStudents: number;
        totalClasses: number;
        totalSubjects: number;
        overallCompletion: number;
    };
}

export function TeacherStats({ myClasses, mySubjects, stats }: TeacherStatsProps) {
    const groupedSubjects = mySubjects.reduce((acc, ts) => {
        const name = ts.subject.name;
        if (!acc[name]) acc[name] = [];
        acc[name].push(ts);
        return acc;
    }, {} as Record<string, typeof mySubjects>);

    return (
        <div className="space-y-8">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* My Students */}
                <Card className="hover:shadow-[0px_8px_32px_-8px_rgba(0,0,0,0.06)] transition-all duration-300">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-xl bg-blue-50/80 text-blue-600 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                        </div>
                        <div className="mt-5">
                            <p className="text-sm font-medium text-slate-500">My Students</p>
                            <p className="text-3xl font-bold text-slate-900 tracking-tight mt-1">{stats.totalStudents}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* My Classes */}
                <Card className="hover:shadow-[0px_8px_32px_-8px_rgba(0,0,0,0.06)] transition-all duration-300">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-xl bg-purple-50/80 text-purple-600 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                            </div>
                        </div>
                        <div className="mt-5">
                            <p className="text-sm font-medium text-slate-500">My Classes</p>
                            <p className="text-3xl font-bold text-slate-900 tracking-tight mt-1">{stats.totalClasses}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* My Subjects */}
                <Card className="hover:shadow-[0px_8px_32px_-8px_rgba(0,0,0,0.06)] transition-all duration-300">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50/80 text-emerald-600 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                        </div>
                        <div className="mt-5">
                            <p className="text-sm font-medium text-slate-500">My Subjects</p>
                            <p className="text-3xl font-bold text-slate-900 tracking-tight mt-1">{stats.totalSubjects}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Score Entry Progress */}
                <Card className="hover:shadow-[0px_8px_32px_-8px_rgba(0,0,0,0.06)] transition-all duration-300">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-xl bg-orange-50/80 text-orange-600 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                                {stats.overallCompletion}% Done
                            </span>
                        </div>
                        <div className="mt-5">
                            <p className="text-sm font-medium text-slate-500">Total Progress</p>
                            <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                                <div
                                    className="h-full bg-orange-500 transition-all duration-500"
                                    style={{ width: `${stats.overallCompletion}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                {myClasses.length > 0 && (
                    <Card>
                        <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>My Form Classes</CardTitle>
                                    <CardDescription>Classes where you are the form teacher</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <div className="divide-y divide-gray-100">
                            {myClasses.map((arm) => (
                                <div key={arm.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                            {arm.class.name} {arm.armName}
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {arm._count.students} Students • {arm.subjectClassArms?.length || 0} Subjects
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Link href={`/dashboard/broadsheet?classArmId=${arm.id}`} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">
                                            View Broadsheet
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {mySubjects.length > 0 && (
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">My Subjects Progress</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Score entry progress grouped by subject</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {Object.entries(groupedSubjects).map(([subjectName, items]: any) => (
                                <Card key={subjectName} className="overflow-hidden hover:shadow-md transition-shadow duration-300 border-gray-200">
                                    <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-100/50 text-emerald-600 flex items-center justify-center shadow-sm">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                                </svg>
                                            </div>
                                            <h3 className="font-semibold text-gray-900">{subjectName}</h3>
                                        </div>
                                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                            {items.length} Classes
                                        </span>
                                    </div>
                                    <div className="divide-y divide-gray-50 bg-white">
                                        {items.map((ts: any) => (
                                            <div key={ts.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors gap-4 group">
                                                <div className="flex-[2] min-w-0 pr-4">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {ts.classArm.class.name} {ts.classArm.armName}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate mt-0.5">
                                                        {ts.classArm._count.students} students
                                                    </p>
                                                </div>
                                                <div className="flex-[3] flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <Progress value={ts.completion} className="h-2" indicatorClassName={
                                                            ts.completion < 30 ? "bg-red-500" :
                                                                ts.completion < 70 ? "bg-yellow-500" :
                                                                    ts.completion < 100 ? "bg-blue-500" : "bg-emerald-500"
                                                        } />
                                                    </div>
                                                    <span className={`w-10 text-right text-xs font-bold ${ts.completion === 100 ? 'text-emerald-600' : 'text-gray-700'}`}>
                                                        {ts.completion}%
                                                    </span>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <Link
                                                        href={`/dashboard/scores?classArmId=${ts.classArmId}&subjectId=${ts.subjectId}`}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-400 group-hover:text-primary-600 group-hover:bg-primary-50 transition-all duration-200"
                                                        title="Enter Scores"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
