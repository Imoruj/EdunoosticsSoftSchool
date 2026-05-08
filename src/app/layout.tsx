import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
    title: "Edunostics - Report Card Management System",
    description: "Comprehensive student report card management system for Nigerian schools",
    keywords: ["school management", "report card", "Nigeria", "education", "grading"],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                {/* Flash-free theme init — runs before React hydrates */}
                <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('ed-theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();` }} />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link rel="preconnect" href="https://api.fontshare.com" />
                {/* Satoshi — brand headline font (Fontshare) */}
                <link href="https://api.fontshare.com/v2/css?f[]=satoshi@700,600,500&display=swap" rel="stylesheet" />
                {/* Inter (body) + Manrope (UI/product text) — Google Fonts */}
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body suppressHydrationWarning>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
