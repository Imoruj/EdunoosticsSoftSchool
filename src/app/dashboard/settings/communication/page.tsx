
"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { showSuccessMessage } from "@/lib/successMessage";

export default function CommunicationSettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [config, setConfig] = useState<any>({
        smsProvider: "termii",
        smsApiKey: "",
        hasSmsApiKey: false,
        smsSenderId: "",
        emailProvider: "smtp",
        emailHost: "",
        emailPort: "587",
        emailUser: "",
        emailPassword: "",
        hasEmailPassword: false,
        emailFrom: "",
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch("/api/settings/communication");
                if (res.ok) {
                    const data = await res.json();
                    if (data && Object.keys(data).length > 0) {
                        setConfig({
                            ...data,
                            emailPort: data.emailPort?.toString() || "587",
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch settings", error);
                toast.error("Failed to load settings");
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setConfig((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            const res = await fetch("/api/settings/communication", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });

            if (res.ok) {
                showSuccessMessage("Settings saved successfully", { title: "Settings Saved!" });
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save settings");
            }
        } catch (error) {
            console.error("Save error", error);
            toast.error("An error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Communication Settings</h1>
                <p className="text-gray-500">Configure SMS and Email service providers.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* SMS Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                        </span>
                        SMS Configuration (Termii)
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                            <select
                                name="smsProvider"
                                value={config.smsProvider}
                                onChange={handleChange}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                disabled // Only Termii supported for now
                            >
                                <option value="termii">Termii</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sender ID</label>
                            <input
                                type="text"
                                name="smsSenderId"
                                value={config.smsSenderId || ""}
                                onChange={handleChange}
                                placeholder="e.g., SCHOOL-NAME"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Must be registered on Termii dashboard.</p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                            <input
                                type="password"
                                name="smsApiKey"
                                value={config.smsApiKey || ""}
                                onChange={handleChange}
                                placeholder={config.hasSmsApiKey ? "Saved key exists (leave blank to keep current)" : ""}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* Email Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <span className="p-1.5 bg-purple-100 rounded-lg text-purple-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </span>
                        Email Configuration (SMTP)
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                            <select
                                name="emailProvider"
                                value={config.emailProvider}
                                onChange={handleChange}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            >
                                <option value="smtp">SMTP</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
                            <input
                                type="text"
                                name="emailHost"
                                value={config.emailHost || ""}
                                onChange={handleChange}
                                placeholder="smtp.gmail.com"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
                            <input
                                type="number"
                                name="emailPort"
                                value={config.emailPort || ""}
                                onChange={handleChange}
                                placeholder="587"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
                            <input
                                type="text"
                                name="emailFrom"
                                value={config.emailFrom || ""}
                                onChange={handleChange}
                                placeholder="School Admin"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username / Email</label>
                            <input
                                type="text"
                                name="emailUser"
                                value={config.emailUser || ""}
                                onChange={handleChange}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                name="emailPassword"
                                value={config.emailPassword || ""}
                                onChange={handleChange}
                                placeholder={config.hasEmailPassword ? "Saved password exists (leave blank to keep current)" : ""}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-primary-600 text-white px-6 py-2.5 rounded-lg hover:bg-primary-700 font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </>
                        ) : (
                            "Save Settings"
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
