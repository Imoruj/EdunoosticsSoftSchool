import React from "react";
import { Session, ClassArm } from "./types";
import { Card } from "@/components/ui/Card";

interface ReportFiltersProps {
    sessions: Session[];
    classes: ClassArm[];
    selectedSessionId: string;
    setSelectedSessionId: (id: string) => void;
    selectedTermId: string;
    setSelectedTermId: (id: string) => void;
    selectedClassArmId: string;
    setSelectedClassArmId: (id: string) => void;
    reportType: "halfTerm" | "endOfTerm";
    setReportType: (type: "halfTerm" | "endOfTerm") => void;
    restrictToAssignedScope?: boolean;
}

export default function ReportFilters({
    sessions,
    classes,
    selectedSessionId,
    setSelectedSessionId,
    selectedTermId,
    setSelectedTermId,
    selectedClassArmId,
    setSelectedClassArmId,
    reportType,
    setReportType,
    restrictToAssignedScope = false
}: ReportFiltersProps) {
    const currentSession = sessions.find(s => s.id === selectedSessionId);
    const availableTerms = currentSession ? currentSession.terms : [];

    return (
        <Card className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Session</label>
                    <select
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        value={selectedSessionId}
                        onChange={(e) => {
                            setSelectedSessionId(e.target.value);
                            const sess = sessions.find(s => s.id === e.target.value);
                            if (sess && sess.terms.length > 0) setSelectedTermId(sess.terms[0].id);
                            else setSelectedTermId("");
                        }}
                    >
                        {!restrictToAssignedScope && <option value="">Select Session</option>}
                        {sessions.map(s => (
                            <option key={s.id} value={s.id}>{s.name} {s.isCurrent ? "(Current)" : ""}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Term</label>
                    <select
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">Class</label>
                    <select
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">Report Type</label>
                    <select
                        className="flex h-10 w-full rounded-md border border-slate-300 bg-transparent px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value as "halfTerm" | "endOfTerm")}
                    >
                        <option value="endOfTerm">End of Term</option>
                        <option value="halfTerm">Half Term (Mid-Term)</option>
                    </select>
                </div>
            </div>
        </Card>
    );
}
