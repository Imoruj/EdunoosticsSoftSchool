"use client";

import React from "react";
import { TranscriptData } from "./types";
import TranscriptPreview from "./TranscriptPreview";

interface TranscriptPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: TranscriptData | null;
    onDownload?: () => void;
    downloading?: boolean;
}

const TranscriptPreviewModal: React.FC<TranscriptPreviewModalProps> = ({
    isOpen,
    onClose,
    data,
    onDownload,
    downloading,
}) => {
    if (!isOpen || !data) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Backdrop */}
                <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={onClose} />

                {/* Modal */}
                <div className="relative bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
                    {/* Toolbar */}
                    <div className="bg-gray-50 px-6 py-3 flex justify-between items-center border-b rounded-t-xl">
                        <h3 className="text-lg font-medium text-gray-900">
                            Transcript - {data.student.lastName} {data.student.firstName}
                        </h3>
                        <div className="flex items-center gap-3">
                            {onDownload && (
                                <button
                                    onClick={onDownload}
                                    disabled={downloading}
                                    className="btn-primary text-sm px-4 py-1.5 flex items-center gap-2"
                                >
                                    {downloading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Download PDF
                                        </>
                                    )}
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="bg-gray-100 p-4 sm:p-8 overflow-y-auto flex-1 rounded-b-xl">
                        <TranscriptPreview data={data} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TranscriptPreviewModal;
