/**
 * GoogleDrivePicker
 * Opens a Google Drive file picker dialog using the Google Picker API + Google Identity Services.
 * Users will be prompted to sign in with Google if they haven't already.
 * On file selection, calls onSelect with the file metadata (url, name, mimeType).
 */

'use client';

import { useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface DriveFile {
    id: string;
    name: string;
    mimeType: string;
    url: string;        // embed URL (ready to use)
    thumbnailUrl?: string;
}

interface GoogleDrivePickerProps {
    accept: 'image' | 'video';
    onSelect: (file: DriveFile) => void;
    onCancel?: () => void;
    children: ReactNode;
    /** Called with a raw URL when the user types one in the fallback input */
    onFallbackUrl?: (url: string) => void;
}

// Extend window for Google API globals
declare global {
    interface Window {
        google: any;
        gapi: any;
        tokenClient: any;
    }
}

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const IS_CONFIGURED = !!(GOOGLE_API_KEY && GOOGLE_CLIENT_ID);

const MIME_TYPES_IMAGE = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
];
const MIME_TYPES_VIDEO = [
    'video/mp4', 'video/mpeg', 'video/x-msvideo', 'video/quicktime',
    'video/x-ms-wmv', 'video/webm', 'video/ogg',
];

function buildEmbedUrl(fileId: string, mimeType: string): string {
    if (mimeType.startsWith('image/')) {
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return `https://drive.google.com/file/d/${fileId}/preview`;
}

function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error(`Failed to load: ${src}`));
        document.head.appendChild(s);
    });
}

export function GoogleDrivePicker({ accept, onSelect, onCancel, children, onFallbackUrl }: GoogleDrivePickerProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fallbackUrl, setFallbackUrl] = useState('');
    const accessTokenRef = useRef<string | null>(null);
    const pickerInitialized = useRef(false);

    // --- Picker logic (only used when configured) ---
    const openPicker = (accessToken: string) => {
        if (!window.google?.picker) return;
        const mimeTypes = accept === 'image' ? MIME_TYPES_IMAGE : MIME_TYPES_VIDEO;
        const view = new window.google.picker.DocsView()
            .setIncludeFolders(true)
            .setMimeTypes(mimeTypes.join(','))
            .setMode(window.google.picker.DocsViewMode.GRID);
        const picker = new window.google.picker.PickerBuilder()
            .setAppId(GOOGLE_CLIENT_ID.split('-')[0])
            .setOAuthToken(accessToken)
            .setDeveloperKey(GOOGLE_API_KEY)
            .addView(view)
            .setTitle(accept === 'image' ? 'Select an image from Google Drive' : 'Select a video from Google Drive')
            .setCallback((data: any) => {
                if (data.action === window.google.picker.Action.PICKED) {
                    const doc = data.docs[0];
                    const fileId = doc.id;
                    const mimeType = doc.mimeType || '';
                    onSelect({ id: fileId, name: doc.name || 'Drive file', mimeType, url: buildEmbedUrl(fileId, mimeType), thumbnailUrl: doc.thumbnailLink });
                } else if (data.action === window.google.picker.Action.CANCEL) {
                    onCancel?.();
                }
                setIsLoading(false);
            })
            .build();
        picker.setVisible(true);
    };

    const handleClick = async () => {
        setError(null);
        setIsLoading(true);
        try {
            await Promise.all([
                loadScript('https://apis.google.com/js/api.js'),
                loadScript('https://accounts.google.com/gsi/client'),
            ]);
            if (!pickerInitialized.current) {
                await new Promise<void>((resolve) => { window.gapi.load('picker', { callback: resolve }); });
                pickerInitialized.current = true;
            }
            if (!accessTokenRef.current) {
                await new Promise<void>((resolve, reject) => {
                    const tokenClient = window.google.accounts.oauth2.initTokenClient({
                        client_id: GOOGLE_CLIENT_ID,
                        scope: 'https://www.googleapis.com/auth/drive.readonly',
                        callback: (tokenResponse: any) => {
                            if (tokenResponse.error) { reject(new Error(tokenResponse.error)); return; }
                            accessTokenRef.current = tokenResponse.access_token;
                            resolve();
                        },
                    });
                    tokenClient.requestAccessToken({ prompt: '' });
                });
            }
            if (accessTokenRef.current) openPicker(accessTokenRef.current);
        } catch (err: any) {
            console.error('Google Drive Picker error:', err);
            setError(err?.message || 'Failed to open Google Drive. Please try again.');
            setIsLoading(false);
        }
    };

    // --- Fallback: manual URL input (when Drive keys are not configured) ---
    if (!IS_CONFIGURED) {
        const parseDriveUrl = (raw: string) => {
            const m = raw.match(/\/file\/d\/([^/]+)/) || raw.match(/[?&]id=([^&]+)/);
            if (m) {
                return accept === 'image'
                    ? `https://drive.google.com/uc?export=view&id=${m[1]}`
                    : `https://drive.google.com/file/d/${m[1]}/preview`;
            }
            return raw;
        };

        return (
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
                    </svg>
                    Paste a Google Drive share link below. To enable one-click browsing, add your Google API keys in Settings.
                </div>
                <input
                    type="text"
                    value={fallbackUrl}
                    onChange={(e) => setFallbackUrl(e.target.value)}
                    onBlur={(e) => {
                        const url = parseDriveUrl(e.target.value.trim());
                        if (url) {
                            setFallbackUrl(url);
                            onFallbackUrl?.(url);
                            onSelect({ id: '', name: 'Drive file', mimeType: accept === 'image' ? 'image/jpeg' : 'video/mp4', url });
                        }
                    }}
                    placeholder="Paste Google Drive shareable link..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <p className="text-xs text-gray-500">Make sure sharing is set to "Anyone with the link can view"</p>
            </div>
        );
    }

    // --- Configured: show the picker button ---
    return (
        <div>
            <div
                role="button"
                onClick={handleClick}
                style={{ cursor: isLoading ? 'wait' : 'pointer', display: 'inline-block', width: '100%' }}
            >
                {isLoading ? (
                    <div className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-blue-300 rounded-lg p-8 bg-blue-50">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-blue-600">Connecting to Google Drive...</span>
                    </div>
                ) : (
                    children
                )}
            </div>
            {error && (
                <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-200 rounded p-2">{error}</p>
            )}
        </div>
    );
}
