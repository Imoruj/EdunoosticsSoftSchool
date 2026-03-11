"use client";

import React from "react";

interface ProgressProps {
    value: number; // 0 to 100
    max?: number;
    className?: string;
    indicatorClassName?: string;
}

export function Progress({ value, max = 100, className = "", indicatorClassName = "bg-primary-600" }: ProgressProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
        <div className={`w-full bg-slate-100 rounded-full h-1.5 overflow-hidden ${className}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
            <div
                className={`h-full transition-all duration-500 ease-in-out ${indicatorClassName}`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
}
