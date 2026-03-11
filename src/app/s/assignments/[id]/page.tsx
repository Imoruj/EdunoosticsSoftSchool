"use client";

import { useSession } from "next-auth/react";
import { AssignmentView } from "@/components/assignments/student/AssignmentView";
import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TakeAssignmentPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const router = useRouter();

    const assignmentId = params.id as string;

    useEffect(() => {
        // Basic protection to ensure signed in users with a valid ID
        if (status === "unauthenticated" || !session?.user?.id) {
            // In a real app we might redirect to login, but for tests just dashboard
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

    return <AssignmentView assignmentId={assignmentId} studentId={session.user.id} />;
}
