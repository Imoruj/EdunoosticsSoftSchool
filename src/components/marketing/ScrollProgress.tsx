"use client";

import { useEffect, useState } from "react";

export function ScrollProgress() {
    const [pct, setPct] = useState(0);

    useEffect(() => {
        const onScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
            setPct(scrollHeight <= clientHeight ? 0 : (scrollTop / (scrollHeight - clientHeight)) * 100);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div
            aria-hidden="true"
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "2px",
                background: "linear-gradient(90deg, #00A99A 0%, #8B6BF2 50%, #C69214 100%)",
                transformOrigin: "left center",
                transform: `scaleX(${pct / 100})`,
                zIndex: 300,
                pointerEvents: "none",
                willChange: "transform",
            }}
        />
    );
}
