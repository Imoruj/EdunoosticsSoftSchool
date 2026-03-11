"use client";

import React, { useEffect, useState } from "react";
import { X, ExternalLink, Download, FileText, Loader2, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";

const DocxViewer = dynamic(() => import("./DocxViewer"), { ssr: false, loading: () => <div className="flex flex-col flex-1 items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div> });

interface FileViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string;
    fileName: string;
    fileType: string;
}

export function FileViewerModal({ isOpen, onClose, fileUrl, fileName, fileType }: FileViewerModalProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
            setLoading(true);
            setError(false);
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen, fileUrl]);

    if (!isOpen) return null;

    const isImage = fileType.startsWith("image/") || !!fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = fileType === "application/pdf" || !!fileName.match(/\.pdf$/i);
    const isDocx = !!fileName.match(/\.docx$/i);
    const isOtherOfficeDoc = !!fileName.match(/\.(ppt|pptx|xls|xlsx|doc)$/i);

    // Use Google Docs viewer as a fallback for office docs or unknown types
    // Note: This requires the fileUrl to be publicly accessible over the internet.
    const embedUrl = isOtherOfficeDoc || (!isImage && !isPdf && !isDocx)
        ? `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`
        : fileUrl;

    const handleIframeLoad = () => setLoading(false);
    const handleIframeError = () => {
        setLoading(false);
        setError(true);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative flex flex-col w-full h-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                            <FileText className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {fileName}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <a
                            href={fileUrl}
                            download={fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Download
                        </a>
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors sm:hidden"
                            title="Open in new tab"
                        >
                            <ExternalLink className="w-5 h-5" />
                        </a>
                        <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                            title="Close preview"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="relative flex-1 bg-gray-50/50 overflow-hidden flex items-center justify-center">

                    {loading && !error && !isDocx && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-sm z-10">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                            <p className="text-gray-500 font-medium">Loading preview...</p>
                            {isOtherOfficeDoc && (
                                <p className="text-gray-400 text-sm mt-2 max-w-sm text-center">
                                    Large documents might take a moment to render via Google Docs viewer.
                                    If this document fails to load, you may need to download it directly.
                                </p>
                            )}
                        </div>
                    )}

                    {error ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Preview Unavailable</h3>
                            <p className="text-gray-500 max-w-md mb-6">
                                We couldn't load a preview for this file type, or the file is not publicly accessible.
                            </p>
                            <a
                                href={fileUrl}
                                download={fileName}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                Download File Instead
                            </a>
                        </div>
                    ) : isImage ? (
                        <img
                            src={fileUrl}
                            alt={fileName}
                            className="max-w-full max-h-full object-contain p-4 transition-opacity duration-300"
                            style={{ opacity: loading ? 0 : 1 }}
                            onLoad={() => setLoading(false)}
                            onError={() => { setLoading(false); setError(true); }}
                        />
                    ) : isDocx ? (
                        <DocxViewer fileUrl={fileUrl} onLoad={() => setLoading(false)} />
                    ) : isPdf ? (
                        <iframe
                            src={embedUrl}
                            className="w-full h-full border-0 bg-gray-100 transition-opacity duration-300"
                            style={{ opacity: loading ? 0 : 1 }}
                            onLoad={handleIframeLoad}
                            onError={handleIframeError}
                            title={`Preview of ${fileName}`}
                            allowFullScreen
                        />
                    ) : (
                        <iframe
                            src={embedUrl}
                            className="w-full h-full border-0 bg-white transition-opacity duration-300"
                            style={{ opacity: loading ? 0 : 1 }}
                            onLoad={handleIframeLoad}
                            onError={handleIframeError}
                            title={`Preview of ${fileName}`}
                            allowFullScreen
                        />
                    )}

                </div>
            </div>
        </div>
    );
}
