"use client";

import React, { useEffect, useState } from "react";
import mammoth from "mammoth";
import { Loader2, AlertCircle } from "lucide-react";

interface DocxViewerProps {
    fileUrl: string;
    onLoad?: () => void;
}

export default function DocxViewer({ fileUrl, onLoad }: DocxViewerProps) {
    const [html, setHtml] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function fetchAndRenderDocx() {
            setLoading(true);
            setError(false);
            try {
                const response = await fetch(fileUrl);
                if (!response.ok) throw new Error("Failed to fetch document");
                const arrayBuffer = await response.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                if (isMounted) {
                    setHtml(result.value);
                    setLoading(false);
                    onLoad?.();
                }
            } catch (err) {
                console.error("Error rendering DOCX:", err);
                if (isMounted) {
                    setError(true);
                    setLoading(false);
                    onLoad?.(); // stop global loader even on error
                }
            }
        }

        fetchAndRenderDocx();

        return () => {
            isMounted = false;
        };
    }, [fileUrl, onLoad]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 h-full w-full">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Parsing Document...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full w-full">
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <p className="text-gray-600 font-medium">Failed to parse DOCX file.</p>
                <p className="text-gray-400 text-sm mt-2">The file might be corrupted or in an unsupported format.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full overflow-auto bg-gray-50 p-4 sm:p-8">
            <div
                className="mx-auto max-w-4xl bg-white p-8 sm:p-12 shadow-sm border border-gray-200 rounded-sm min-h-full prose prose-blue prose-sm sm:prose-base w-full"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    );
}
