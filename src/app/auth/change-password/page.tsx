"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function ChangePasswordPage() {
    const router = useRouter();
    const { data: session, update } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match");
            setIsLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            setIsLoading(false);
            return;
        }

        if (newPassword === "1234") {
            setError("Please choose a different password");
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword, confirmPassword }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || "Failed to change password");
                return;
            }

            // Update the session to clear mustChangePassword flag
            await update({
                ...session,
                user: {
                    ...session?.user,
                    mustChangePassword: false,
                },
            });

            router.push("/dashboard");
            router.refresh();
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "flex h-11 w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#08070b]/50 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#00A99A] focus:border-transparent transition-all";
    const btnClasses = "flex w-full items-center justify-center rounded-lg px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#00A99A] to-[#008f82] hover:from-[#00bdae] hover:to-[#00A99A] shadow-lg shadow-[#00A99A]/20";

    return (
        <main className="ed-page min-h-screen flex">
            {/* Left Panel - Branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 z-10 relative overflow-hidden bg-gradient-to-br from-[#00A99A] via-[#009487] to-[#005f57]">
                {/* Decorative background shapes */}
                <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute top-1/2 -left-20 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute -bottom-16 right-1/4 w-72 h-72 rounded-full bg-black/10 pointer-events-none" />

                <div>
                    <Link href="/" className="flex items-center gap-3 w-fit">
                        <div className="bg-white/90 p-2 rounded-xl shadow-sm flex items-center justify-center shrink-0"><img src="/images/brand/logo-mark.png" alt="" aria-hidden="true" style={{ height: 26, width: "auto" }} /></div>
                        <span className="text-white font-bold text-2xl font-['Satoshi',sans-serif]">Edunostics</span>
                    </Link>
                </div>

                <div className="max-w-md">
                    <h1 className="text-4xl font-bold text-white mb-6 font-['Satoshi',sans-serif]">
                        Secure your account
                    </h1>
                    <p className="text-white/80 text-lg font-['Manrope',sans-serif]">
                        For your security, please create a new password before continuing.
                        Choose a strong password that you&apos;ll remember.
                    </p>
                </div>

                <div className="flex items-center gap-4 font-['Manrope',sans-serif]">
                    <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <p className="text-white/70 text-sm">
                        Your password must be at least 6 characters long
                    </p>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 z-10 relative">
                <div className="w-full max-w-md">
                    <div className="ed-glass-card rounded-2xl shadow-2xl p-8">
                        {/* Mobile Logo */}
                        <div className="lg:hidden flex justify-center mb-8">
                            <Link href="/" className="flex items-center gap-3">
                                <div className="bg-white p-1.5 rounded-lg shadow-sm flex items-center justify-center shrink-0"><img src="/images/brand/logo-mark.png" alt="" aria-hidden="true" style={{ height: 22, width: "auto" }} /></div>
                                <span className="text-gray-900 dark:text-white font-bold text-xl font-['Satoshi',sans-serif]">Edunostics</span>
                            </Link>
                        </div>

                        <div className="flex justify-center mb-6">
                            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-2 font-['Satoshi',sans-serif]">
                            Change your password
                        </h2>
                        <p className="text-gray-500 dark:text-white/60 text-center mb-8 font-['Manrope',sans-serif]">
                            You&apos;re using a default password. Please create a new one to continue.
                        </p>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg mb-6 text-sm font-['Manrope',sans-serif]">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5 font-['Manrope',sans-serif]">
                            <div>
                                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                    New Password
                                </label>
                                <input
                                    id="newPassword"
                                    type="password"
                                    required
                                    minLength={6}
                                    className={inputClasses}
                                    placeholder="Enter new password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-white/80 mb-2">
                                    Confirm Password
                                </label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    required
                                    minLength={6}
                                    className={inputClasses}
                                    placeholder="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={btnClasses}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                                fill="none"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                            />
                                        </svg>
                                        Updating...
                                    </span>
                                ) : (
                                    "Set New Password"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </main>
    );
}
