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

    // Derived from subject selection
    const [availableClasses, setAvailableClasses] = useState<{ id: string; name: string }[]>([]);
    const [availableArms, setAvailableArms] = useState<ClassArm[]>([]);

    const [selectedSession, setSelectedSession] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedArmIds, setSelectedArmIds] = useState<string[]>([]);
    const [title, setTitle] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect students
    useEffect(() => {
        if (isStudent) router.replace("/dashboard/scheme-of-work");
    }, [isStudent, router]);

    useEffect(() => {
        fetch("/api/sessions").then((r) => r.json()).then((d) => setSessions(d.sessions || []));
        fetch("/api/teacher/assignments")
            .then((r) => r.json())
            .then((d: AssignmentData) => {
                setSubjects(d.subjects || []);
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

    // When subject changes, derive the available classes from teacher's assigned arms for that subject
    useEffect(() => {
        if (!selectedSubject) {
            setAvailableClasses([]);
            setSelectedClass("");
            setAvailableArms([]);
            setSelectedArmIds([]);
            return;
        }
        const subject = subjects.find((s) => s.id === selectedSubject);
        const armIds = new Set(subject?.classArmIds || []);
        const assignedArms = allClassArms.filter((a) => armIds.has(a.id));

        // Unique classes from those arms
        const classMap = new Map<string, string>();
        for (const arm of assignedArms) {
            if (!classMap.has(arm.classId)) classMap.set(arm.classId, arm.className);
        }
        setAvailableClasses(Array.from(classMap.entries()).map(([id, name]) => ({ id, name })));
        setSelectedClass("");
        setAvailableArms([]);
        setSelectedArmIds([]);
    }, [selectedSubject, subjects, allClassArms]);

    // When class changes, filter arms to just that class (within subject's assigned arms)
    useEffect(() => {
        if (!selectedClass || !selectedSubject) {
            setAvailableArms([]);
            setSelectedArmIds([]);
            return;
        }
        const subject = subjects.find((s) => s.id === selectedSubject);
        const armIds = new Set(subject?.classArmIds || []);
        setAvailableArms(allClassArms.filter((a) => armIds.has(a.id) && a.classId === selectedClass));
        setSelectedArmIds([]);
    }, [selectedClass, selectedSubject, subjects, allClassArms]);

    const toggleArm = (armId: string) => {
        setSelectedArmIds((prev) =>
            prev.includes(armId) ? prev.filter((id) => id !== armId) : [...prev, armId]
        );
    };

    const selectedClassName = availableClasses.find((c) => c.id === selectedClass)?.name || "";
    const selectedSessionName = sessions.find((s) => s.id === selectedSession)?.name || "";
    const selectedSubjectName = subjects.find((s) => s.id === selectedSubject)?.name || "";
    const autoTitle = selectedSubjectName && selectedClassName && selectedSessionName
        ? `${selectedSubjectName} — ${selectedClassName} — ${selectedSessionName}`
        : "";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSession || !selectedSubject || !selectedClass) {
            setError("Please select a session, subject, and class");
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
                    classId: selectedClass,
                    classArmIds: selectedArmIds,
                    title: title.trim() || autoTitle || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || data.error || "Failed to create");
            router.push(`/dashboard/scheme-of-work/${data.schemeOfWork.id}?step=2`);
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
                <p className="text-sm text-gray-500 mt-1">Create a curriculum plan for a subject and class</p>
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
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        required
                        disabled={!selectedSubject || availableClasses.length === 0}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-400"
                    >
                        <option value="">
                            {!selectedSubject ? "Select a subject first" : availableClasses.length === 0 ? "No classes available" : "Select class…"}
                        </option>
                        {availableClasses.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">A scheme of work applies to the entire class (e.g., SS1)</p>
                </div>

                {selectedClass && availableArms.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Class Arms
                            <span className="ml-2 font-normal text-gray-400 text-xs">Select arms this scheme covers (optional)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {availableArms.map((arm) => {
                                const checked = selectedArmIds.includes(arm.id);
                                return (
                                    <button
                                        key={arm.id}
                                        type="button"
                                        onClick={() => toggleArm(arm.id)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                            checked
                                                ? "bg-primary-600 text-white border-primary-600"
                                                : "bg-white text-gray-700 border-gray-300 hover:border-primary-400"
                                        }`}
                                    >
                                        {selectedClassName} {arm.armName}
                                    </button>
                                );
                            })}
                        </div>
                        {selectedArmIds.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1.5">
                                {selectedArmIds.length} arm{selectedArmIds.length > 1 ? "s" : ""} selected
                            </p>
                        )}
                    </div>
                )}

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
                        disabled={loading || !selectedSession || !selectedSubject || !selectedClass}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? "Creating…" : "Create Scheme of Work"}
                    </button>
                </div>
            </form>
        </div>
    );
}
