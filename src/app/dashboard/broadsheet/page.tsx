"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import BroadsheetPreviewModal from "@/components/reports/BroadsheetPreviewModal";
import { BroadsheetData } from "@/components/reports/broadsheetTypes";
import { toast } from "react-hot-toast";

interface ClassArm {
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

export default function BroadsheetPage() {
    const { data: sessionData } = useSession();
    const userRoles: string[] = Array.isArray((sessionData?.user as any)?.roles)
        ? (sessionData?.user as any).roles
        : [];
    const isAdmin =
        userRoles.includes("SUPER_ADMIN") ||
        userRoles.includes("SCHOOL_ADMIN");
    const isClassTeacher = userRoles.includes("CLASS_TEACHER");
    const restrictToAssignedScope = !isAdmin && isClassTeacher;

    const [sessions, setSessions] = useState<Session[]>([]);
    const [classes, setClasses] = useState<ClassArm[]>([]);
    const [sessionIdsByClassArm, setSessionIdsByClassArm] = useState<Record<string, string[]>>({});

    const [selectedSessionId, setSelectedSessionId] = useState("");
    const [selectedTermId, setSelectedTermId] = useState("");
    const [selectedClassArmId, setSelectedClassArmId] = useState("");
    const [reportType, setReportType] = useState<"halfTerm" | "endOfTerm">("endOfTerm");

    const [broadsheetData, setBroadsheetData] = useState<BroadsheetData | null>(null);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Fetch broadsheet metadata on mount
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await fetch("/api/broadsheet/metadata");
                if (!response.ok) return;

                const data = await response.json();
                const sessionsList: Session[] = data.sessions || [];
                const classesList: ClassArm[] = data.classes || [];
                const mapByClassArm: Record<string, string[]> = data.sessionIdsByClassArm || {};

                setSessions(sessionsList);
                setClasses(classesList);
                setSessionIdsByClassArm(mapByClassArm);

                const defaultClassArmId =
                    restrictToAssignedScope
                        ? (classesList[0]?.id || "")
                        : "";

                if (defaultClassArmId) {
                    setSelectedClassArmId(defaultClassArmId);
                }

                const visibleSessionIds =
                    restrictToAssignedScope && defaultClassArmId
                        ? (mapByClassArm[defaultClassArmId] || [])
                        : sessionsList.map((s) => s.id);

                const visibleSessionList = sessionsList.filter((s) =>
                    visibleSessionIds.includes(s.id)
                );
                const defaultSession =
                    visibleSessionList.find((s) => s.isCurrent) ||
                    visibleSessionList[0];

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
            }
        };
        fetchMetadata();
    }, [restrictToAssignedScope]);

    const visibleSessionIds =
        restrictToAssignedScope && selectedClassArmId
            ? (sessionIdsByClassArm[selectedClassArmId] || [])
            : sessions.map((s) => s.id);
    const visibleSessions = sessions.filter((s) => visibleSessionIds.includes(s.id));

    useEffect(() => {
        if (!restrictToAssignedScope || !selectedClassArmId) return;

        const currentSelectedSession = visibleSessions.find((s) => s.id === selectedSessionId);
        if (currentSelectedSession) {
            const termExists = currentSelectedSession.terms.some((t) => t.id === selectedTermId);
            if (!termExists) {
                const defaultTerm =
                    currentSelectedSession.terms.find((t) => t.isCurrent) ||
                    currentSelectedSession.terms[0];
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

    // Reset broadsheet data when filters change
    useEffect(() => {
        setBroadsheetData(null);
    }, [selectedSessionId, selectedTermId, selectedClassArmId, reportType]);

    const currentSession = visibleSessions.find(s => s.id === selectedSessionId);
    const availableTerms = currentSession ? currentSession.terms : [];

    const handlePreview = async () => {
        if (!selectedClassArmId || !selectedTermId) return;

        setLoading(true);
        try {
            const res = await fetch("/api/broadsheet/data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    classArmId: selectedClassArmId,
                    termId: selectedTermId,
                    reportType,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setBroadsheetData(data);
                setShowPreview(true);
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to generate broadsheet data.");
            }
        } catch (err) {
            console.error("Preview error:", err);
            toast.error("Failed to load broadsheet preview.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!selectedClassArmId || !selectedTermId) return;

        setDownloading(true);
        try {
            const url = `/api/broadsheet/generate?classArmId=${selectedClassArmId}&termId=${selectedTermId}&reportType=${reportType}`;
            const response = await fetch(url);

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: "Failed to generate" }));
                throw new Error(err.error || "Failed to generate broadsheet");
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;

            const selectedClass = classes.find(c => c.id === selectedClassArmId);
            const className = selectedClass ? `${selectedClass.class.name}_${selectedClass.armName}` : selectedClassArmId;
            a.download = `Broadsheet_${className}_${reportType}.pdf`;

            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(a);
        } catch (err: any) {
            console.error("Download error:", err);
            toast.error(err.message || "Failed to download broadsheet.");
        } finally {
            setDownloading(false);
        }
    };

    const canGenerate = selectedClassArmId && selectedTermId;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Broadsheet</h1>
                    <p className="text-gray-500 mt-1">Generate and view class broadsheet summaries</p>
                </div>
                <div className="flex items-center gap-3">
                    {canGenerate && (
                        <>
                            <button
                                onClick={handlePreview}
                                disabled={loading}
                                className="btn-secondary flex items-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        Preview
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={downloading}
                                className="btn-primary flex items-center gap-2"
                            >
                                {downloading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Download PDF
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="card p-6">
                <div className="grid md:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Session</label>
                        <select
                            className="input w-full"
                            value={selectedSessionId}
                            onChange={(e) => {
                                setSelectedSessionId(e.target.value);
                                const sess = visibleSessions.find(s => s.id === e.target.value);
                                if (sess && sess.terms.length > 0) {
                                    const current = sess.terms.find(t => t.isCurrent) || sess.terms[0];
                                    setSelectedTermId(current.id);
                                } else {
                                    setSelectedTermId("");
                                }
                            }}
                        >
                            {!restrictToAssignedScope && <option value="">Select Session</option>}
                            {visibleSessions.map(s => (
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
                            disabled={!selectedSessionId}
                        >
                            <option value="">Select Term</option>
                            {availableTerms.map(t => (
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
                        >
                            {!restrictToAssignedScope && <option value="">Select Class</option>}
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.class.name} {c.armName}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                        <select
                            className="input w-full"
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value as any)}
                        >
                            <option value="endOfTerm">End of Term</option>
                            <option value="halfTerm">Half Term (Mid-Term)</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Inline Preview Area */}
            {broadsheetData ? (
                <div className="card overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-700">
                            Broadsheet: {broadsheetData.classArm.className} {broadsheetData.classArm.armName} &mdash; {broadsheetData.term.name}
                            <span className="ml-2 text-xs font-normal text-gray-500">
                                ({broadsheetData.students.length} students, {broadsheetData.subjects.length} subjects)
                            </span>
                        </h3>
                        <button
                            onClick={() => setShowPreview(true)}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                        >
                            Expand
                        </button>
                    </div>
                    <div className="p-4 overflow-auto max-h-[60vh]">
                        <div className="bg-white shadow-sm mx-auto" style={{ aspectRatio: "297 / 210", maxWidth: "100%" }}>
                            <BroadsheetInlinePreview data={broadsheetData} />
                        </div>
                    </div>
                </div>
            ) : canGenerate ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 font-medium">Click &quot;Preview&quot; to generate the broadsheet.</p>
                    <p className="text-sm text-gray-400 mt-1">Or click &quot;Download PDF&quot; to download directly.</p>
                </div>
            ) : (
                <div className="text-center py-16 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 font-medium">Select a Session, Term, and Class to generate a broadsheet.</p>
                </div>
            )}

            {/* Preview Modal */}
            <BroadsheetPreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                data={broadsheetData}
            />
        </div>
    );
}

// Inline preview component using the BroadsheetPreview with real data
function BroadsheetInlinePreview({ data }: { data: BroadsheetData }) {
    // Dynamically import to avoid SSR issues
    const BroadsheetPreview = require("@/components/reports/previews/BroadsheetPreview").default;
    return <BroadsheetPreview config={data.config} data={data} />;
}
