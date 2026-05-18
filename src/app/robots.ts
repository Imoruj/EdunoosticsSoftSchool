import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: "*",
                allow: "/",
                disallow: [
                    "/dashboard/",
                    "/auth/",
                    "/api/",
                    "/admin/",
                    "/_next/",
                ],
            },
        ],
        sitemap: "https://www.edunostics.com/sitemap.xml",
        host: "https://www.edunostics.com",
    };
}
