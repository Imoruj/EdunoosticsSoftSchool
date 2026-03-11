"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import GlobalSuccessModal from "@/components/ui/GlobalSuccessModal";
import GlobalAppMessageBox from "@/components/ui/GlobalAppMessageBox";
import { DynamicFavicon } from "@/components/branding/DynamicFavicon";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <DynamicFavicon />
            {children}
            <GlobalSuccessModal />
            <GlobalAppMessageBox />
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 3500,
                    style: {
                        borderRadius: "10px",
                        background: "#111827",
                        color: "#fff",
                    },
                    success: {
                        style: {
                            background: "#065f46",
                        },
                    },
                    error: {
                        style: {
                            background: "#991b1b",
                        },
                    },
                }}
            />
        </SessionProvider>
    );
}
