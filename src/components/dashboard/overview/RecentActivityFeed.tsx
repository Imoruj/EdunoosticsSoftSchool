"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

interface RecentActivityFeedProps {
    activities: {
        type: "attendance" | "report" | "score";
        title: string;
        desc: string;
        time: Date;
        icon: React.ReactNode;
        iconBg: string;
        iconColor: string;
        link: string;
    }[];
    emptyMessage?: string;
}

export function RecentActivityFeed({
    activities,
    emptyMessage = "No recent activity for your account yet.",
}: RecentActivityFeedProps) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-2 border-b-0">
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-2">
                {activities.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/50 px-4 py-6 text-sm text-slate-500 dark:text-gray-400">
                        {emptyMessage}
                    </div>
                ) : (
                    <div className="flow-root">
                        <ul role="list" className="-mb-8">
                            {activities.map((activity, itemIdx) => (
                                <li key={itemIdx}>
                                    <div className="relative pb-8">
                                        {itemIdx !== activities.length - 1 ? (
                                            <span className="absolute left-4 top-4 -ml-px h-full w-[2px] bg-slate-100 dark:bg-gray-700" aria-hidden="true" />
                                        ) : null}
                                        <div className="relative flex items-start space-x-4">
                                            <div className="relative">
                                                <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-gray-800 ${activity.iconBg} ${activity.iconColor}`}>
                                                    <div className="scale-75">
                                                        {activity.icon}
                                                    </div>
                                                </span>
                                            </div>
                                            <div className="min-w-0 flex-1 pt-1.5">
                                                <div className="text-sm text-slate-600 dark:text-gray-300">
                                                    <Link href={activity.link} className="font-semibold text-slate-900 dark:text-gray-100 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                                                        {activity.title}
                                                    </Link>{' '}
                                                    <span className="text-slate-500 dark:text-gray-400">{activity.desc}</span>
                                                    <span className="whitespace-nowrap mt-1 block text-[11px] font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wider">
                                                        {activity.time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
