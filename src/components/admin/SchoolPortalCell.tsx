"use client";

import { useState } from "react";

/** Compact slug + portal link row for admin school tables. */
export function SchoolPortalCell({
    slug,
    portalUrl,
}: {
    slug: string | null;
    portalUrl: string | null;
}) {
    const [copied, setCopied] = useState(false);
    const s = slug?.trim();
    const url = portalUrl?.trim();
    if (!s || !url) {
        return <span className="text-xs text-gray-400">—</span>;
    }
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            /* ignore */
        }
    };
    return (
        <div className="flex flex-col gap-1 min-w-0 max-w-[220px]">
            <span className="text-xs font-mono text-gray-700 truncate" title={s}>
                {s}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-primary-600 hover:text-primary-800 truncate"
                    title={url}
                >
                    Open portal
                </a>
                <button
                    type="button"
                    onClick={copy}
                    className="text-xs text-gray-500 hover:text-gray-800 underline-offset-2 hover:underline"
                >
                    {copied ? "Copied" : "Copy link"}
                </button>
            </div>
        </div>
    );
}
