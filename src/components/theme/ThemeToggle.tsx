"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    return (
        <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
                width: 36, height: 36,
                borderRadius: "50%",
                border: "1px solid var(--border)",
                background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                color: "var(--muted-foreground)",
                flexShrink: 0,
                transition: "background .18s, color .18s",
            }}
        >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
    );
}
