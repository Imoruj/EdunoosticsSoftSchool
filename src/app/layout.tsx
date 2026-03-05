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
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
