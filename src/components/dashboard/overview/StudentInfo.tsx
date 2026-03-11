"use client";

import React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface StudentInfoProps {
    session: any;
}

export function StudentInfo({ session }: StudentInfoProps) {
    const studentUser = session?.user;
    if (!studentUser) return null;

    return (
        <Card className="mb-6 overflow-hidden">
            <div className="bg-primary-600 px-6 py-4">
                <h3 className="text-lg font-bold text-white">Student Information</h3>
            </div>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                    <div className="p-6">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Student Name</p>
                        <p className="text-lg font-medium text-gray-900">{studentUser.name}</p>
                    </div>
                    <div className="p-6">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Admission Number</p>
                        <p className="text-lg font-medium text-gray-900 font-mono">
                            {(studentUser as any)?.admissionNumber || "N/A"}
                        </p>
                    </div>
                    <div className="p-6 bg-gray-50 flex items-center justify-center">
                        <Link href="/dashboard/reports">
                            <Button variant="primary" className="w-full">
                                View My Report Cards
                            </Button>
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
