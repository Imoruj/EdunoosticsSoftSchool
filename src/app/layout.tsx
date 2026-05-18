import type { Metadata } from "next";
import Script from "next/script";
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
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                <link rel="preconnect" href="https://api.fontshare.com" />
                <link href="https://api.fontshare.com/v2/css?f[]=satoshi@700,600,500&display=swap" rel="stylesheet" />
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
            </head>
            <body suppressHydrationWarning>
                <Script id="theme-init" strategy="beforeInteractive">{`try{var path=window.location.pathname;var isPublic=path==='/'||path.startsWith('/auth');var enabled=isPublic||localStorage.getItem('ed-dark-mode-feature-enabled')==='true';var saved=localStorage.getItem('ed-theme');var theme='light';if(enabled){theme=saved?saved:'light';}document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.setAttribute('data-theme',theme);}catch(e){}`}</Script>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
