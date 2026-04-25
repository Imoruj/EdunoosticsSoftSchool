"use client";

import { useState, useRef, useEffect } from "react";

// ─── YouTube helpers ───────────────────────────────────────────────────────────

function extractYtId(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]{11})/);
    return m?.[1] ?? null;
}

interface YtVideo {
    videoId: string;
    title: string;
    description: string;
    channelTitle: string;
    thumbnail: string;
    publishedAt: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SdgEntry { id: string; sdgNumber: number; aiSuggested: boolean; approved: boolean }
interface Reference {
    id: string;
    type: string;
    title: string;
    url: string | null;
    fileKey: string | null;
    description: string | null;
    sortOrder?: number;
}

interface Week {
    id: string;
    weekNumber: number;
    topic: string;
    objectives: string | null;
    content: string | null;
    references: Reference[];
    sdgMappings: SdgEntry[];
}

interface SOWTerm {
    id: string;
    termNumber: number;
    term: { id: string; name: string; termNumber: number };
    weeks: Week[];
}

interface Props {
    terms: SOWTerm[];
    canEdit: boolean;
    onWeekUpdated: (weekId: string, updates: Partial<{ references: Reference[]; sdgMappings: SdgEntry[] }>) => void;
    onOpenTerm?: (termNumber: number) => void;
}

// ─── SDG data ─────────────────────────────────────────────────────────────────

const SDG_LIST = [
    { n: 1, name: "No Poverty", color: "#E5243B" },
    { n: 2, name: "Zero Hunger", color: "#DDA63A" },
    { n: 3, name: "Good Health", color: "#4C9F38" },
    { n: 4, name: "Quality Education", color: "#C5192D" },
    { n: 5, name: "Gender Equality", color: "#FF3A21" },
    { n: 6, name: "Clean Water", color: "#26BDE2" },
    { n: 7, name: "Affordable Energy", color: "#FCC30B" },
    { n: 8, name: "Decent Work", color: "#A21942" },
    { n: 9, name: "Industry Innovation", color: "#FD6925" },
    { n: 10, name: "Reduced Inequalities", color: "#DD1367" },
    { n: 11, name: "Sustainable Cities", color: "#FD9D24" },
    { n: 12, name: "Responsible Consumption", color: "#BF8B2E" },
    { n: 13, name: "Climate Action", color: "#3F7E44" },
    { n: 14, name: "Life Below Water", color: "#0A97D9" },
    { n: 15, name: "Life on Land", color: "#56C02B" },
    { n: 16, name: "Peace & Justice", color: "#00689D" },
    { n: 17, name: "Partnerships", color: "#19486A" },
];

// ─── Reference type icons ─────────────────────────────────────────────────────

const REF_TYPE_META: Record<string, { icon: string; label: string; color: string }> = {
    TEXT: { icon: "📄", label: "Text / URL", color: "bg-blue-50 text-blue-700" },
    YOUTUBE: { icon: "▶", label: "YouTube", color: "bg-red-50 text-red-700" },
    FILE: { icon: "📁", label: "File", color: "bg-gray-100 text-gray-700" },
    GOOGLE_DRIVE: { icon: "☁", label: "Google Drive", color: "bg-green-50 text-green-700" },
};

function buildThumbnailCandidates(video: YtVideo) {
    return Array.from(new Set([
        video.thumbnail,
        `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
        `https://i.ytimg.com/vi/${video.videoId}/default.jpg`,
    ].filter(Boolean)));
}

function YouTubeThumbnail({ video }: { video: YtVideo }) {
    const thumbnailCandidates = buildThumbnailCandidates(video);
    const [candidateIndex, setCandidateIndex] = useState(0);
    const [showFallback, setShowFallback] = useState(thumbnailCandidates.length === 0);

    useEffect(() => {
        setCandidateIndex(0);
        setShowFallback(thumbnailCandidates.length === 0);
    }, [video.videoId, video.thumbnail, thumbnailCandidates.length]);

    const currentSrc = thumbnailCandidates[candidateIndex];

    if (showFallback || !currentSrc) {
        return (
            <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45 0 5.804 0 12c0 6.185.482 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 24 18.196 24 12c0-6.185-.488-8.55-4.385-8.816zM9 16V8l8 3.993L9 16z" />
                </svg>
            </div>
        );
    }

    return (
        <img
            src={currentSrc}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={() => {
                const nextIndex = candidateIndex + 1;
                if (nextIndex >= thumbnailCandidates.length) {
                    setShowFallback(true);
                    return;
                }
                setCandidateIndex(nextIndex);
            }}
        />
    );
}

// ─── YouTube picker sub-component ─────────────────────────────────────────────

function YouTubePicker({
    weekId,
    onSelect,
    initialAddedIds,
}: {
    weekId: string;
    onSelect: (videoId: string, title: string, url: string) => Promise<void>;
    initialAddedIds: Set<string>;
}) {
    const [videos, setVideos] = useState<YtVideo[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState<string | null>(null);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [previewVideo, setPreviewVideo] = useState<YtVideo | null>(null);
    const [manualUrl, setManualUrl] = useState("");
    const [noApiKey, setNoApiKey] = useState(false);
    const [youtubeError, setYoutubeError] = useState(false);
    const [searchDone, setSearchDone] = useState(false);
    const [adding, setAdding] = useState(false);
    const [addedIds, setAddedIds] = useState<Set<string>>(initialAddedIds);

    const manualPreviewId = extractYtId(manualUrl);
    const previewIndex = previewVideo
        ? videos.findIndex((video) => video.videoId === previewVideo.videoId)
        : -1;
    const canGoPrevious = previewIndex > 0;
    const canGoNext = previewIndex >= 0 && previewIndex < videos.length - 1;

    const showAdjacentPreview = (direction: -1 | 1) => {
        if (previewIndex < 0) return;
        const nextVideo = videos[previewIndex + direction];
        if (!nextVideo) return;
        setPreviewVideo(nextVideo);
    };

    const handleAddVideo = async () => {
        if (!previewVideo) return;
        setAdding(true);
        try {
            await onSelect(previewVideo.videoId, previewVideo.title, `https://www.youtube.com/watch?v=${previewVideo.videoId}`);
            setAddedIds((prev) => new Set([...prev, previewVideo.videoId]));
            // Auto-advance to next video, or stay if last
            if (canGoNext) {
                setPreviewVideo(videos[previewIndex + 1]);
            }
        } finally {
            setAdding(false);
        }
    };

    const handleAiSearch = async () => {
        setSearching(true);
        setSearchError(null);
        setPreviewVideo(null);
        setVideos([]);
        setNoApiKey(false);
        setYoutubeError(false);
        setSearchDone(false);
        try {
            const res = await fetch(`/api/scheme-of-work/weeks/${weekId}/search-youtube`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Search failed");
            setSearchQuery(data.searchQuery);
            setVideos(data.videos ?? []);
            setNoApiKey(!!data.noApiKey);
            setYoutubeError(!!data.youtubeError);
        } catch (e: any) {
            setSearchError(e.message);
        } finally {
            setSearching(false);
            setSearchDone(true);
        }
    };

    // Auto-search on mount
    useEffect(() => { handleAiSearch(); }, []);

    if (previewVideo) {
        const isCurrentAdded = addedIds.has(previewVideo.videoId);
        return (
            <div className="space-y-3">
                <button
                    type="button"
                    onClick={() => setPreviewVideo(null)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors"
                >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to results
                </button>

                <div className="rounded-xl overflow-hidden bg-black aspect-video">
                    <iframe
                        key={previewVideo.videoId}
                        src={`https://www.youtube.com/embed/${previewVideo.videoId}?autoplay=1`}
                        title={previewVideo.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                </div>

                {/* Title + added badge */}
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">{previewVideo.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{previewVideo.channelTitle}</p>
                    </div>
                    {isCurrentAdded && (
                        <span className="shrink-0 flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Added
                        </span>
                    )}
                </div>

                {/* Nav + action row */}
                <div className="flex gap-2">
                    {/* Prev / counter / next */}
                    <div className="flex items-center rounded-xl border border-gray-200 overflow-hidden bg-white">
                        <button
                            type="button"
                            onClick={() => showAdjacentPreview(-1)}
                            disabled={adding || !canGoPrevious}
                            className="px-2.5 py-2.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                            aria-label="Previous video"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div className="px-2 py-2.5 text-center border-x border-gray-200 min-w-[56px]">
                            <p className="text-xs font-semibold text-gray-700 leading-none">{previewIndex + 1}/{videos.length}</p>
                            {addedIds.size > 0 && (
                                <p className="text-[10px] text-green-600 font-medium mt-0.5">{addedIds.size} added</p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => showAdjacentPreview(1)}
                            disabled={adding || !canGoNext}
                            className="px-2.5 py-2.5 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-white transition-colors"
                            aria-label="Next video"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Add / Already added button */}
                    {isCurrentAdded ? (
                        <button
                            type="button"
                            disabled
                            className="flex-1 px-3 py-2.5 text-sm font-semibold bg-green-50 text-green-700 border border-green-200 rounded-xl flex items-center justify-center gap-1.5 cursor-default"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            Added
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled={adding}
                            onClick={handleAddVideo}
                            className="flex-1 px-3 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
                        >
                            {adding ? (
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                            )}
                            {adding ? "Adding…" : "Add Video"}
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* AI search status */}
            {searching && (
                <div className="flex items-center gap-2 text-sm text-violet-600 py-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    AI is searching for relevant videos…
                </div>
            )}

            {searchQuery && !searching && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                        Search: <span className="text-gray-600 font-medium">"{searchQuery}"</span>
                    </p>
                    <button
                        type="button"
                        onClick={handleAiSearch}
                        disabled={searching}
                        className="text-xs text-violet-600 hover:text-violet-700 font-medium disabled:opacity-50"
                    >
                        Retry ↺
                    </button>
                </div>
            )}

            {searchError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{searchError}</p>
            )}

            {noApiKey && !searching && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 space-y-2">
                    <p className="font-semibold">YouTube API key not configured.</p>
                    {searchQuery && (
                        <a
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                            Search YouTube for &ldquo;{searchQuery}&rdquo;
                        </a>
                    )}
                    <p className="text-amber-600">Copy a video URL from YouTube, then paste it below.</p>
                </div>
            )}

            {youtubeError && !searching && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 space-y-2">
                    <p className="font-semibold">YouTube Data API v3 not enabled.</p>
                    <p>Enable it in <span className="font-medium">Google Cloud Console → APIs &amp; Services → &quot;YouTube Data API v3&quot;</span>, then restart the server.</p>
                    {searchQuery && (
                        <a
                            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.72a4.85 4.85 0 01-1.01-.03z"/>
                            </svg>
                            Search YouTube for &ldquo;{searchQuery}&rdquo;
                        </a>
                    )}
                    <p className="text-amber-600">Copy a video URL from YouTube, then paste it in the field below.</p>
                </div>
            )}

            {searchDone && !searching && !youtubeError && !noApiKey && videos.length === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 text-center">
                    No videos found for this topic. Try <button type="button" onClick={handleAiSearch} className="text-violet-600 font-medium hover:underline">retrying</button> or paste a URL manually below.
                </div>
            )}

            {/* Video results grid */}
            {videos.length > 0 && !searching && (
                <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-0.5">
                    {videos.map((v) => {
                        const isAdded = addedIds.has(v.videoId);
                        return (
                            <button
                                key={v.videoId}
                                type="button"
                                onClick={() => setPreviewVideo(v)}
                                className={`text-left rounded-lg overflow-hidden border transition-all group ${
                                    isAdded
                                        ? "border-green-300 bg-green-50/30"
                                        : "border-gray-200 hover:border-red-400 hover:shadow-sm"
                                }`}
                            >
                                <div className="relative aspect-video bg-gray-100 overflow-hidden">
                                    <YouTubeThumbnail video={v} />
                                    {isAdded ? (
                                        <div className="absolute inset-0 bg-green-900/30 flex items-center justify-center">
                                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-7 h-7 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <div className="px-1.5 py-1">
                                    <p className={`text-xs font-medium line-clamp-2 leading-tight ${isAdded ? "text-green-700" : "text-gray-800"}`}>{v.title}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{v.channelTitle}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 shrink-0">or paste a URL</span>
                <div className="flex-1 h-px bg-gray-100" />
            </div>

            {/* Manual URL input */}
            <div className="space-y-2">
                <input
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=…"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-gray-300"
                />
                {manualPreviewId && (
                    <div className="space-y-2">
                        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                            <iframe
                                src={`https://www.youtube.com/embed/${manualPreviewId}`}
                                title="YouTube Preview"
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                        <button
                            type="button"
                            disabled={adding}
                            onClick={async () => {
                                setAdding(true);
                                try {
                                    await onSelect(manualPreviewId!, "", manualUrl.trim());
                                    setManualUrl("");
                                } finally {
                                    setAdding(false);
                                }
                            }}
                            className="w-full px-3 py-2.5 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
                        >
                            {adding ? (
                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                            )}
                            {adding ? "Adding…" : "Add Video"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Add Reference Modal ──────────────────────────────────────────────────────

function AddReferenceModal({
    weekId,
    onAdded,
    onClose,
    existingRefs,
}: {
    weekId: string;
    onAdded: (ref: Reference) => void;
    onClose: () => void;
    existingRefs: Reference[];
}) {
    const [type, setType] = useState<string>("TEXT");
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [description, setDescription] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ytAddedCount, setYtAddedCount] = useState(0);
    const fileRef = useRef<HTMLInputElement>(null);

    const isYoutube = type === "YOUTUBE";
    const needsFile = type === "FILE";
    const needsUrl = !needsFile && !isYoutube;

    // Derive which YouTube videoIds already exist as refs (for persistence across open/close)
    const initialAddedIds = new Set(
        existingRefs
            .filter((r) => r.type === "YOUTUBE" && r.url)
            .map((r) => extractYtId(r.url!))
            .filter((id): id is string => id !== null)
    );

    const handleYtSelect = async (_videoId: string, videoTitle: string, videoUrl: string): Promise<void> => {
        setSaving(true);
        setError(null);
        try {
            const res = await fetch(`/api/scheme-of-work/weeks/${weekId}/references`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "YOUTUBE",
                    title: videoTitle || videoUrl,
                    url: videoUrl,
                    fileKey: null,
                    description: null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");
            onAdded(data.reference);
            setYtAddedCount((c) => c + 1);
        } catch (e: any) {
            setError(e.message);
            throw e;
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) { setError("Title is required"); return; }
        if (needsFile && !file) { setError("Please select a file"); return; }
        if (needsUrl && !url.trim()) { setError("URL is required"); return; }

        setSaving(true);
        setError(null);

        let fileKey: string | null = null;
        const finalUrl = url.trim() || null;

        if (needsFile && file) {
            setUploading(true);
            try {
                const fd = new FormData();
                fd.append("file", file);
                fd.append("type", "sow_reference");
                const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
                const uploadData = await uploadRes.json();
                if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");
                fileKey = uploadData.url;
            } catch (e: any) {
                setError(e.message);
                setSaving(false);
                setUploading(false);
                return;
            } finally {
                setUploading(false);
            }
        }

        try {
            const res = await fetch(`/api/scheme-of-work/weeks/${weekId}/references`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type,
                    title: title.trim(),
                    url: finalUrl,
                    fileKey,
                    description: description.trim() || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to save");
            onAdded(data.reference);
            onClose();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
            <div
                className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4">
                    <div>
                        <h3 className="font-semibold text-gray-900 text-base">Add Reference</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Attach a resource to this week</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Segmented type picker */}
                <div className="px-5 pb-3">
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                        {Object.entries(REF_TYPE_META).map(([t, meta]) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => { setType(t); setFile(null); setUrl(""); setError(null); }}
                                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    type === t
                                        ? "bg-white shadow text-gray-900"
                                        : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <span>{meta.icon}</span>
                                <span className="hidden sm:inline">{meta.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                <form onSubmit={handleSubmit} className="px-5 pt-4 pb-5 space-y-3.5">
                    {/* ── YouTube AI picker ── */}
                    {isYoutube && (
                        <>
                            {ytAddedCount > 0 && (
                                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                    <svg className="w-3.5 h-3.5 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <p className="text-xs font-medium text-green-700">
                                        {ytAddedCount} video{ytAddedCount > 1 ? "s" : ""} added
                                    </p>
                                </div>
                            )}
                            <YouTubePicker weekId={weekId} onSelect={handleYtSelect} initialAddedIds={initialAddedIds} />
                        </>
                    )}

                    {/* Title field — non-YouTube only */}
                    {!isYoutube && (
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Title *</label>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Supply and Demand — BBC Article"
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-400 placeholder:text-gray-300"
                            />
                        </div>
                    )}

                    {/* URL field */}
                    {needsUrl && (
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                {type === "GOOGLE_DRIVE" ? "Google Drive URL *" : "URL *"}
                            </label>
                            <input
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder={type === "GOOGLE_DRIVE" ? "https://drive.google.com/…" : "https://…"}
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-400 placeholder:text-gray-300"
                            />
                        </div>
                    )}

                    {/* File field */}
                    {needsFile && (
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">File *</label>
                            <label className="flex items-center gap-3 px-3 py-2.5 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 transition-colors">
                                <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                <div className="min-w-0">
                                    {file ? (
                                        <>
                                            <p className="text-sm font-medium text-gray-700 truncate">{file.name}</p>
                                            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-400">Click to choose a file…</p>
                                    )}
                                </div>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="*"
                                    className="sr-only"
                                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                />
                            </label>
                        </div>
                    )}

                    {/* Description — non-YouTube only */}
                    {!isYoutube && (
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1.5">Note <span className="text-gray-400 font-normal">(optional)</span></label>
                            <input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief note about this resource"
                                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-400 placeholder:text-gray-300"
                            />
                        </div>
                    )}

                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            <svg className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Actions */}
                    {!isYoutube ? (
                        <div className="flex gap-2 pt-1">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-3 py-2.5 text-sm border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving || uploading}
                                className="flex-1 px-3 py-2.5 text-sm font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
                            >
                                {uploading ? "Uploading…" : saving ? "Saving…" : "Add Reference"}
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                                ytAddedCount > 0
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                            }`}
                        >
                            {ytAddedCount > 0
                                ? `Done — ${ytAddedCount} video${ytAddedCount > 1 ? "s" : ""} added`
                                : "Cancel"}
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}

// ─── Per-week card ─────────────────────────────────────────────────────────────

function WeekResourcesCard({
    week,
    canEdit,
    onUpdated,
}: {
    week: Week;
    canEdit: boolean;
    onUpdated: (updates: Partial<{ references: Reference[]; sdgMappings: SdgEntry[] }>) => void;
}) {
    const [open, setOpen] = useState(false);
    const [refs, setRefs] = useState<Reference[]>(week.references ?? []);
    const [sdgs, setSdgs] = useState<SdgEntry[]>(week.sdgMappings ?? []);
    const [showAddRef, setShowAddRef] = useState(false);
    const [suggestingSDG, setSuggestingSDG] = useState(false);
    const [deletingRefId, setDeletingRefId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleRefAdded = (ref: Reference) => {
        const next = [...refs, ref];
        setRefs(next);
        onUpdated({ references: next });
    };

    const handleDeleteRef = async (refId: string) => {
        setDeletingRefId(refId);
        try {
            const res = await fetch(`/api/scheme-of-work/weeks/${week.id}/references/${refId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Delete failed");
            const next = refs.filter((r) => r.id !== refId);
            setRefs(next);
            onUpdated({ references: next });
        } catch {
            /* ignore */
        } finally {
            setDeletingRefId(null);
        }
    };

    const handleToggleSDG = async (sdgNumber: number) => {
        const existing = sdgs.find((s) => s.sdgNumber === sdgNumber);
        if (existing) {
            // Remove
            try {
                await fetch(`/api/scheme-of-work/weeks/${week.id}/sdgs?sdgNumber=${sdgNumber}`, { method: "DELETE" });
                const next = sdgs.filter((s) => s.sdgNumber !== sdgNumber);
                setSdgs(next);
                onUpdated({ sdgMappings: next });
            } catch { /* ignore */ }
        } else {
            // Add approved
            try {
                const res = await fetch(`/api/scheme-of-work/weeks/${week.id}/sdgs`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sdgNumber, approved: true }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                const next = [...sdgs, data.sdg];
                setSdgs(next);
                onUpdated({ sdgMappings: next });
            } catch { /* ignore */ }
        }
    };

    const handleApproveSdg = async (sdgNumber: number) => {
        try {
            const res = await fetch(`/api/scheme-of-work/weeks/${week.id}/sdgs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sdgNumber, aiSuggested: true, approved: true }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            const next = sdgs.map((s) => s.sdgNumber === sdgNumber ? { ...s, approved: true } : s);
            setSdgs(next);
            onUpdated({ sdgMappings: next });
        } catch { /* ignore */ }
    };

    const handleDismissSdg = async (sdgNumber: number) => {
        try {
            await fetch(`/api/scheme-of-work/weeks/${week.id}/sdgs?sdgNumber=${sdgNumber}`, { method: "DELETE" });
            const next = sdgs.filter((s) => s.sdgNumber !== sdgNumber);
            setSdgs(next);
            onUpdated({ sdgMappings: next });
        } catch { /* ignore */ }
    };

    const handleSuggestSDGs = async () => {
        setSuggestingSDG(true);
        setError(null);
        try {
            const res = await fetch(`/api/scheme-of-work/weeks/${week.id}/suggest-sdgs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Suggestion failed");

            // Upsert AI-suggested SDGs
            const updated = [...sdgs];
            for (const n of data.sdgNumbers as number[]) {
                if (!updated.find((s) => s.sdgNumber === n)) {
                    const r = await fetch(`/api/scheme-of-work/weeks/${week.id}/sdgs`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sdgNumber: n, aiSuggested: true, approved: false }),
                    });
                    const d = await r.json();
                    if (r.ok) updated.push(d.sdg);
                } else {
                    // Mark as AI suggested
                    await fetch(`/api/scheme-of-work/weeks/${week.id}/sdgs`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ sdgNumber: n, aiSuggested: true }),
                    });
                    const idx = updated.findIndex((s) => s.sdgNumber === n);
                    if (idx >= 0) updated[idx] = { ...updated[idx], aiSuggested: true };
                }
            }
            setSdgs(updated.sort((a, b) => a.sdgNumber - b.sdgNumber));
            onUpdated({ sdgMappings: updated });
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSuggestingSDG(false);
        }
    };

    const hasContent = refs.length > 0 || sdgs.length > 0;

    return (
        <div className={`border rounded-xl overflow-hidden ${hasContent ? "border-primary-200 bg-primary-50/20" : "border-gray-200 bg-white"}`}>
            {/* Header */}
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                        W{week.weekNumber}
                    </span>
                    <span className="text-sm font-medium text-gray-800 truncate">{week.topic}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                    {refs.length > 0 && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                            {refs.length} ref{refs.length > 1 ? "s" : ""}
                        </span>
                    )}
                    {sdgs.filter((s) => s.approved).length > 0 && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            {sdgs.filter((s) => s.approved).length} SDG{sdgs.filter((s) => s.approved).length > 1 ? "s" : ""}
                        </span>
                    )}
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

            {open && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-5">
                    {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                    {/* ── References ── */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">References</h4>
                            {canEdit && (
                                <button
                                    onClick={() => setShowAddRef(true)}
                                    className="flex items-center gap-1 text-xs text-primary-600 font-medium hover:text-primary-700"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add
                                </button>
                            )}
                        </div>

                        {refs.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">No references yet</p>
                        ) : (
                            <div className="space-y-1.5">
                                {refs.map((ref) => {
                                    const meta = REF_TYPE_META[ref.type] || REF_TYPE_META.TEXT;
                                    const link = ref.fileKey || ref.url;
                                    return (
                                        <div key={ref.id} className="flex items-center justify-between gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-base shrink-0">{meta.icon}</span>
                                                <div className="min-w-0">
                                                    {link ? (
                                                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary-700 hover:underline truncate block">
                                                            {ref.title}
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs font-medium text-gray-700 truncate block">{ref.title}</span>
                                                    )}
                                                    {ref.description && <p className="text-xs text-gray-400 truncate">{ref.description}</p>}
                                                </div>
                                            </div>
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleDeleteRef(ref.id)}
                                                    disabled={deletingRefId === ref.id}
                                                    className="shrink-0 text-gray-300 hover:text-red-400 disabled:opacity-50"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── SDG Mappings ── */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">SDG Mappings</h4>
                            {canEdit && (
                                <button
                                    onClick={handleSuggestSDGs}
                                    disabled={suggestingSDG}
                                    className="flex items-center gap-1 text-xs text-violet-600 font-medium hover:text-violet-700 disabled:opacity-50"
                                >
                                    {suggestingSDG ? (
                                        <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    )}
                                    {suggestingSDG ? "Suggesting…" : "AI Suggest"}
                                </button>
                            )}
                        </div>

                        {/* Pending AI Suggestions panel */}
                        {canEdit && sdgs.filter((s) => s.aiSuggested && !s.approved).length > 0 && (
                            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-2">
                                <p className="text-xs font-semibold text-violet-700 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    AI Suggestions — Approve or Dismiss each
                                </p>
                                <div className="space-y-1.5">
                                    {sdgs
                                        .filter((s) => s.aiSuggested && !s.approved)
                                        .map((entry) => {
                                            const sdgMeta = SDG_LIST.find((s) => s.n === entry.sdgNumber);
                                            if (!sdgMeta) return null;
                                            return (
                                                <div
                                                    key={entry.sdgNumber}
                                                    className="flex items-center justify-between gap-2 bg-white border border-violet-100 rounded-lg px-3 py-2"
                                                >
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span
                                                            className="shrink-0 w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center"
                                                            style={{ backgroundColor: sdgMeta.color }}
                                                        >
                                                            {sdgMeta.n}
                                                        </span>
                                                        <span className="text-xs font-medium text-gray-700 truncate">{sdgMeta.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            onClick={() => handleApproveSdg(entry.sdgNumber)}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleDismissSdg(entry.sdgNumber)}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                            Dismiss
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-gray-400">
                            Select SDGs relevant to this lesson. Click a chip to toggle.
                        </p>

                        <div className="flex flex-wrap gap-1.5">
                            {SDG_LIST.map((sdg) => {
                                const entry = sdgs.find((s) => s.sdgNumber === sdg.n);
                                const isApproved = !!entry?.approved;
                                const aiSuggested = !!entry?.aiSuggested && !isApproved;

                                return (
                                    <button
                                        key={sdg.n}
                                        type="button"
                                        onClick={() => canEdit && handleToggleSDG(sdg.n)}
                                        disabled={!canEdit}
                                        title={sdg.name}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-all disabled:cursor-default ${
                                            isApproved
                                                ? "text-white border-transparent"
                                                : aiSuggested
                                                ? "bg-white border-2"
                                                : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400"
                                        }`}
                                        style={
                                            isApproved
                                                ? { backgroundColor: sdg.color, borderColor: sdg.color }
                                                : aiSuggested
                                                ? { borderColor: sdg.color, color: sdg.color }
                                                : {}
                                        }
                                    >
                                        <span className="font-bold">{sdg.n}</span>
                                        <span className="hidden sm:inline max-w-[80px] truncate">{sdg.name}</span>
                                        {aiSuggested && <span className="text-xs opacity-70">✦</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {showAddRef && (
                <AddReferenceModal
                    weekId={week.id}
                    onAdded={handleRefAdded}
                    onClose={() => setShowAddRef(false)}
                    existingRefs={refs}
                />
            )}
        </div>
    );
}

// ─── Main phase component ──────────────────────────────────────────────────────

export function WizardPhase4References({ terms, canEdit, onWeekUpdated, onOpenTerm }: Props) {
    const allWeeks = terms.flatMap((t) => t.weeks);

    if (allWeeks.length === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-gray-400 text-sm">No weeks found. Go back to Step 2 and add weeks first.</p>
            </div>
        );
    }

    const weeksWithRefs = allWeeks.filter((w) => w.references.length > 0 || w.sdgMappings.length > 0).length;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-gray-800">Resources & SDG Mappings</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Add references (text, YouTube, images, files) and map SDGs to each lesson week.
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-sm font-semibold text-gray-800">{weeksWithRefs}/{allWeeks.length}</span>
                    <p className="text-xs text-gray-400">weeks with resources</p>
                </div>
            </div>

            {terms.map((term) => (
                <div key={term.id} className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                        {term.term.name || `Term ${term.termNumber}`}
                        <span className="ml-2 font-normal text-gray-400 normal-case tracking-normal">
                            ({term.weeks.length} week{term.weeks.length !== 1 ? "s" : ""})
                        </span>
                    </h3>
                    {term.weeks.length === 0 ? (
                        onOpenTerm ? (
                            <button
                                type="button"
                                onClick={() => onOpenTerm(term.termNumber)}
                                className="w-full text-left pl-2 pr-3 py-3 rounded-xl border border-dashed border-gray-200 hover:border-primary-300 hover:bg-primary-50/40 transition-colors"
                            >
                                <p className="text-xs text-gray-400 italic">No weeks in this term</p>
                                <p className="text-xs font-medium text-primary-600 mt-1">Click to add weeks for {term.term.name || `Term ${term.termNumber}`}</p>
                            </button>
                        ) : (
                            <p className="text-xs text-gray-400 italic pl-2">No weeks in this term</p>
                        )
                    ) : (
                        <div className="space-y-2">
                            {[...term.weeks]
                                .sort((a, b) => a.weekNumber - b.weekNumber)
                                .map((week) => (
                                    <WeekResourcesCard
                                        key={week.id}
                                        week={week}
                                        canEdit={canEdit}
                                        onUpdated={(updates) => onWeekUpdated(week.id, updates)}
                                    />
                                ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
