"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import {
    APP_MESSAGE_BOX_EVENT,
    type AppMessageBoxDetail,
    type AppMessageBoxVariant,
} from "@/lib/appMessageBox";

const variantStyles: Record<
    AppMessageBoxVariant,
    {
        icon: ComponentType<{ className?: string }>;
        iconWrapperClassName: string;
        confirmButtonClassName: string;
        defaultTitle: string;
    }
> = {
    success: {
        icon: CheckCircle2,
        iconWrapperClassName: "bg-green-100 text-green-600",
        confirmButtonClassName: "bg-gray-900 hover:bg-gray-800 text-white",
        defaultTitle: "Success!",
    },
    info: {
        icon: Info,
        iconWrapperClassName: "bg-blue-100 text-blue-600",
        confirmButtonClassName: "bg-gray-900 hover:bg-gray-800 text-white",
        defaultTitle: "Notice",
    },
    warning: {
        icon: AlertTriangle,
        iconWrapperClassName: "bg-amber-100 text-amber-600",
        confirmButtonClassName: "bg-amber-600 hover:bg-amber-700 text-white",
        defaultTitle: "Please Confirm",
    },
    error: {
        icon: XCircle,
        iconWrapperClassName: "bg-red-100 text-red-600",
        confirmButtonClassName: "bg-red-600 hover:bg-red-700 text-white",
        defaultTitle: "Something Went Wrong",
    },
};

export default function GlobalAppMessageBox() {
    const [queue, setQueue] = useState<AppMessageBoxDetail[]>([]);

    useEffect(() => {
        const handleMessageBox = (event: Event) => {
            const customEvent = event as CustomEvent<AppMessageBoxDetail>;
            if (!customEvent.detail?.message) return;
            setQueue((currentQueue) => [...currentQueue, customEvent.detail]);
        };

        window.addEventListener(APP_MESSAGE_BOX_EVENT, handleMessageBox as EventListener);
        return () => {
            window.removeEventListener(APP_MESSAGE_BOX_EVENT, handleMessageBox as EventListener);
        };
    }, []);

    const activeMessage = queue[0] ?? null;

    const closeMessage = (confirmed: boolean) => {
        if (!activeMessage) return;
        activeMessage.resolve(confirmed);
        setQueue((currentQueue) => currentQueue.slice(1));
    };

    useEffect(() => {
        if (!activeMessage) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            closeMessage(activeMessage.mode === "alert");
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeMessage]);

    const resolvedVariant = activeMessage?.variant ?? (activeMessage?.mode === "confirm" ? "warning" : "info");

    const variantConfig = useMemo(() => {
        if (!activeMessage) return null;
        return variantStyles[resolvedVariant];
    }, [activeMessage, resolvedVariant]);

    if (!activeMessage || !variantConfig) return null;

    const Icon = variantConfig.icon;
    const title = activeMessage.title || variantConfig.defaultTitle;
    const confirmText = activeMessage.confirmText || (activeMessage.mode === "confirm" ? "Continue" : "Okay");
    const cancelText = activeMessage.cancelText || "Cancel";

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div
                className="absolute inset-0"
                onClick={() => closeMessage(activeMessage.mode === "alert")}
                aria-hidden="true"
            />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 animate-scaleIn text-center border border-gray-100">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 scale-110 ${variantConfig.iconWrapperClassName}`}>
                    <Icon className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2 uppercase tracking-tight">{title}</h3>
                <div className="text-sm text-gray-500 mb-8 font-medium leading-relaxed px-2 whitespace-pre-line">
                    {activeMessage.message}
                </div>
                <div className={`flex ${activeMessage.mode === "confirm" ? "gap-3" : ""}`}>
                    {activeMessage.mode === "confirm" && (
                        <button
                            onClick={() => closeMessage(false)}
                            className="flex-1 py-4 bg-white text-gray-700 rounded-xl font-black text-xs uppercase tracking-widest border border-gray-200 hover:bg-gray-50 transition-all active:scale-95"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={() => closeMessage(true)}
                        className={`py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${activeMessage.mode === "confirm" ? "flex-1" : "w-full"} ${variantConfig.confirmButtonClassName}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
