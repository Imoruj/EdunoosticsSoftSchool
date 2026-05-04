
"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import { showSuccessMessage } from "@/lib/successMessage";

interface StudentAssessment {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    ratings: Record<string, number>; // "trait_<id>" or "skill_<id>" -> rating
}

interface Trait {
    id: string;
    name: string;
}

interface Skill {
    id: string;
    name: string;
}

interface ClassArmOption {
    id: string;
    armName: string;
    class: {
        id: string;
        name: string;
    };
}

interface Term {
    id: string;
    name: string;
    isCurrent: boolean;
}

interface Session {
    id: string;
    name: string;
    isCurrent: boolean;
    terms: Term[];
}

const RATING_SEQUENCE = [1, 2, 3, 4, 5] as const;

const RATING_STYLES: Record<number, string> = {
    1: "bg-red-100 text-red-700 ring-red-300",
    2: "bg-orange-100 text-orange-700 ring-orange-300",
    3: "bg-amber-100 text-amber-700 ring-amber-300",
    4: "bg-blue-100 text-blue-700 ring-blue-300",
    5: "bg-green-100 text-green-700 ring-green-300",
};

function getNextRating(currentRating?: number) {
    if (!currentRating || currentRating < 1 || currentRating > 5) {
        return 1;
    }

    return currentRating === 5 ? 1 : currentRating + 1;
}

