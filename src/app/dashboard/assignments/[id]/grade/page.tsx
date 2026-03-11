"use client";

import { useSession } from "next-auth/react";
import { GradingInterface } from "@/components/assignments/GradingInterface";
import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GradeAssignmentPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const router = useRouter();

    const assignmentId = params.id as string;

    useEffect(() => {
        if (status === "unauthenticated" || (session?.user?.roles && !session.user.roles.some((r: string) => ["CLASS_TEACHER", "SUBJECT_TEACHER", "SCHOOL_ADMIN", "SUPER_ADMIN"].includes(r)))) {
            router.push("/dashboard");
        }
    }, [status, session, router]);

    if (status === "loading" || !session?.user?.id || !assignmentId) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return <GradingInterface assignmentId={assignmentId} teacherId={session.user.id} />;
}
