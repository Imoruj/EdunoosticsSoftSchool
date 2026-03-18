"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Session { id: string; name: string }
interface Subject { id: string; name: string; code: string | null; classArmIds: string[] }
interface ClassArm { id: string; armName: string; classId: string; className: string }
interface AssignmentData {
    classes: { id: string; name: string; arms: { id: string; armName: string }[] }[];
    subjects: Subject[];
}

export function SchemeOfWorkCreateClient() {
    const { data: authSession } = useSession();
    const router = useRouter();
    const user = authSession?.user as any;
    const roles: string[] = user?.roles || [];
    const isStudent = roles.includes("STUDENT") || user?.loginType === "student";

    const [sessions, setSessions] = useState<Session[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [allClassArms, setAllClassArms] = useState<ClassArm[]>([]);
    const [classArms, setClassArms] = useState<ClassArm[]>([]);

    const [selectedSession, setSelectedSession] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedClassArm, setSelectedClassArm] = useState("");
    const [title, setTitle] = useState("");
    const [autoTitle, setAutoTitle] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect students
    useEffect(() => {
        if (isStudent) router.replace("/dashboard/scheme-of-work");
    }, [isStudent, router]);

    useEffect(() => {
        fetch("/api/sessions").then((r) => r.json()).then((d) => setSessions(d.sessions || []));
        // Fetch teacher's assignments (subjects + class arms they teach)
        fetch("/api/teacher/assignments")
            .then((r) => r.json())
            .then((d: AssignmentData) => {
                setSubjects(d.subjects || []);
                // Flatten all arms with class name for lookup
                const arms: ClassArm[] = [];
                for (const cls of d.classes || []) {
                    for (const arm of cls.arms) {
                        arms.push({ id: arm.id, armName: arm.armName, classId: cls.id, className: cls.name });
                    }
                }
                setAllClassArms(arms);
            })
            .catch(() => {});
    }, []);

    // Filter class arms by selected subject
    useEffect(() => {
        if (!selectedSubject) { setClassArms([]); setSelectedClassArm(""); return; }
        const subject = subjects.find((s) => s.id === selectedSubject);
        const armIds = new Set(subject?.classArmIds || []);
        setClassArms(allClassArms.filter((a) => armIds.has(a.id)));
        setSelectedClassArm("");
    }, [selectedSubject, subjects, allClassArms]);

    // Auto-generate title
    useEffect(() => {
        const subject = subjects.find((s) => s.id === selectedSubject);
        const classArm = classArms.find((c) => c.id === selectedClassArm);
        const session = sessions.find((s) => s.id === selectedSession);
        if (subject && classArm && session) {
            setAutoTitle(`${subject.name} — ${classArm.className} ${classArm.armName} — ${session.name}`);
        } else {
            setAutoTitle("");
        }
    }, [selectedSubject, selectedClassArm, selectedSession, subjects, classArms, sessions]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSession || !selectedSubject || !selectedClassArm) {
            setError("Please select a session, subject, and class arm");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/scheme-of-work", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sessionId: selectedSession,
                    subjectId: selectedSubject,
                    classArmId: selectedClassArm,
                    title: title.trim() || autoTitle || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create");
            router.push(`/dashboard/scheme-of-work/${data.schemeOfWork.id}`);
        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="mb-6">
                <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>
                <h1 className="text-2xl font-bold text-gray-900">New Scheme of Work</h1>
                <p className="text-sm text-gray-500 mt-1">Create a curriculum plan for a subject and session</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Academic Session *</label>
                    <select
                        value={selectedSession}
                        onChange={(e) => setSelectedSession(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">Select session…</option>
                        {sessions.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                    <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">Select subject…</option>
                        {subjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ""}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                    <select
                        value={selectedClassArm}
                        onChange={(e) => setSelectedClassArm(e.target.value)}
                        required
                        disabled={!selectedSubject}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
                    >
                        <option value="">{selectedSubject ? "Select class…" : "Select a subject first"}</option>
                        {classArms.map((c) => (
                            <option key={c.id} value={c.id}>{c.className} {c.armName}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
                    {autoTitle && (
                        <p className="text-xs text-gray-400 mb-1">Auto: {autoTitle}</p>
                    )}
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={autoTitle || "Leave blank to auto-generate"}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>

                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !selectedSession || !selectedSubject || !selectedClassArm}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? "Creating…" : "Create Scheme of Work"}
                    </button>
                </div>
            </form>
        </div>
    );
}
