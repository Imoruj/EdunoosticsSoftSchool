/** @type {import('next').NextConfig} */
const path = require("path");
const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    { key: "X-XSS-Protection", value: "1; mode=block" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
    },
    {
        key: "Content-Security-Policy",
        value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            isDev ? "style-src 'self' 'unsafe-inline'" : "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
            "img-src 'self' data: blob: https://res.cloudinary.com https://img.youtube.com",
            isDev ? "font-src 'self' data: https:" : "font-src 'self' https://fonts.gstatic.com https://api.fontshare.com https://cdn.fontshare.com",
            isDev ? "connect-src 'self' https://res.cloudinary.com https://generativelanguage.googleapis.com https:" : "connect-src 'self' https://res.cloudinary.com https://generativelanguage.googleapis.com",
            "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://docs.google.com",
            "frame-ancestors 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join("; "),
    },
];

const nextConfig = {
    distDir: isDev ? ".next-dev" : ".next",
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "res.cloudinary.com",
            },
        ],
    },
    experimental: {
        optimizePackageImports: [
            "@react-pdf/renderer",
            "html2canvas",
            "jspdf",
        ],
    },
    turbopack: {
        root: __dirname,
    },
    webpack(config) {
        if (config.cache && typeof config.cache === "object") {
            config.cache.buildDependencies = {
                ...config.cache.buildDependencies,
                prismaSchema: [path.resolve(__dirname, "prisma/schema.prisma")],
            };
        }
        return config;
    },
    async headers() {
        if (isDev) {
            return [];
        }

        return [
            {
                source: "/(.*)",
                headers: securityHeaders,
            },
        ];
    },
};

module.exports = nextConfig;
