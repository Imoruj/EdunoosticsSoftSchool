import React, { useEffect, useRef, useState } from "react";
import { ReportCardData } from "./types";
import ReportCardPreview from "./ReportCardPreview";

interface ReportCardPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    reports: ReportCardData[];
    title?: string;
}

const ReportCardPreviewModal: React.FC<ReportCardPreviewModalProps> = ({ isOpen, onClose, reports, title }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const previewRef = useRef<HTMLDivElement | null>(null);

    const validReports = reports.filter((r): r is ReportCardData => r != null);

    useEffect(() => {
        setCurrentIndex(0);
    }, [isOpen, reports]);

    if (!isOpen || validReports.length === 0) return null;

    const currentReport = validReports[Math.min(currentIndex, validReports.length - 1)];

    const nextReport = () => {
        if (currentIndex < validReports.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const prevReport = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handlePrint = async () => {
        if (!previewRef.current) return;

        const styleMarkup = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
            .map((node) => node.outerHTML)
            .join("\n");

        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.right = "0";
        iframe.style.bottom = "0";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        document.body.appendChild(iframe);

        const iframeWindow = iframe.contentWindow;
        const iframeDocument = iframe.contentDocument;
        if (!iframeWindow || !iframeDocument) {
            iframe.remove();
            return;
        }

        iframeDocument.open();
        iframeDocument.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="utf-8" />
                    <base href="${window.location.origin}/" />
                    <title>${title || "Report Card Preview"}</title>
                    ${styleMarkup}
                    <style>
                        body { margin: 0; padding: 24px; background: white; }
                    </style>
                </head>
                <body>
                    ${previewRef.current.outerHTML}
                </body>
            </html>
        `);
        iframeDocument.close();

        const images = Array.from(iframeDocument.images || []);
        await Promise.all(
            images.map(
                (img) =>
                    new Promise<void>((resolve) => {
                        if (img.complete) return resolve();
                        const cleanup = () => {
                            img.onload = null;
                            img.onerror = null;
                            resolve();
                        };
                        img.onload = cleanup;
                        img.onerror = cleanup;
                    })
            )
        );

        iframeWindow.focus();
        iframeWindow.print();

        window.setTimeout(() => {
            iframe.remove();
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
                </div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
                    {/* Toolbar */}
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-between items-center border-b no-print">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            {title || "Report Card Preview"} ({currentIndex + 1} of {validReports.length})
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrint}
                                className="btn-secondary text-sm"
                            >
                                Print
                            </button>
                            <button
                                onClick={prevReport}
                                disabled={currentIndex === 0}
                                className="btn-secondary text-sm disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={nextReport}
                                disabled={currentIndex === validReports.length - 1}
                                className="btn-secondary text-sm disabled:opacity-50"
                            >
                                Next
                            </button>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-500 ml-4"
                            >
                                <span className="sr-only">Close</span>
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="bg-gray-100 p-4 sm:p-8 max-h-[80vh] overflow-y-auto">
                        <div ref={previewRef}>
                            <ReportCardPreview data={currentReport} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportCardPreviewModal;
