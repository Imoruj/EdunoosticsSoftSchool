"use client";

import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AssignmentView } from "@/components/assignments/student/AssignmentView";

export default function ViewAssignmentPage() {
    const { data: session, status } = useSession();
    const params = useParams();
    const router = useRouter();
    const assignmentId = params.id as string;

    useEffect(() => {
        if (status === "unauthenticated") router.push("/auth/login");
    }, [status, router]);

    if (status === "loading" || !session?.user?.id || !assignmentId) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
        );
    }

    return <AssignmentView assignmentId={assignmentId} studentId={session.user.id} />;
}
