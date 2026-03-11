"use client";

import React from "react";

interface AvatarProps {
    src?: string | null;
    initials?: string;
    alt?: string;
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
}

export function Avatar({ src, initials = "?", alt = "Avatar", size = "md", className = "" }: AvatarProps) {
    const sizes = {
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm",
        lg: "w-12 h-12 text-base",
        xl: "w-16 h-16 text-lg",
    };

    const containerStyle = `rounded-full flex items-center justify-center overflow-hidden shrink-0 ${sizes[size]} ${className}`;

    if (src) {
        return (
            <div className={`${containerStyle} border border-gray-200`}>
                <img src={src} alt={alt} className="w-full h-full object-cover" />
            </div>
        );
    }

    return (
        <div className={`${containerStyle} bg-primary-100 text-primary-700 font-semibold border border-primary-200`}>
            {initials.toUpperCase().slice(0, 2)}
        </div>
    );
}
