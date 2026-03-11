"use client";

import React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";

interface ParentWardsProps {
    wards: any[];
}

export function ParentWards({ wards }: ParentWardsProps) {
    if (wards.length === 0) return null;

    return (
        <Card className="mb-6">
            <CardHeader className="border-b border-gray-100">
                <CardTitle>My Wards</CardTitle>
                <CardDescription>View performance and records for your children</CardDescription>
            </CardHeader>
            <div className="divide-y divide-gray-100">
                {wards.map((ward) => (
                    <div key={ward.id} className="p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center hover:bg-gray-50 transition-colors">
                        <Avatar
                            src={ward.photoUrl}
                            initials={`${ward.firstName?.charAt(0) || ""}${ward.lastName?.charAt(0) || ""}`}
                            size="lg"
                            className="bg-indigo-100 text-indigo-700"
                        />
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900">{ward.firstName} {ward.lastName}</h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                                <span className="flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    {ward.school?.name || "N/A"}
                                </span>
                                <span className="flex items-center gap-1.5 border-l border-gray-300 pl-4">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    Class: {ward.classArm ? `${ward.classArm.class.name} ${ward.classArm.armName}` : "Not Assigned"}
                                </span>
                            </div>
                        </div>
                        <div className="flex shrink-0 gap-3 mt-2 sm:mt-0 w-full sm:w-auto">
                            <Link href={`/dashboard/reports?studentId=${ward.id}`} className="w-full sm:w-auto">
                                <Button variant="primary" className="w-full">
                                    View Report Cards
                                </Button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
