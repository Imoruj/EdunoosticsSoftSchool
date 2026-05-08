"use client";

import React from "react";

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
    return (
        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-[0px_4px_24px_-8px_rgba(0,0,0,0.04)] border border-slate-100/80 dark:border-gray-700 overflow-hidden ${className}`}>
            {children}
        </div>
    );
}

export function CardHeader({ className = "", children }: { className?: string; children: React.ReactNode }) {
    return <div className={`px-6 py-5 border-b border-slate-50 dark:border-gray-700 ${className}`}>{children}</div>;
}

export function CardTitle({ className = "", children }: { className?: string; children: React.ReactNode }) {
    return <h2 className={`text-base font-semibold text-slate-900 dark:text-gray-100 ${className}`}>{children}</h2>;
}

export function CardDescription({ className = "", children }: { className?: string; children: React.ReactNode }) {
    return <p className={`text-sm text-slate-500 dark:text-gray-400 mt-0.5 ${className}`}>{children}</p>;
}

export function CardContent({ className = "", children }: { className?: string; children: React.ReactNode }) {
    return <div className={`p-6 ${className}`}>{children}</div>;
}

export function CardFooter({ className = "", children }: { className?: string; children: React.ReactNode }) {
    return <div className={`px-6 py-4 border-t border-slate-50 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-900/50 ${className}`}>{children}</div>;
}
