"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface Ward {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    classArm?: {
        armName: string;
        class: {
            name: string;
        };
    };
    photoUrl?: string;
}

export default function WardsPage() {
    const { data: session } = useSession();
    const [wards, setWards] = useState<Ward[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchWards = async () => {
            try {
                const response = await fetch("/api/parents/wards");
                if (response.ok) {
                    const data = await response.json();
                    setWards(data.wards);
                }
            } catch (error) {
                console.error("Failed to fetch wards", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (session?.user?.roles.includes("PARENT")) {
            fetchWards();
        }
    }, [session]);

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading your wards...</div>;
    }

    if (wards.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900">No Wards Linked</h3>
                <p className="text-gray-500 mt-1">Contact the school admin to link your children to your account.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Wards</h1>
                <p className="text-gray-500">View academic records for your children</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wards.map((ward) => (
                    <div key={ward.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="h-32 bg-gradient-to-r from-primary-500 to-primary-600 relative">
                            <div className="absolute -bottom-10 left-6">
                                <div className="w-20 h-20 bg-white rounded-full p-1 shadow-md">
                                    <div className="w-full h-full bg-gray-200 rounded-full overflow-hidden relative">
                                        {ward.photoUrl ? (
                                            <Image
                                                src={ward.photoUrl}
                                                alt={`${ward.firstName} ${ward.lastName}`}
                                                layout="fill"
                                                objectFit="cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-400">
                                                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="pt-12 p-6">
                            <h3 className="text-lg font-bold text-gray-900">
                                {ward.firstName} {ward.lastName}
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">{ward.admissionNumber}</p>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Class:</span>
                                    <span className="font-medium text-gray-900">
                                        {ward.classArm ? `${ward.classArm.class.name} ${ward.classArm.armName}` : "N/A"}
                                    </span>
                                </div>
                                <div className="border-t border-gray-100 pt-3 flex items-center justify-center">
                                    <Link
                                        href={`/dashboard/reports?studentId=${ward.id}`}
                                        className="text-primary-600 font-medium hover:text-primary-700 text-sm flex items-center gap-1"
                                    >
                                        View Report Cards
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
