"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import DummySheetPreview from "@/components/dummy/DummySheetPreview";
import { DummySheetData } from "@/components/dummy/types";
import { handleUnauthorizedApiResponse, readApiError } from "@/lib/client-session";
import { downloadHtmlPagesAsPdf } from "@/lib/htmlPagesToPdf";

interface DummyMetadataClass {
    id: string;
    name: string;
    arms: Array<{
        id: string;
        armName: string;
    }>;
}

interface DummyMetadata {
    classes: DummyMetadataClass[];
    currentSession: {
        id: string;
        name: string;
    } | null;
    currentTerm: {
        id: string;
        name: string;
    } | null;
}

async function waitForDocumentImages(doc: Document): Promise<void> {
    const images = Array.from(doc.images);

    await Promise.all(images.map((img) => {
        if (img.complete) {
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
        });
    }));
}

export default function DummyPage() {
    const { data: session } = useSession();
    const previewRef = useRef<HTMLDivElement | null>(null);

    const [metadata, setMetadata] = useState<DummyMetadata | null>(null);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [selectedClassArmId, setSelectedClassArmId] = useState("");
    const [dummyData, setDummyData] = useState<DummySheetData | null>(null);
    const [loadingMetadata, setLoadingMetadata] = useState(true);
    const [viewLoading, setViewLoading] = useState(false);
    const [downloadLoading, setDownloadLoading] = useState(false);
    const [printLoading, setPrintLoading] = useState(false);
    const [error, setError] = useState("");

    const userRoles: string[] = Array.isArray((session?.user as any)?.roles)
        ? (session?.user as any).roles
        : [];
    const isSchoolAdmin =
        userRoles.includes("SUPER_ADMIN") ||
        userRoles.includes("SCHOOL_ADMIN");

    const selectedClass = useMemo(
        () => metadata?.classes.find((item) => item.id === selectedClassId) || null,
        [metadata, selectedClassId]
    );
    const availableArms = selectedClass?.arms || [];

    useEffect(() => {
        let mounted = true;

        const fetchMetadata = async () => {
            setLoadingMetadata(true);
            setError("");

            try {
                const response = await fetch("/api/dummy/metadata");
                if (await handleUnauthorizedApiResponse(response)) {
                    return;
                }
                if (!response.ok) {
                    throw new Error(await readApiError(response, "Failed to load dummy metadata."));
                }

                const payload: DummyMetadata = await response.json();
                if (!mounted) return;

                setMetadata(payload);

                const defaultClass = payload.classes[0];
                const defaultArm = defaultClass?.arms[0];
                setSelectedClassId(defaultClass?.id || "");
                setSelectedClassArmId(defaultArm?.id || "");
            } catch (err) {
                if (!mounted) return;
                const message = err instanceof Error ? err.message : "Failed to load dummy metadata.";
                setError(message);
            } finally {
                if (mounted) {
                    setLoadingMetadata(false);
                }
            }
        };

        fetchMetadata();
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        setDummyData(null);
    }, [selectedClassId, selectedClassArmId]);

    const handleClassChange = (classId: string) => {
        setSelectedClassId(classId);
        const nextClass = metadata?.classes.find((item) => item.id === classId) || null;
        setSelectedClassArmId(nextClass?.arms[0]?.id || "");
    };

    const handleView = async () => {
        if (!selectedClassArmId || !metadata?.currentTerm?.id) {
            toast.error("Select a class arm first.");
            return;
        }

        setViewLoading(true);
        setError("");

        try {
            const response = await fetch("/api/dummy/data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    classArmId: selectedClassArmId,
                    termId: metadata.currentTerm.id,
                }),
            });

            if (await handleUnauthorizedApiResponse(response)) {
                return;
            }
            if (!response.ok) {
                throw new Error(await readApiError(response, "Failed to load dummy sheets."));
            }

            const payload: DummySheetData = await response.json();
            setDummyData(payload);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load dummy sheets.";
            setError(message);
            toast.error(message);
        } finally {
            setViewLoading(false);
        }
    };

    const handleDownload = async () => {
        if (!dummyData || !previewRef.current) {
            toast.error("Load the sheets preview before downloading.");
            return;
        }

        setDownloadLoading(true);

        try {
            const filename = `Dummy_${dummyData.classArm.className}_${dummyData.classArm.armName}_${dummyData.term.name}`
                .replace(/[^a-zA-Z0-9._-]/g, "_");

            await downloadHtmlPagesAsPdf(previewRef.current, {
                filename: `${filename}.pdf`,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to generate dummy sheet PDF.";
            toast.error(message);
        } finally {
            setDownloadLoading(false);
        }
    };

    const handlePrint = async () => {
        if (!dummyData || !previewRef.current) {
            toast.error("Load the sheets preview before printing.");
            return;
        }

        setPrintLoading(true);

        try {
            const printWindow = window.open("", "_blank", "width=1200,height=900");
            if (!printWindow) {
                throw new Error("Popup blocked. Please allow popups to print the dummy sheets.");
            }

            const title = `${dummyData.classArm.className} ${dummyData.classArm.armName} Dummy Sheets`;
            printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
        body { margin: 0; padding: 12mm; background: #ffffff; font-family: Arial, sans-serif; }
        .dummy-sheet-page { box-shadow: none !important; margin: 0 auto 0 !important; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
            body { padding: 0; }
            .dummy-sheet-page { margin: 0 auto !important; }
        }
    </style>
</head>
<body>
    ${previewRef.current.innerHTML}
</body>
</html>`);
            printWindow.document.close();

            await new Promise<void>((resolve) => {
                const triggerPrint = async () => {
                    if (printWindow.document.readyState !== "complete") {
                        printWindow.addEventListener("load", () => {
                            void triggerPrint();
                        }, { once: true });
                        return;
                    }

                    await waitForDocumentImages(printWindow.document);

                    if (printWindow.document.fonts?.ready) {
                        await printWindow.document.fonts.ready;
                    }

                    setTimeout(() => {
                        printWindow.focus();
                        printWindow.print();
                        resolve();
                    }, 150);
                };

                void triggerPrint();
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to print dummy sheets.";
            toast.error(message);
        } finally {
            setPrintLoading(false);
        }
    };

    if (!isSchoolAdmin && session?.user) {
        return (
            <div className="card p-6">
                <h1 className="text-xl font-bold text-gray-900">Dummy</h1>
                <p className="mt-2 text-sm text-gray-500">Only school administrators can access this feature.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dummy</h1>
                    <p className="mt-1 text-gray-500">
                        View, print, and download subject-by-subject enrollment sheets for a class arm.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleView}
                        disabled={viewLoading || loadingMetadata || !selectedClassArmId || !metadata?.currentTerm?.id}
                        className="btn-secondary"
                    >
                        {viewLoading ? "Loading..." : "View Sheets"}
                    </button>
                    <button
                        onClick={handlePrint}
                        disabled={printLoading || !dummyData}
                        className="btn-secondary"
                    >
                        {printLoading ? "Preparing..." : "Print"}
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={downloadLoading || !dummyData}
                        className="btn-primary"
                    >
                        {downloadLoading ? "Generating..." : "Download PDF"}
                    </button>
                </div>
            </div>

            <div className="card p-6 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                        <select
                            className="input w-full"
                            value={selectedClassId}
                            onChange={(event) => handleClassChange(event.target.value)}
                            disabled={loadingMetadata || !metadata}
                        >
                            <option value="">Select class</option>
                            {metadata?.classes.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Arm</label>
                        <select
                            className="input w-full"
                            value={selectedClassArmId}
                            onChange={(event) => setSelectedClassArmId(event.target.value)}
                            disabled={loadingMetadata || !selectedClassId}
                        >
                            <option value="">Select arm</option>
                            {availableArms.map((arm) => (
                                <option key={arm.id} value={arm.id}>
                                    {arm.armName}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Academic Session</p>
                        <p className="mt-2 text-base font-semibold text-gray-900">
                            {metadata?.currentSession?.name || "No active session"}
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Term</p>
                        <p className="mt-2 text-base font-semibold text-gray-900">
                            {metadata?.currentTerm?.name || "No active term"}
                        </p>
                    </div>
                </div>

                {loadingMetadata ? (
                    <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
                        Loading classes and current term...
                    </div>
                ) : error ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                        {error}
                    </div>
                ) : null}
            </div>

            {dummyData ? (
                <div className="space-y-4">
                    <div className="card p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="font-semibold text-gray-900">
                                {dummyData.classArm.className} {dummyData.classArm.armName} dummy sheets
                            </p>
                            <p className="text-sm text-gray-500">
                                {dummyData.subjects.length} subject page{dummyData.subjects.length === 1 ? "" : "s"} for {dummyData.term.name}, {dummyData.session.name}
                            </p>
                        </div>
                        <p className="text-xs text-gray-400">
                            Generated {new Date(dummyData.generatedAt).toLocaleString("en-GB")}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-slate-100 p-4">
                        <div ref={previewRef}>
                            <DummySheetPreview data={dummyData} />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card p-10 text-center text-gray-500">
                    Select a class and arm, then load the dummy sheets preview.
                </div>
            )}
        </div>
    );
}