export default function AssessmentPage() {
    const { data: sessionData } = useSession();
    const sessionUser = sessionData?.user as { roles?: string[] } | undefined;
    const userRoles: string[] = Array.isArray(sessionUser?.roles)
        ? sessionUser.roles
        : [];
    const isAdmin =
        userRoles.includes("SUPER_ADMIN") ||
        userRoles.includes("SCHOOL_ADMIN");
    const isClassTeacher = userRoles.includes("CLASS_TEACHER");
    const restrictToAssignedScope = !isAdmin && isClassTeacher;

    // Metadata State
    const [sessions, setSessions] = useState<Session[]>([]);
    const [classes, setClasses] = useState<ClassArmOption[]>([]);
    const [sessionIdsByClassArm, setSessionIdsByClassArm] = useState<Record<string, string[]>>({});
    const [traits, setTraits] = useState<Trait[]>([]);
    const [skills, setSkills] = useState<Skill[]>([]);

    // Selection State
    const [selectedSessionId, setSelectedSessionId] = useState("");
    const [selectedTermId, setSelectedTermId] = useState("");
    const [selectedClassArmId, setSelectedClassArmId] = useState("");

    // Data State
    const [students, setStudents] = useState<StudentAssessment[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Mobile UX
    const [filtersOpen, setFiltersOpen] = useState(true);

    const visibleSessionIds =
        restrictToAssignedScope && selectedClassArmId
            ? (sessionIdsByClassArm[selectedClassArmId] || [])
            : sessions.map((s) => s.id);
    const visibleSessions = sessions.filter((s) => visibleSessionIds.includes(s.id));
    const currentSession = visibleSessions.find((s) => s.id === selectedSessionId);
    const availableTerms = currentSession ? currentSession.terms : [];

    // Initial Fetch (Scoped Classes & Sessions)
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch("/api/assessments/metadata");
                if (!response.ok) {
                    throw new Error("Failed to fetch assessment metadata");
                }

                const data = await response.json();
                const fetchedSessions: Session[] = data.sessions || [];
                const fetchedClasses: ClassArmOption[] = data.classes || [];
                const mapByClassArm: Record<string, string[]> = data.sessionIdsByClassArm || {};

                setSessions(fetchedSessions);
                setClasses(fetchedClasses);
                setSessionIdsByClassArm(mapByClassArm);

                const defaultClassArmId =
                    restrictToAssignedScope
                        ? (fetchedClasses[0]?.id || "")
                        : "";

                if (defaultClassArmId) {
                    setSelectedClassArmId(defaultClassArmId);
                }

                const initialVisibleSessions =
                    restrictToAssignedScope && defaultClassArmId
                        ? fetchedSessions.filter((s) => (mapByClassArm[defaultClassArmId] || []).includes(s.id))
                        : fetchedSessions;

                const defaultSession =
                    initialVisibleSessions.find((s) => s.isCurrent) ||
                    initialVisibleSessions[0];

                if (defaultSession) {
                    setSelectedSessionId(defaultSession.id);
                    const defaultTerm =
                        defaultSession.terms.find((t) => t.isCurrent) ||
                        defaultSession.terms[0];
                    setSelectedTermId(defaultTerm?.id || "");
                } else {
                    setSelectedSessionId("");
                    setSelectedTermId("");
                }
            } catch (err) {
                console.error("Failed to load metadata", err);
                toast.error("Failed to load settings");
            }
        };
        fetchMetadata();
    }, [restrictToAssignedScope]);

    useEffect(() => {
        if (!restrictToAssignedScope || !selectedClassArmId) return;

        const selectedSession = visibleSessions.find((s) => s.id === selectedSessionId);
        if (selectedSession) {
            const termExists = selectedSession.terms.some((t) => t.id === selectedTermId);
            if (!termExists) {
                const defaultTerm =
                    selectedSession.terms.find((t) => t.isCurrent) ||
                    selectedSession.terms[0];
                setSelectedTermId(defaultTerm?.id || "");
            }
            return;
        }

        const nextSession = visibleSessions.find((s) => s.isCurrent) || visibleSessions[0];
        if (!nextSession) {
            setSelectedSessionId("");
            setSelectedTermId("");
            return;
        }

        setSelectedSessionId(nextSession.id);
        const defaultTerm =
            nextSession.terms.find((t) => t.isCurrent) ||
            nextSession.terms[0];
        setSelectedTermId(defaultTerm?.id || "");
    }, [
        restrictToAssignedScope,
        selectedClassArmId,
        selectedSessionId,
        selectedTermId,
        visibleSessions
    ]);

    // Fetch Assessment Data
    const fetchAssessments = useCallback(async () => {
        if (!selectedClassArmId || !selectedTermId) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/assessments?classArmId=${selectedClassArmId}&termId=${selectedTermId}`);
            if (res.ok) {
                const data = await res.json();
                setTraits(data.traits || []);
                setSkills(data.skills || []);
                setStudents(data.students || []);
            } else {
                throw new Error("Failed to fetch assessments");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch assessment data");
        } finally {
            setLoading(false);
        }
    }, [selectedClassArmId, selectedTermId]);

    useEffect(() => {
        if (selectedClassArmId && selectedTermId) {
            fetchAssessments().then(() => setFiltersOpen(false));
        } else {
            setTraits([]);
            setSkills([]);
            setStudents([]);
            setFiltersOpen(true);
        }
    }, [fetchAssessments, selectedClassArmId, selectedTermId]);

    const handleRatingCycle = (studentId: string, key: string) => {
        setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
                const currentRating = s.ratings[key];
                return {
                    ...s,
                    ratings: {
                        ...s.ratings,
                        [key]: getNextRating(currentRating)
                    }
                };
            }
            return s;
        }));
    };

    const handleSave = async () => {
        if (!selectedClassArmId || !selectedTermId) return;
        setSaving(true);
        try {
            const updates = students.map(s => ({
                studentId: s.id,
                ratings: s.ratings
            }));

            const res = await fetch("/api/assessments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    classArmId: selectedClassArmId,
                    termId: selectedTermId,
                    updates
                })
            });

            if (res.ok) {
                showSuccessMessage("Assessments saved successfully", { title: "Assessments Saved!" });
            } else {
                throw new Error("Failed to save");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to save assessments");
        } finally {
            setSaving(false);
        }
    };

    const selectedClassName = (() => {
        const arm = classes.find((c) => c.id === selectedClassArmId);
        return arm ? `${arm.class.name} ${arm.armName}` : "";
    })();
    const selectedTermName = availableTerms.find((t) => t.id === selectedTermId)?.name ?? "";
    const selectedSessionName = visibleSessions.find((s) => s.id === selectedSessionId)?.name ?? "";

    return (
        <div className="flex flex-col gap-4 md:gap-6 md:h-[calc(100vh-100px)]">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Affective & Psychomotor</h1>
                    <p className="text-gray-500 mt-1 text-sm">Assess student traits and skills (1-5 Scale)</p>
                </div>
                {students.length > 0 && (
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary flex items-center gap-2 sm:shrink-0"
                    >
                        {saving ? "Saving..." : "Save Assessments"}
                    </button>
                )}
            </div>

            {/* Filters — collapsible on mobile once a class is loaded */}
            <div className="card shrink-0">
                {/* Mobile collapsed summary bar */}
                {!filtersOpen && (
                    <div className="md:hidden flex items-center justify-between px-4 py-3 gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{selectedClassName}</p>
                            <p className="text-xs text-gray-500 truncate">{selectedSessionName} · {selectedTermName}</p>
                        </div>
                        <button
                            onClick={() => setFiltersOpen(true)}
                            className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 active:scale-95 transition-all"
                        >
                            Change
                        </button>
                    </div>
                )}

                {/* Full filter controls */}
                <div className={`p-4 md:p-6 ${!filtersOpen ? "hidden md:block" : ""}`}>
                    <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Academic Session</label>
                            <select
                                className="input w-full"
                                value={selectedSessionId}
                                onChange={(e) => {
                                    const sid = e.target.value;
                                    setSelectedSessionId(sid);
                                    const session = visibleSessions.find((s) => s.id === sid);
                                    if (session) {
                                        const currentTerm = session.terms.find((t) => t.isCurrent) || session.terms[0];
                                        if (currentTerm) setSelectedTermId(currentTerm.id);
                                    } else {
                                        setSelectedTermId("");
                                    }
                                }}
                                disabled={visibleSessions.length === 0}
                            >
                                {!restrictToAssignedScope && <option value="">Select Session</option>}
                                {visibleSessions.map((s) => (
                                    <option key={s.id} value={s.id}>{s.name} {s.isCurrent ? "(Current)" : ""}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
                            <select
                                className="input w-full"
                                value={selectedTermId}
                                onChange={(e) => setSelectedTermId(e.target.value)}
                                disabled={!selectedSessionId || availableTerms.length === 0}
                            >
                                <option value="">Select Term</option>
                                {availableTerms.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name} {t.isCurrent ? "(Active)" : ""}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                            <select
                                className="input w-full"
                                value={selectedClassArmId}
                                onChange={(e) => setSelectedClassArmId(e.target.value)}
                                disabled={classes.length === 0}
                            >
                                {!restrictToAssignedScope && <option value="">Select Class</option>}
                                {classes.map((classArm) => (
                                    <option key={classArm.id} value={classArm.id}>
                                        {classArm.class.name} {classArm.armName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {/* Confirm button on mobile — appears after selects are filled */}
                    {selectedClassArmId && selectedTermId && (
                        <div className="md:hidden mt-4 flex justify-end">
                            <button
                                onClick={() => setFiltersOpen(false)}
                                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 active:scale-95 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Student Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : students.length > 0 ? (
                <div className="card md:flex-1 md:overflow-hidden flex flex-col">
                    <div className="overflow-auto flex-1">
                        <table className="w-full border-collapse">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-10 border-b bg-gray-50 sticky left-0 z-20">S/N</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase min-w-[160px] border-b bg-gray-50 sticky left-10 z-20">Student</th>

                                    {traits.length > 0 && (
                                        <th colSpan={traits.length} className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase border-b border-l border-r border-gray-200 bg-blue-50">
                                            Affective Traits (1-5)
                                        </th>
                                    )}
                                    {skills.length > 0 && (
                                        <th colSpan={skills.length} className="px-4 py-2 text-center text-xs font-bold text-gray-700 uppercase border-b border-r border-gray-200 bg-green-50">
                                            Psychomotor Skills (1-5)
                                        </th>
                                    )}
                                </tr>
                                <tr>
                                    <th className="px-4 py-2 bg-gray-50 border-b border-gray-200 sticky left-0 top-[37px] z-20"></th>
                                    <th className="px-4 py-2 bg-gray-50 border-b border-gray-200 sticky left-10 top-[37px] z-20"></th>
                                    {traits.map(trait => (
                                        <th key={trait.id} className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase border-b border-gray-200 min-w-[80px] bg-blue-50/50" title={trait.name}>
                                            <div className="truncate max-w-[80px]">{trait.name}</div>
                                        </th>
                                    ))}
                                    {skills.map(skill => (
                                        <th key={skill.id} className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase border-b border-gray-200 min-w-[80px] bg-green-50/50" title={skill.name}>
                                            <div className="truncate max-w-[80px]">{skill.name}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {students.map((student, idx) => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-500 sticky left-0 bg-white border-r border-gray-100 z-10">{idx + 1}</td>
                                        <td className="px-4 py-3 sticky left-10 bg-white border-r border-gray-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                            <div className="font-medium text-gray-900 text-sm">{student.lastName} {student.firstName}</div>
                                            <div className="text-xs text-gray-400">{student.admissionNumber}</div>
                                        </td>
                                        {traits.map(trait => (
                                            <td key={trait.id} className="p-2 border-r border-gray-100 last:border-r-0 bg-blue-50/10">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRatingCycle(student.id, `trait_${trait.id}`)}
                                                    className={`mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95 ${student.ratings[`trait_${trait.id}`]
                                                        ? `${RATING_STYLES[student.ratings[`trait_${trait.id}`]]} ring-2 ring-offset-1`
                                                        : "bg-white text-gray-400 ring-1 ring-gray-200 hover:bg-gray-50"
                                                    }`}
                                                    title={`${trait.name}: ${student.ratings[`trait_${trait.id}`] || "Not rated"}. Click to cycle score.`}
                                                    aria-label={`${trait.name} rating for ${student.lastName} ${student.firstName}`}
                                                >
                                                    {student.ratings[`trait_${trait.id}`] || "-"}
                                                </button>
                                            </td>
                                        ))}
                                        {skills.map(skill => (
                                            <td key={skill.id} className="p-2 border-r border-gray-100 last:border-r-0 bg-green-50/10">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRatingCycle(student.id, `skill_${skill.id}`)}
                                                    className={`mx-auto inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all hover:opacity-90 active:scale-95 ${student.ratings[`skill_${skill.id}`]
                                                        ? `${RATING_STYLES[student.ratings[`skill_${skill.id}`]]} ring-2 ring-offset-1`
                                                        : "bg-white text-gray-400 ring-1 ring-gray-200 hover:bg-gray-50"
                                                    }`}
                                                    title={`${skill.name}: ${student.ratings[`skill_${skill.id}`] || "Not rated"}. Click to cycle score.`}
                                                    aria-label={`${skill.name} rating for ${student.lastName} ${student.firstName}`}
                                                >
                                                    {student.ratings[`skill_${skill.id}`] || "-"}
                                                </button>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Footer — hint + mobile save button */}
                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-4 shrink-0">
                        <p className="text-xs text-gray-500">Click any rating box to cycle score: 1 → 2 → 3 → 4 → 5 → 1</p>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="md:hidden shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 active:scale-95 transition-all"
                        >
                            {saving ? "Saving..." : "Save"}
                        </button>
                    </div>
                </div>
            ) : (
                selectedClassArmId && selectedTermId ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-500">No students found in this class.</p>
                    </div>
                ) : (
                    <div className="card p-12 text-center shrink-0">
                        <div className="flex flex-col items-center">
                            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Select Class</h3>
                            <p className="text-gray-500 max-w-md">
                                Please select a Class Arm to start entering affective and psychomotor ratings.
                            </p>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
