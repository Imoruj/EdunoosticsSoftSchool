import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

const BASE_URL = "https://www.edunostics.com";

export const metadata: Metadata = {
    metadataBase: new URL(BASE_URL),
    title: {
        default: "Edunostics — School Technology Platform for Nigerian Secondary Schools",
        template: "%s | Edunostics",
    },
    description: "Edunostics connects assessment software, academic records, attendance, smart hardware, and parent communication into one trusted operating system for Nigerian secondary schools.",
    keywords: [
        "school management system Nigeria",
        "secondary school software Nigeria",
        "report card management system",
        "student assessment software",
        "school attendance system",
        "Nigerian school technology",
        "academic records management",
        "school ERP Nigeria",
        "edunostics",
    ],
    authors: [{ name: "Edunostics Limited" }],
    creator: "Edunostics Limited",
    publisher: "Edunostics Limited",
    robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    openGraph: {
        type: "website",
        locale: "en_NG",
        url: BASE_URL,
        siteName: "Edunostics",
        title: "Edunostics — School Technology Platform for Nigerian Secondary Schools",
        description: "Assessment software, academic records, attendance, and parent communication — one operating system for secondary schools.",
        images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Edunostics platform" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Edunostics — School Technology Platform",
        description: "Assessment, records, attendance, and parent communication for Nigerian secondary schools.",
        images: ["/og-image.png"],
        creator: "@edunostics",
    },
    icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon-16x16.png",
        apple: "/apple-touch-icon.png",
    },
    manifest: "/manifest.webmanifest",
    alternates: { canonical: BASE_URL },
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
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
            </head>
            <body suppressHydrationWarning>
                <Script id="theme-init" strategy="beforeInteractive">{`try{var path=window.location.pathname;var isPublic=path==='/'||path.startsWith('/auth');var enabled=isPublic||localStorage.getItem('ed-dark-mode-feature-enabled')==='true';var saved=localStorage.getItem('ed-theme');var theme='light';if(enabled){theme=saved?saved:'light';}document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.setAttribute('data-theme',theme);}catch(e){}`}</Script>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
