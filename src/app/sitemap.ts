import type { MetadataRoute } from "next";

const BASE = "https://www.edunostics.com";

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();

    const marketingRoutes = [
        { path: "",           priority: 1.0,  changeFreq: "weekly"  as const },
        { path: "/overview",  priority: 0.9,  changeFreq: "monthly" as const },
        { path: "/assessment",priority: 0.9,  changeFreq: "monthly" as const },
        { path: "/reports",   priority: 0.85, changeFreq: "monthly" as const },
        { path: "/hardware",  priority: 0.8,  changeFreq: "monthly" as const },
        { path: "/security",  priority: 0.75, changeFreq: "monthly" as const },
        { path: "/about",     priority: 0.7,  changeFreq: "monthly" as const },
        { path: "/contact",   priority: 0.7,  changeFreq: "monthly" as const },
        { path: "/partners",  priority: 0.6,  changeFreq: "monthly" as const },
        { path: "/school-setup",   priority: 0.65, changeFreq: "monthly" as const },
        { path: "/data-security",  priority: 0.6,  changeFreq: "monthly" as const },
        { path: "/documentation",  priority: 0.6,  changeFreq: "weekly"  as const },
        { path: "/support",        priority: 0.6,  changeFreq: "weekly"  as const },
        { path: "/status",         priority: 0.4,  changeFreq: "hourly"  as const },
        { path: "/privacy",        priority: 0.3,  changeFreq: "yearly"  as const },
        { path: "/terms",          priority: 0.3,  changeFreq: "yearly"  as const },
    ];

    return marketingRoutes.map(({ path, priority, changeFreq }) => ({
        url: `${BASE}${path}`,
        lastModified: now,
        changeFrequency: changeFreq,
        priority,
    }));
}
