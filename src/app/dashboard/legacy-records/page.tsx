"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface TermOption {
    id: string;
    name: string;
    termNumber: number;
    isCurrent: boolean;
}

interface SessionOption {
    id: string;
    name: string;
    isCurrent: boolean;
    terms: TermOption[];
}

interface ClassOption {
    id: string;
    name: string;
    arms: { id: string; armName: string; _count?: { students: number } }[];
}

interface SubjectOption {
    id: string;
    name: string;
    code?: string;
    classArmIds?: string[];
}

const STEPS = [
    { number: 1, title: "Academic Sessions", description: "Create past academic sessions" },
    { number: 2, title: "Register Students", description: "Import students for past years" },
    { number: 3, title: "Upload Records", description: "Import scores for past terms" },
];

export default function LegacyRecordsPage() {
    const { data: sessionData } = useSession();
    const router = useRouter();
    const userRoles: string[] = (sessionData?.user as any)?.roles || [];
    const isAdmin = userRoles.includes("SUPER_ADMIN") || userRoles.includes("SCHOOL_ADMIN");

    const [activeStep, setActiveStep] = useState(1);

    // Metadata
    const [sessions, setSessions] = useState<SessionOption[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [subjects, setSubjects] = useState<SubjectOption[]>([]);
    const [loading, setLoading] = useState(true);

    // Step 1: Sessions state
    const [startYear, setStartYear] = useState<number>(new Date().getFullYear() - 5);
    const [endYear, setEndYear] = useState<number>(new Date().getFullYear());
    const [creatingSessions, setCreatingSessions] = useState(false);
    const [sessionResult, setSessionResult] = useState<{ created: string[]; skipped: string[]; message: string } | null>(null);

    // Step 2: Student import state
    const [importSessionId, setImportSessionId] = useState("");
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [importDryRun, setImportDryRun] = useState(false);
    const [createLoginAccounts, setCreateLoginAccounts] = useState(false);
    const [importResults, setImportResults] = useState<any>(null);

    // Step 3: Legacy records upload state
    const [selectedSessionId, setSelectedSessionId] = useState("");
    const [selectedTermId, setSelectedTermId] = useState("");
    const [selectedClassArmId, setSelectedClassArmId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [legacyFile, setLegacyFile] = useState<File | null>(null);
    const [legacyImporting, setLegacyImporting] = useState(false);
    const [legacyDryRun, setLegacyDryRun] = useState(false);
    const [legacyForceOverwrite, setLegacyForceOverwrite] = useState(false);
    const [legacyAtomic, setLegacyAtomic] = useState(true);
    const [legacyResult, setLegacyResult] = useState<any>(null);
    const [uploadHistory, setUploadHistory] = useState<{ sessionId: string; termId: string; classArmId: string; subjectId: string }[]>([]);

    // Derived values
    const importSession = sessions.find((s) => s.id === importSessionId);
    const selectedSession = sessions.find((s) => s.id === selectedSessionId);
    const termOptions = selectedSession?.terms || [];

    const classArmOptions = useMemo(() => {
        const arms: { id: string; name: string; studentCount: number }[] = [];
        classes.forEach((cls) => {
            cls.arms.forEach((arm) => {
                arms.push({
                    id: arm.id,
                    name: `${cls.name} ${arm.armName}`,
                    studentCount: arm._count?.students || 0,
                });
            });
        });
        return arms;
    }, [classes]);

    const totalStudentsInSchool = useMemo(
        () => classArmOptions.reduce((sum, arm) => sum + arm.studentCount, 0),
        [classArmOptions]
    );

    const classArmsWithStudents = useMemo(
        () => classArmOptions.filter((arm) => arm.studentCount > 0),
        [classArmOptions]
    );

    const selectedArmStudentCount = useMemo(
        () => classArmOptions.find((a) => a.id === selectedClassArmId)?.studentCount || 0,
        [classArmOptions, selectedClassArmId]
    );

    const noStudentsRegistered = selectedSessionId && totalStudentsInSchool === 0;
    const selectedClassHasNoStudents = selectedClassArmId && selectedArmStudentCount === 0;

    const filteredSubjects = useMemo(() => {
        if (!selectedClassArmId) return subjects;
        return subjects.filter(
            (s) => !s.classArmIds || s.classArmIds.length === 0 || s.classArmIds.includes(selectedClassArmId)
        );
    }, [subjects, selectedClassArmId]);

    // Fetch metadata
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [classesRes, subjectsRes, sessionsRes] = await Promise.all([
                    fetch("/api/classes"),
                    fetch("/api/subjects"),
                    fetch("/api/sessions"),
                ]);

                if (classesRes.ok) {
                    const data = await classesRes.json();
                    setClasses(data.classes || []);
                }
                if (subjectsRes.ok) {
                    const data = await subjectsRes.json();
                    setSubjects(data.subjects || []);
                }
                if (sessionsRes.ok) {
                    const data = await sessionsRes.json();
                    setSessions(data.sessions || []);
                }
            } catch (err) {
                console.error("Failed to load metadata", err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetadata();
    }, []);

    // Refresh sessions after batch create
    const refreshSessions = async () => {
        try {
            const res = await fetch("/api/sessions");
            if (res.ok) {
                const data = await res.json();
                setSessions(data.sessions || []);
            }
        } catch (err) {
            console.error("Failed to refresh sessions", err);
        }
    };

    // Refresh classes to get updated student counts
    const refreshClasses = async (sessionId?: string) => {
        try {
            const url = sessionId ? `/api/classes?sessionId=${sessionId}` : "/api/classes";
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setClasses(data.classes || []);
            }
        } catch (err) {
            console.error("Failed to refresh classes", err);
        }
    };

    // Step 1: Create batch sessions
    const handleCreateSessions = async () => {
        if (startYear >= endYear) return;
        setCreatingSessions(true);
        setSessionResult(null);

        try {
            const res = await fetch("/api/sessions/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ startYear, endYear }),
            });

            const data = await res.json();
            if (res.ok) {
                setSessionResult(data);
                await refreshSessions();
            } else {
                setSessionResult({ created: [], skipped: [], message: data.error || "Failed to create sessions" });
            }
        } catch (err) {
            setSessionResult({ created: [], skipped: [], message: "Network error" });
        } finally {
            setCreatingSessions(false);
        }
    };

    // Step 2: Import students (legacy mode)
    const handleImportStudents = async () => {
        if (!importFile) return;
        setImporting(true);
        setImportResults(null);

        try {
            const formData = new FormData();
            formData.append("file", importFile);
            formData.append("dryRun", importDryRun.toString());
            formData.append("createLoginAccounts", createLoginAccounts.toString());
            formData.append("legacyMode", "true");

            const res = await fetch("/api/students/import", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            setImportResults(data);
            // Refresh class student counts after successful import
            if (data.success > 0 && !data.dryRun) {
                await refreshClasses();
            }
        } catch (err: any) {
            const isFileChanged = err?.message?.includes("ERR_UPLOAD_FILE_CHANGED") ||
                err?.name === "TypeError";
            if (isFileChanged) {
                setImportFile(null);
                setImportResults({ success: 0, failed: 0, skipped: 0, errors: ["The selected file was modified after being chosen. Please re-select the file and try again."] });
            } else {
                setImportResults({ success: 0, failed: 0, skipped: 0, errors: ["Network error"] });
            }
        } finally {
            setImporting(false);
        }
    };

    // Step 2: Download student template
    const downloadStudentTemplate = () => {
        const headers = [
            "First Name", "Last Name", "Other Names", "Admission Number",
            "Gender", "Date of Birth", "Class", "State of Origin",
            "Religion", "Blood Group", "Parent Name", "Parent Phone",
            "Parent Email", "Address", "Status",
        ];
        const instructions = [
            "Required", "Required", "Optional", "Optional (auto-generated if empty)",
            "Required (MALE/FEMALE)", "Optional (YYYY-MM-DD)", "Required (e.g. Primary 1 A)",
            "Optional", "Optional", "Optional", "Optional", "Optional",
            "Optional", "Optional", "Optional (active/inactive, defaults to inactive for legacy)",
        ];
        const csv = [headers.join(","), instructions.join(",")].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "legacy_students_template.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    // Step 3: Download legacy scores template
    const downloadLegacyTemplate = async () => {
        if (!selectedClassArmId) return;

        const params = new URLSearchParams({ classArmId: selectedClassArmId });
        if (selectedSubjectId) params.append("subjectId", selectedSubjectId);

        try {
            const res = await fetch(`/api/students/legacy-records/template?${params}`);
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `legacy_scores_template.csv`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error("Failed to download template", err);
        }
    };

    // Step 3: Upload legacy records
    const handleUploadLegacyRecords = async () => {
        if (!legacyFile || !selectedTermId || !selectedClassArmId || !selectedSubjectId) return;
        setLegacyImporting(true);
        setLegacyResult(null);

        try {
            const formData = new FormData();
            formData.append("file", legacyFile);
            formData.append("termId", selectedTermId);
            formData.append("classArmId", selectedClassArmId);
            formData.append("subjectId", selectedSubjectId);
            formData.append("dryRun", legacyDryRun.toString());
            formData.append("forceOverwrite", legacyForceOverwrite.toString());
            formData.append("atomic", legacyAtomic.toString());

            const res = await fetch("/api/students/legacy-records/import", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            setLegacyResult(data);

            if (res.ok && data.status === "saved") {
                setUploadHistory((prev) => [
                    ...prev,
                    { sessionId: selectedSessionId, termId: selectedTermId, classArmId: selectedClassArmId, subjectId: selectedSubjectId },
                ]);
            }
        } catch (err: any) {
            const isFileChanged = err?.message?.includes("ERR_UPLOAD_FILE_CHANGED") ||
                err?.name === "TypeError";
            if (isFileChanged) {
                setLegacyFile(null);
                setLegacyResult({ status: "error", success: 0, failed: 0, errors: ["The selected file was modified after being chosen. Please re-select the file and try again."] });
            } else {
                setLegacyResult({ status: "error", success: 0, failed: 0, errors: ["Network error"] });
            }
        } finally {
            setLegacyImporting(false);
        }
    };

    // Check if a subject/term combo has been uploaded this session
    const isUploaded = (termId: string, subjectId: string) => {
        return uploadHistory.some(
            (h) => h.termId === termId && h.subjectId === subjectId && h.classArmId === selectedClassArmId
        );
    };

    if (!isAdmin) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
                <p className="text-gray-500 mt-2">Only administrators can access this page.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Import Historical Records</h1>
                <p className="text-gray-500 mt-1">
                    Digitize student records from academic years prior to adopting this system.
                </p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2">
                {STEPS.map((step, index) => (
                    <div key={step.number} className="flex items-center">
                        <button
                            onClick={() => setActiveStep(step.number)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                activeStep === step.number
                                    ? "bg-primary-600 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                        >
                            <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    activeStep === step.number
                                        ? "bg-white text-primary-600"
                                        : "bg-gray-300 text-white"
                                }`}
                            >
                                {step.number}
                            </span>
                            <span className="hidden sm:inline">{step.title}</span>
                        </button>
                        {index < STEPS.length - 1 && (
                            <svg className="w-5 h-5 text-gray-300 mx-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        )}
                    </div>
                ))}
            </div>

            {/* Step 1: Academic Sessions */}
            {activeStep === 1 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Step 1: Set Up Academic Sessions</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Create academic sessions for the past years you want to import records for. Each session will be created with 3 terms (First, Second, Third).
                        </p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Batch Create Form */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
                            <h3 className="text-sm font-semibold text-blue-900">Batch Create Past Sessions</h3>
                            <div className="flex flex-wrap items-end gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">From Year</label>
                                    <input
                                        type="number"
                                        value={startYear}
                                        onChange={(e) => setStartYear(parseInt(e.target.value) || 2000)}
                                        className="input w-32"
                                        min={1990}
                                        max={new Date().getFullYear()}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">To Year</label>
                                    <input
                                        type="number"
                                        value={endYear}
                                        onChange={(e) => setEndYear(parseInt(e.target.value) || new Date().getFullYear())}
                                        className="input w-32"
                                        min={1990}
                                        max={new Date().getFullYear() + 1}
                                    />
                                </div>
                                <button
                                    onClick={handleCreateSessions}
                                    disabled={creatingSessions || startYear >= endYear}
                                    className="btn-primary"
                                >
                                    {creatingSessions ? "Creating..." : `Create ${Math.max(0, endYear - startYear)} Session(s)`}
                                </button>
                            </div>
                            <p className="text-xs text-blue-700">
                                This will create sessions: {startYear < endYear
                                    ? Array.from({ length: Math.min(endYear - startYear, 20) }, (_, i) => `${startYear + i}/${startYear + i + 1}`).join(", ")
                                    : "None"}
                            </p>
                        </div>

                        {/* Session Result */}
                        {sessionResult && (
                            <div className={`border rounded-lg p-4 ${sessionResult.created.length > 0 ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
                                <p className="text-sm font-medium text-gray-900">{sessionResult.message}</p>
                                {sessionResult.created.length > 0 && (
                                    <p className="text-sm text-green-700 mt-1">
                                        Created: {sessionResult.created.join(", ")}
                                    </p>
                                )}
                                {sessionResult.skipped.length > 0 && (
                                    <p className="text-sm text-gray-500 mt-1">
                                        Already existed: {sessionResult.skipped.join(", ")}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Existing Sessions List */}
                        <div>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">Existing Academic Sessions</h3>
                            {sessions.length === 0 ? (
                                <p className="text-sm text-gray-500">No sessions found. Create some above.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {sessions.map((session) => (
                                        <div
                                            key={session.id}
                                            className={`border rounded-lg p-3 ${
                                                session.isCurrent
                                                    ? "border-primary-300 bg-primary-50"
                                                    : "border-gray-200 bg-white"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-900">{session.name}</span>
                                                {session.isCurrent && (
                                                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                                                        Current
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {session.terms.length} term{session.terms.length !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-gray-200">
                            <button onClick={() => setActiveStep(2)} className="btn-primary">
                                Next: Register Students
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 2: Register Students */}
            {activeStep === 2 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Step 2: Register Students</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Import students who were enrolled in the school during past years. Students already in the system will be skipped automatically.
                        </p>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Session Selector */}
                        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                            <label className="block text-sm font-semibold text-primary-900 mb-2">
                                Which academic session are these students from? *
                            </label>
                            <select
                                className="input w-full max-w-sm"
                                value={importSessionId}
                                onChange={(e) => setImportSessionId(e.target.value)}
                                disabled={importing}
                            >
                                <option value="">Select Academic Session</option>
                                {sessions.map((session) => (
                                    <option key={session.id} value={session.id}>
                                        {session.name} {session.isCurrent ? "(Current)" : ""}
                                    </option>
                                ))}
                            </select>
                            {importSession && (
                                <p className="text-xs text-primary-700 mt-2">
                                    Importing students for <strong>{importSession.name}</strong>. The &quot;Class&quot; column in your CSV should reflect the class each student was in during this session.
                                </p>
                            )}
                        </div>

                        {/* Info Banner */}
                        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                            <div className="flex">
                                <div className="shrink-0">
                                    <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-amber-800">
                                        <strong>Legacy Mode:</strong> Students with admission numbers that already exist in the system will be skipped (not duplicated). New students will be created as <strong>inactive</strong> by default (assumed graduated). Set the Status column to &quot;active&quot; for students still enrolled.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Template Download */}
                        <div>
                            <button onClick={downloadStudentTemplate} className="btn-secondary text-sm">
                                <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download CSV Template
                            </button>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={importDryRun}
                                    onChange={(e) => setImportDryRun(e.target.checked)}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    disabled={importing}
                                />
                                Dry run (validate only, no save)
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={createLoginAccounts}
                                    onChange={(e) => setCreateLoginAccounts(e.target.checked)}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    disabled={importing}
                                />
                                Create login accounts
                            </label>
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV File</label>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => {
                                    setImportFile(e.target.files?.[0] || null);
                                    setImportResults(null);
                                }}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                disabled={importing}
                            />
                        </div>

                        {/* Import Button */}
                        <div>
                            <button
                                onClick={handleImportStudents}
                                disabled={!importFile || importing}
                                className="btn-primary"
                            >
                                {importing ? "Importing..." : importDryRun ? "Validate CSV" : "Import Students"}
                            </button>
                        </div>

                        {/* Import Results */}
                        {importResults && (
                            <div className="space-y-3 border border-gray-200 rounded-lg p-4">
                                <div className="flex flex-wrap items-center gap-4">
                                    {importResults.success > 0 && (
                                        <div className="flex items-center gap-2 text-green-600">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-medium">
                                                {importResults.success} {importResults.dryRun ? "validated" : "imported"}
                                            </span>
                                        </div>
                                    )}
                                    {importResults.skipped > 0 && (
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-medium">
                                                {importResults.skipped} skipped (already exist)
                                            </span>
                                        </div>
                                    )}
                                    {importResults.failed > 0 && (
                                        <div className="flex items-center gap-2 text-red-600">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-medium">{importResults.failed} failed</span>
                                        </div>
                                    )}
                                </div>

                                {importResults.errors?.length > 0 && (
                                    <div className="bg-red-50 rounded-md p-3 max-h-40 overflow-y-auto">
                                        <ul className="text-sm text-red-700 space-y-1">
                                            {importResults.errors.map((error: string, idx: number) => (
                                                <li key={idx}>&bull; {error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-between pt-4 border-t border-gray-200">
                            <button onClick={() => setActiveStep(1)} className="btn-secondary">
                                Back
                            </button>
                            <button onClick={() => setActiveStep(3)} className="btn-primary">
                                Next: Upload Records
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3: Upload Academic Records */}
            {activeStep === 3 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Step 3: Upload Academic Records</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Import scores for each subject, term, and class. Select the context, then upload the scores CSV.
                        </p>
                    </div>

                    <div className="p-6 space-y-5">
                        {/* Session & Class Selection */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Session *</label>
                                <select
                                    className="input w-full"
                                    value={selectedSessionId}
                                    onChange={(e) => {
                                        setSelectedSessionId(e.target.value);
                                        setSelectedTermId("");
                                        setSelectedClassArmId("");
                                        setSelectedSubjectId("");
                                        setLegacyResult(null);
                                    }}
                                    disabled={legacyImporting}
                                >
                                    <option value="">Select Session</option>
                                    {sessions.map((session) => (
                                        <option key={session.id} value={session.id}>
                                            {session.name} {session.isCurrent ? "(Current)" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                                <select
                                    className="input w-full"
                                    value={selectedClassArmId}
                                    onChange={(e) => {
                                        setSelectedClassArmId(e.target.value);
                                        setSelectedSubjectId("");
                                        setLegacyResult(null);
                                    }}
                                    disabled={legacyImporting || !selectedSessionId}
                                >
                                    <option value="">Select Class</option>
                                    {classArmOptions.map((option) => (
                                        <option key={option.id} value={option.id} disabled={option.studentCount === 0}>
                                            {option.name} ({option.studentCount} student{option.studentCount !== 1 ? "s" : ""})
                                        </option>
                                    ))}
                                </select>
                                {selectedClassArmId && selectedArmStudentCount > 0 && (
                                    <p className="text-xs text-green-600 mt-1">{selectedArmStudentCount} student{selectedArmStudentCount !== 1 ? "s" : ""} registered in this class</p>
                                )}
                            </div>
                        </div>

                        {/* No students warning */}
                        {noStudentsRegistered && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-semibold text-red-800">No students registered</p>
                                        <p className="text-sm text-red-700 mt-1">
                                            There are no students registered in any class. You need to import students before you can upload academic records.
                                        </p>
                                        <button
                                            onClick={() => setActiveStep(2)}
                                            className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-900"
                                        >
                                            Go to Step 2: Register Students
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Selected class has no students warning */}
                        {selectedClassHasNoStudents && !noStudentsRegistered && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <p className="text-sm text-amber-800">
                                        This class has no students. Select a class with registered students, or{" "}
                                        <button onClick={() => setActiveStep(2)} className="font-medium underline hover:text-amber-900">import students first</button>.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Term & Subject — only enabled when class has students */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Term *</label>
                                <select
                                    className="input w-full"
                                    value={selectedTermId}
                                    onChange={(e) => {
                                        setSelectedTermId(e.target.value);
                                        setLegacyResult(null);
                                    }}
                                    disabled={legacyImporting || !selectedSessionId || !selectedClassArmId || selectedArmStudentCount === 0}
                                >
                                    <option value="">Select Term</option>
                                    {termOptions.map((term) => (
                                        <option key={term.id} value={term.id}>
                                            {term.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                                <select
                                    className="input w-full"
                                    value={selectedSubjectId}
                                    onChange={(e) => {
                                        setSelectedSubjectId(e.target.value);
                                        setLegacyResult(null);
                                    }}
                                    disabled={legacyImporting || !selectedClassArmId || selectedArmStudentCount === 0}
                                >
                                    <option value="">Select Subject</option>
                                    {filteredSubjects.map((subject) => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Template Download */}
                        <div>
                            <button
                                onClick={downloadLegacyTemplate}
                                disabled={!selectedClassArmId}
                                className="btn-secondary text-sm"
                            >
                                <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Download Scores Template
                            </button>
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Scores CSV File *</label>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={(e) => {
                                    setLegacyFile(e.target.files?.[0] || null);
                                    setLegacyResult(null);
                                }}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                disabled={legacyImporting}
                            />
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 rounded-lg p-3">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={legacyDryRun}
                                    onChange={(e) => setLegacyDryRun(e.target.checked)}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    disabled={legacyImporting}
                                />
                                Dry run
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={legacyForceOverwrite}
                                    onChange={(e) => setLegacyForceOverwrite(e.target.checked)}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    disabled={legacyImporting}
                                />
                                Force overwrite
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={legacyAtomic}
                                    onChange={(e) => setLegacyAtomic(e.target.checked)}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    disabled={legacyImporting}
                                />
                                Atomic (all or nothing)
                            </label>
                        </div>

                        {/* Upload Button */}
                        <div>
                            <button
                                onClick={handleUploadLegacyRecords}
                                disabled={!legacyFile || !selectedTermId || !selectedClassArmId || !selectedSubjectId || legacyImporting}
                                className="btn-primary"
                            >
                                {legacyImporting ? "Uploading..." : legacyDryRun ? "Validate Scores" : "Upload Scores"}
                            </button>
                        </div>

                        {/* Upload Results */}
                        {legacyResult && (
                            <div className="space-y-3 border border-gray-200 rounded-lg p-4">
                                {legacyResult.status === "saved" || legacyResult.status === "dry_run" ? (
                                    <div className="flex items-center gap-2 text-green-600">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium">
                                            {legacyResult.success} rows {legacyResult.dryRun ? "validated" : "processed"} successfully
                                        </span>
                                    </div>
                                ) : null}

                                {legacyResult.status === "conflict_admin" && (
                                    <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 text-sm space-y-2">
                                        <p>
                                            {legacyResult.conflictCount || 0} student(s) already have existing records for the selected term/subject.
                                            Enable <span className="font-semibold">Force overwrite</span> and re-run to replace them.
                                        </p>
                                        {legacyResult.affectedStudents?.length > 0 && (
                                            <ul className="list-disc list-inside">
                                                {legacyResult.affectedStudents.slice(0, 10).map((student: any, idx: number) => (
                                                    <li key={idx}>{student.name} ({student.admissionNumber})</li>
                                                ))}
                                                {legacyResult.affectedStudents.length > 10 && (
                                                    <li>...and {legacyResult.affectedStudents.length - 10} more</li>
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                {legacyResult.failed > 0 && (
                                    <div className="flex items-center gap-2 text-red-600">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="font-medium">{legacyResult.failed} rows failed</span>
                                    </div>
                                )}

                                {legacyResult.errors?.length > 0 && (
                                    <div className="bg-red-50 rounded-md p-3 max-h-40 overflow-y-auto">
                                        <ul className="text-sm text-red-700 space-y-1">
                                            {legacyResult.errors.map((error: string, idx: number) => (
                                                <li key={idx}>&bull; {error}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Upload Progress Matrix */}
                        {uploadHistory.length > 0 && selectedSessionId && selectedClassArmId && (
                            <div className="border border-gray-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">Upload Progress (This Session)</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-200">
                                                <th className="text-left py-2 pr-4 font-medium text-gray-700">Subject</th>
                                                {termOptions.map((term) => (
                                                    <th key={term.id} className="text-center py-2 px-3 font-medium text-gray-700">
                                                        {term.name}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {subjects.map((subject) => (
                                                <tr key={subject.id} className="border-b border-gray-100">
                                                    <td className="py-2 pr-4 text-gray-900">{subject.name}</td>
                                                    {termOptions.map((term) => (
                                                        <td key={term.id} className="text-center py-2 px-3">
                                                            {isUploaded(term.id, subject.id) ? (
                                                                <svg className="w-5 h-5 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            ) : (
                                                                <span className="text-gray-300">&mdash;</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between pt-4 border-t border-gray-200">
                            <button onClick={() => setActiveStep(2)} className="btn-secondary">
                                Back
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
