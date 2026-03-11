"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Progress } from "@/components/ui/Progress";

interface AdminStatsProps {
    stats: {
        totalStudents: number;
        totalTeachers: number;
        totalClasses: number;
        publishedReports: number;
        totalReports: number;
        publishedPercentage: number;
    };
    classProgress: { name: string; progress: number }[];
}

export function AdminStats({ stats, classProgress }: AdminStatsProps) {
    return (
        <div className="space-y-8">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Students */}
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
                            <p className="text-sm font-medium text-slate-500">Total Students</p>
                            <p className="text-3xl font-bold text-slate-900 tracking-tight mt-1">{stats.totalStudents}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Teachers */}
                <Card className="hover:shadow-[0px_8px_32px_-8px_rgba(0,0,0,0.06)] transition-all duration-300">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50/80 text-emerald-600 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                        <div className="mt-5">
                            <p className="text-sm font-medium text-slate-500">Teachers</p>
                            <p className="text-3xl font-bold text-slate-900 tracking-tight mt-1">{stats.totalTeachers}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Total Classes */}
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
                            <p className="text-sm font-medium text-slate-500">Active Classes</p>
                            <p className="text-3xl font-bold text-slate-900 tracking-tight mt-1">{stats.totalClasses}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Report Generation */}
                <Card className="hover:shadow-[0px_8px_32px_-8px_rgba(0,0,0,0.06)] transition-all duration-300">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                            <div className="w-10 h-10 rounded-xl bg-orange-50/80 text-orange-600 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </div>
                            <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded-full">
                                {stats.publishedPercentage}% Pub.
                            </span>
                        </div>
                        <div className="mt-5">
                            <p className="text-sm font-medium text-slate-500">Reports Published</p>
                            <div className="flex items-baseline gap-1 mt-1">
                                <p className="text-3xl font-bold text-slate-900 tracking-tight">{stats.publishedReports}</p>
                                <p className="text-sm font-medium text-slate-400">/ {stats.totalReports}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Class Progress */}
            <Card>
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-50">
                    <h2 className="text-base font-semibold text-slate-900">Class Performance Tracking</h2>
                    <Link href="/dashboard/classes" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                        View all classes &rarr;
                    </Link>
                </div>
                <CardContent className="p-6">
                    <div className="space-y-6">
                        {classProgress.map((item, index) => (
                            <div key={index}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                                    <span className="text-sm font-semibold text-slate-900">{item.progress}%</span>
                                </div>
                                <Progress value={item.progress} indicatorClassName={
                                    item.progress < 30 ? "bg-red-500" :
                                        item.progress < 70 ? "bg-amber-500" :
                                            item.progress < 100 ? "bg-blue-500" : "bg-emerald-500"
                                } />
                            </div>
                        ))}

                        {classProgress.length === 0 && (
                            <div className="text-center py-6">
                                <h3 className="mt-2 text-sm font-medium text-slate-900">No active classes</h3>
                                <p className="mt-1 text-sm text-slate-500">Get started by creating a new class.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
