import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Edunostics — School Technology Platform",
        short_name: "Edunostics",
        description: "Assessment, records, attendance, and parent communication for Nigerian secondary schools.",
        start_url: "/",
        display: "standalone",
        background_color: "#09080d",
        theme_color: "#00A99A",
        orientation: "portrait-primary",
        icons: [
            { src: "/icon-192.png",  sizes: "192x192",  type: "image/png" },
            { src: "/icon-512.png",  sizes: "512x512",  type: "image/png" },
            { src: "/icon-512.png",  sizes: "512x512",  type: "image/png", purpose: "maskable" },
        ],
        categories: ["education", "productivity", "business"],
    };
}
