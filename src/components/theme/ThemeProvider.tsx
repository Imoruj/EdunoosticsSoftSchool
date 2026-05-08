"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
    theme: Theme;
    darkModeEnabled: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
    theme: "light",
    darkModeEnabled: false,
    toggleTheme: () => {},
});

function applyTheme(t: Theme) {
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.setAttribute("data-theme", t);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("light");
    const [darkModeEnabled, setDarkModeEnabled] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const syncThemeAvailability = async () => {
            let enabled = false;
            try {
                const response = await fetch("/api/school/features", { cache: "no-store" });
                if (response.ok) {
                    const data = await response.json();
                    enabled = data?.features?.darkModeEnabled !== false;
                }
            } catch {
                enabled = false;
            }

            if (cancelled) return;

            localStorage.setItem("ed-dark-mode-feature-enabled", String(enabled));
            setDarkModeEnabled(enabled);

            if (!enabled) {
                localStorage.removeItem("ed-theme");
                setTheme("light");
                applyTheme("light");
                return;
            }

            const savedTheme = localStorage.getItem("ed-theme");
            const nextTheme: Theme = savedTheme === "dark" ? "dark" : "light";
            setTheme(nextTheme);
            applyTheme(nextTheme);
        };

        const syncWhenVisible = () => {
            if (document.visibilityState === "visible") {
                void syncThemeAvailability();
            }
        };

        void syncThemeAvailability();
        window.addEventListener("school-features-updated", syncThemeAvailability);
        window.addEventListener("focus", syncThemeAvailability);
        document.addEventListener("visibilitychange", syncWhenVisible);

        return () => {
            cancelled = true;
            window.removeEventListener("school-features-updated", syncThemeAvailability);
            window.removeEventListener("focus", syncThemeAvailability);
            document.removeEventListener("visibilitychange", syncWhenVisible);
        };
    }, []);

    const toggleTheme = () => {
        if (!darkModeEnabled) {
            localStorage.removeItem("ed-theme");
            setTheme("light");
            applyTheme("light");
            return;
        }

        setTheme((prev) => {
            const next: Theme = prev === "dark" ? "light" : "dark";
            localStorage.setItem("ed-theme", next);
            applyTheme(next);
            return next;
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, darkModeEnabled, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
