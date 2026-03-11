"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Progress } from "@/components/ui/Progress";

interface BulkGenerateModalProps {
    isOpen: boolean;
    onClose: () => void;
    classArmId: string;
    termId: string;
    studentIds: string[];
    reportType: "halfTerm" | "endOfTerm";
}

export default function BulkGenerateModal({
    isOpen,
    onClose,
    classArmId,
    termId,
    studentIds,
    reportType
}: BulkGenerateModalProps) {
    const [jobId, setJobId] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<"PENDING" | "PROCESSING" | "COMPLETED" | "FAILED">("PENDING");
    const [error, setError] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);

    // Initial POST request to start the job
    useEffect(() => {
        if (!isOpen) return;

        // Reset state when opened
        setJobId(null);
        setProgress(0);
        setStatus("PENDING");
        setError(null);
        setResultUrl(null);

        const startJob = async () => {
            try {
                const response = await fetch("/api/reports/bulk-generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        classArmId,
                        termId,
                        studentIds: studentIds.length > 0 ? studentIds : null,
                        reportType
                    })
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || "Failed to start bulk generation");

                setJobId(data.jobId);
                setStatus("PROCESSING");
            } catch (err: any) {
                toast.error(err.message);
                setError(err.message);
                setStatus("FAILED");
            }
        };

        startJob();
    }, [isOpen, classArmId, termId, studentIds, reportType]);

    // Polling effect
    useEffect(() => {
        if (!jobId || status === "COMPLETED" || status === "FAILED") return;

        const interval = setInterval(async () => {
            try {
                const response = await fetch(`/api/jobs/${jobId}`);
                if (!response.ok) return;

                const data = await response.json();
                setProgress(data.progress);
                setStatus(data.status);

                if (data.status === "COMPLETED") {
                    setResultUrl(data.resultUrl);
                    toast.success("Reports generated successfully!");
                    clearInterval(interval);
                } else if (data.status === "FAILED") {
                    setError(data.error);
                    toast.error("Job failed: " + data.error);
                    clearInterval(interval);
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        }, 2000); // Poll every 2 seconds

        return () => clearInterval(interval);
    }, [jobId, status]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Generating Reports</h3>

                    {status === "PENDING" && (
                        <p className="text-sm text-slate-500 mb-4">Initializing background worker...</p>
                    )}

                    {status === "PROCESSING" && (
                        <div>
                            <p className="text-sm text-slate-500 mb-2">Generating PDFs... {progress}%</p>
                            <Progress value={progress} />
                        </div>
                    )}

                    {status === "COMPLETED" && (
                        <div className="text-center py-4">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-green-600 font-medium mb-4">Done!</p>
                            <a
                                href={resultUrl || "#"}
                                download
                                onClick={onClose}
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4 shadow-sm"
                            >
                                Download ZIP
                            </a>
                        </div>
                    )}

                    {status === "FAILED" && (
                        <div className="text-center py-4">
                            <p className="text-red-600 font-medium mb-2">Failed to generate</p>
                            <p className="text-sm text-slate-500">{error}</p>
                        </div>
                    )}

                </div>

                {status !== "COMPLETED" && (
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                        <button
                            onClick={onClose}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input hover:bg-slate-100 hover:text-slate-900 h-10 py-2 px-4 shadow-sm"
                        >
                            {status === "FAILED" ? "Close" : "Cancel (Run in Background)"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
