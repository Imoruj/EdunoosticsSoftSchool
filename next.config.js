/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === "development";

const nextConfig = {
    // Keep dev artifacts out of `.next` so `next dev` and `next build/start`
    // cannot clobber each other's chunks.
    distDir: isDev ? ".next-dev" : ".next",
    reactStrictMode: true,
    eslint: {
        // Temporary: allow production build/deploy while lint debt is being cleaned up.
        ignoreDuringBuilds: true,
    },
    images: {
        domains: ['res.cloudinary.com'],
    },
    // Speed up dev mode compilation
    experimental: {
        optimizePackageImports: [
            '@react-pdf/renderer',
            'html2canvas',
            'jspdf',
        ],
    },
};

module.exports = nextConfig;
