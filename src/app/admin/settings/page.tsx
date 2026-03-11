"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export default function AdminSettingsPage() {
    const { data: session } = useSession();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (newPassword !== confirmPassword) {
            setMessage({ type: "error", text: "New passwords do not match" });
            return;
        }

        if (newPassword.length < 6) {
            setMessage({ type: "error", text: "Password must be at least 6 characters" });
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/users/me", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage({ type: "error", text: data.error || "Failed to update password" });
            } else {
                setMessage({ type: "success", text: "Password changed successfully!" });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            }
        } catch {
            setMessage({ type: "error", text: "An unexpected error occurred" });
        } finally {
            setIsLoading(false);
        }
    };

    const userName = session?.user?.name || "Super Admin";
    const userEmail = session?.user?.email || "";

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
                <p className="text-gray-500 text-sm mt-1">Manage your super admin account</p>
            </div>

            {/* Account Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Account Info
                </h2>
                <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                        <span className="text-sm text-gray-500">Name</span>
                        <span className="text-sm font-medium text-gray-900">{userName}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm text-gray-500">Email</span>
                        <span className="text-sm font-medium text-gray-900">{userEmail}</span>
                    </div>
                </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Change Password
                </h2>

                {message && (
                    <div
                        className={`mb-5 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${
                            message.type === "success"
                                ? "bg-green-50 text-green-700 border border-green-100"
                                : "bg-red-50 text-red-600 border border-red-100"
                        }`}
                    >
                        {message.type === "success" ? (
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Current Password
                        </label>
                        <input
                            type="password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Enter your current password"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            New Password
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="At least 6 characters"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Repeat new password"
                        />
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Updating...
                                </>
                            ) : (
                                "Update Password"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
