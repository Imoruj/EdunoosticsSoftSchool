"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface StudentScore {
    id: string; // Student ID
    firstName: string;
    lastName: string;
    admissionNumber: string;
    ca1: number;
    ca2: number;
    ca3: number;
    exam: number;
    total: number;
    grade: string;
    remark: string;
}

interface AssessmentType {
    id: string;
    name: string;
    shortName: string | null;
    maxScore: number;
    order: number;
}

interface ClassLink {
    id: string;
    name: string;
    arms: { id: string; armName: string }[];
}

interface GradingRule {
    id: string;
    minScore: number;
    maxScore: number;
    grade: string;
    remark: string;
}

interface Subject {
    id: string;
    name: string;
    code: string;
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

export default function ScoreEntryPage() {
    const { data: sessionData } = useSession();
    const isAdmin = (sessionData?.user as any)?.role === "SUPER_ADMIN" || (sessionData?.user as any)?.role === "SCHOOL_ADMIN";

    // State for dropdowns
    const [classes, setClasses] = useState<ClassLink[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>([]);
    const [gradingRules, setGradingRules] = useState<GradingRule[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);

    // Selection state
    const [selectedArmId, setSelectedArmId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [selectedSessionId, setSelectedSessionId] = useState("");
    const [selectedTermId, setSelectedTermId] = useState("");

    // Data state
    const [students, setStudents] = useState<StudentScore[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Initial fetch (Classes, Subjects, Assessment Types, Grading Rules, & Sessions)
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [classesRes, subjectsRes, assessmentRes, gradingRes, sessionsRes] = await Promise.all([
                    fetch("/api/classes"),
                    fetch("/api/subjects"),
                    fetch("/api/assessment-types"),
                    fetch("/api/grading-rules"),
                    fetch("/api/sessions")
                ]);

                if (classesRes.ok) {
                    const data = await classesRes.json();
                    setClasses(data.classes || []);
                }
                if (subjectsRes.ok) {
                    const data = await subjectsRes.json();
                    setSubjects(data.subjects || []);
                }
                if (assessmentRes.ok) {
                    const data = await assessmentRes.json();
                    setAssessmentTypes(data || []);
                }
                if (gradingRes.ok) {
                    const data = await gradingRes.json();
                    setGradingRules(data || []);
                }
                if (sessionsRes.ok) {
                    const data = await sessionsRes.json();
                    const fetchedSessions = data.sessions || [];
                    setSessions(fetchedSessions);

                    // Set default session and term
                    const currentSession = fetchedSessions.find((s: Session) => s.isCurrent) || fetchedSessions[0];
                    if (currentSession) {
                        setSelectedSessionId(currentSession.id);
                        const currentTerm = currentSession.terms.find((t: Term) => t.isCurrent) || currentSession.terms[0];
                        if (currentTerm) {
                            setSelectedTermId(currentTerm.id);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to load metadata", err);
                setError("Failed to load standard settings");
            }
        };

        fetchMetadata();
    }, []);

    // Fetch scores when selection changes
    const fetchScores = useCallback(async () => {
        if (!selectedArmId || !selectedSubjectId || !selectedTermId) return;

        setLoadingData(true);
        setError(null);
        setStudents([]); // Clear previous

        try {
            const params = new URLSearchParams({
                classId: selectedArmId, // API uses 'classId' as alias for classArmId in current implementation
                subjectId: selectedSubjectId,
                termId: selectedTermId,
            });

            const response = await fetch(`/api/scores?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch students/scores");

            const data = await response.json();
            setStudents(data.students || []);
        } catch (err: any) {
            setError(err.message || "Failed to load scores");
        } finally {
            setLoadingData(false);
        }
    }, [selectedArmId, selectedSubjectId, selectedTermId]);

    useEffect(() => {
        if (selectedArmId && selectedSubjectId) {
            fetchScores();
        }
    }, [fetchScores, selectedArmId, selectedSubjectId]); // Dependencies

    // Helper to calculate grade locally for immediate feedback
    const calculateGrade = (total: number) => {
        const rule = gradingRules.find(r => total >= r.minScore && total <= r.maxScore);
        if (rule) {
            // Determine color based on grade
            let color = "bg-gray-100 text-gray-800";
            if (rule.grade.startsWith("A")) color = "bg-green-100 text-green-800";
            else if (rule.grade.startsWith("B")) color = "bg-blue-100 text-blue-800";
            else if (rule.grade.startsWith("C")) color = "bg-yellow-100 text-yellow-800";
            else if (rule.grade.startsWith("D")) color = "bg-orange-100 text-orange-800";
            else if (rule.grade.startsWith("E")) color = "bg-orange-50 text-orange-800";
            else if (rule.grade.startsWith("F")) color = "bg-red-100 text-red-800";

            return { grade: rule.grade, remark: rule.remark, color };
        }
        return { grade: "-", remark: "-", color: "bg-gray-100 text-gray-800" };
    };

    const handleScoreChange = (studentId: string, field: "ca1" | "ca2" | "ca3" | "exam", value: string) => {
        let numValue = value === "" ? 0 : parseFloat(value);
        if (isNaN(numValue)) numValue = 0;

        // Validation caps from assessmentTypes
        const typeIndex = field === "ca1" ? 0 : field === "ca2" ? 1 : field === "ca3" ? 2 : 3;
        const type = assessmentTypes[typeIndex];
        const max = type?.maxScore || 100;

        if (numValue > max) numValue = max;
        if (numValue < 0) numValue = 0;

        setStudents(prev => prev.map(s => {
            if (s.id === studentId) {
                const updated = { ...s, [field]: numValue };
                // Recalculate total immediately
                updated.total = (updated.ca1 || 0) + (updated.ca2 || 0) + (updated.ca3 || 0) + (updated.exam || 0);
                const { grade, remark } = calculateGrade(updated.total);
                updated.grade = grade;
                updated.remark = remark;
                return updated;
            }
            return s;
        }));
    };

    const handleSave = async () => {
        if (!selectedArmId || !selectedSubjectId || students.length === 0) return;

        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const payload = {
                scores: students.map(s => ({
                    studentId: s.id,
                    ca1: s.ca1,
                    ca2: s.ca2,
                    ca3: s.ca3,
                    exam: s.exam
                })),
                subjectId: selectedSubjectId,
                termId: selectedTermId,
                classArmId: selectedArmId
            };

            const response = await fetch("/api/scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.error || "Failed to save scores");
            }

            setSuccessMessage("Scores saved successfully!");
            // Auto-hide success message
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Derived stats
    const classAverage = students.length > 0
        ? (students.reduce((acc, s) => acc + s.total, 0) / students.length).toFixed(1)
        : "0.0";
    const passRate = students.length > 0
        ? ((students.filter(s => s.total >= 40).length / students.length) * 100).toFixed(0)
        : "0";

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Score Entry</h1>
                    <p className="text-gray-500 mt-1">Record and manage assessment scores</p>
                </div>
                {students.length > 0 && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`btn-primary flex items-center gap-2 ${isSaving ? "opacity-75 cursor-not-allowed" : ""}`}
                    >
                        {isSaving ? "Saving..." : "Save Scores"}
                    </button>
                )}
            </div>

            {/* Error / Success Messages */}
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="bg-green-50 text-green-700 p-4 rounded-lg border border-green-200">
                    {successMessage}
                </div>
            )}

            {/* Selection Controls */}
            <div className="card p-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Academic Session</label>
                        <select
                            className="input w-full"
                            value={selectedSessionId}
                            onChange={(e) => {
                                const sid = e.target.value;
                                setSelectedSessionId(sid);
                                // Automatically switch to the current or first term of this session
                                const session = sessions.find(s => s.id === sid);
                                if (session) {
                                    const currentTerm = session.terms.find(t => t.isCurrent) || session.terms[0];
                                    if (currentTerm) setSelectedTermId(currentTerm.id);
                                }
                            }}
                            disabled={!isAdmin}
                        >
                            <option value="">Select Session</option>
                            {sessions.map(session => (
                                <option key={session.id} value={session.id}>
                                    {session.name} {session.isCurrent ? "(Current)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Term</label>
                        <select
                            className="input w-full"
                            value={selectedTermId}
                            onChange={(e) => setSelectedTermId(e.target.value)}
                            disabled={!isAdmin}
                        >
                            <option value="">Select Term</option>
                            {sessions.find(s => s.id === selectedSessionId)?.terms.map(term => (
                                <option key={term.id} value={term.id}>
                                    {term.name} {term.isCurrent ? "(Active)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Class Arm</label>
                        <select
                            className="input w-full"
                            value={selectedArmId}
                            onChange={(e) => setSelectedArmId(e.target.value)}
                        >
                            <option value="">Select Class</option>
                            {classes.map(cls => (
                                <optgroup key={cls.id} label={cls.name}>
                                    {cls.arms.map(arm => (
                                        <option key={arm.id} value={arm.id}>
                                            {cls.name} {arm.armName}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                        <select
                            className="input w-full"
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                        >
                            <option value="">Select Subject</option>
                            {subjects.map(subj => (
                                <option key={subj.id} value={subj.id}>{subj.name} ({subj.code})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Score Table */}
            {loadingData ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : students.length > 0 ? (
                <div className="card overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Student Scores</h3>
                        <div className="text-sm space-x-4">
                            <span className="text-gray-500">Avg: <span className="font-bold text-gray-900">{classAverage}</span></span>
                            <span className="text-gray-500">Pass Rate: <span className="font-bold text-green-600">{passRate}%</span></span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">S/N</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student</th>
                                    {assessmentTypes.map((type, idx) => (
                                        <th key={type.id} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-24">
                                            {type.name} ({type.maxScore})
                                        </th>
                                    ))}
                                    {/* Handle cases with fewer than 4 assessment types if needed, but the current UI is dynamic */}
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-20">Total</th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-20">Grade</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Remark</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {students.map((student, index) => {
                                    const { color } = calculateGrade(student.total);
                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{student.lastName} {student.firstName}</div>
                                                <div className="text-xs text-gray-400">{student.admissionNumber}</div>
                                            </td>
                                            {assessmentTypes.map((type, idx) => {
                                                const field = idx === 0 ? "ca1" : idx === 1 ? "ca2" : idx === 2 ? "ca3" : "exam";
                                                return (
                                                    <td key={type.id} className="px-2 py-3">
                                                        <input
                                                            type="number"
                                                            className="w-full h-8 text-center border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 text-sm"
                                                            value={student[field] || ""}
                                                            max={type.maxScore}
                                                            onChange={(e) => handleScoreChange(student.id, field as any, e.target.value)}
                                                        />
                                                    </td>
                                                );
                                            })}
                                            <td className="px-4 py-3 text-center font-bold text-gray-900">
                                                {student.total}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
                                                    {student.grade}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500">
                                                {student.remark}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                selectedArmId && selectedSubjectId ? (
                    <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                        <p className="text-gray-500">No students found in this class.</p>
                    </div>
                ) : (
                    <div className="card p-12 text-center">
                        <div className="flex flex-col items-center">
                            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Select Class and Subject</h3>
                            <p className="text-gray-500 max-w-md">
                                Please select a Class Arm and a Subject to start entering scores.
                            </p>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
