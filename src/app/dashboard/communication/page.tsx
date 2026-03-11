
"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { showSuccessMessage } from "@/lib/successMessage";

export default function CommunicationPage() {
    const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");
    const [channel, setChannel] = useState<"SMS" | "EMAIL">("SMS");
    const [recipientType, setRecipientType] = useState<"all_parents" | "specific_numbers">("specific_numbers");
    const [recipients, setRecipients] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!message) {
            toast.error("Message content is required");
            return;
        }

        // Parse recipients
        let recipientList: string[] = [];
        if (recipientType === "specific_numbers") {
            if (!recipients) {
                toast.error("Please enter at least one recipient");
                return;
            }
            recipientList = recipients.split(",").map(s => s.trim()).filter(Boolean);
        } else {
            // Bulk "all parents" sending requires a backend aggregation endpoint — not yet implemented.
            toast.error("Bulk sending to all parents is not yet available.");
            return;
        }

        setIsSending(true);

        try {
            const res = await fetch("/api/communication/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    channel,
                    recipients: recipientList,
                    message,
                    subject: channel === "EMAIL" ? subject : undefined
                }),
            });

            const data = await res.json();

            if (res.ok && data.success !== false) {
                showSuccessMessage("Message sent successfully!", { title: "Message Sent!" });
                setMessage("");
                setRecipients("");
                setSubject("");
            } else {
                toast.error(data.error || "Failed to send message");
            }
        } catch (error) {
            console.error("Send error", error);
            toast.error("An error occurred");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Message Center</h1>
                <p className="text-gray-500">Send broadcasts and notifications to parents and staff.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab("compose")}
                        className={`flex-1 py-4 text-sm font-medium text-center ${activeTab === "compose" ? "text-primary-600 border-b-2 border-primary-600" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Compose Message
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`flex-1 py-4 text-sm font-medium text-center ${activeTab === "history" ? "text-primary-600 border-b-2 border-primary-600" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        Message History
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === "compose" ? (
                        <form onSubmit={handleSend} className="space-y-6 max-w-2xl mx-auto">
                            {/* Channel Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setChannel("SMS")}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${channel === "SMS" ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-200 hover:border-gray-300 text-gray-600"}`}
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                    <span className="font-semibold">SMS</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setChannel("EMAIL")}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${channel === "EMAIL" ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-200 hover:border-gray-300 text-gray-600"}`}
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className="font-semibold">Email</span>
                                </button>
                            </div>

                            {/* Recipient Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
                                <div className="flex gap-4 mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="recipientType"
                                            value="specific_numbers"
                                            checked={recipientType === "specific_numbers"}
                                            onChange={() => setRecipientType("specific_numbers")}
                                            className="text-primary-600 focus:ring-primary-500"
                                        />
                                        <span className="text-gray-700">Specific {channel === "SMS" ? "Numbers" : "Emails"}</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio" // Disabled for now
                                            name="recipientType"
                                            value="all_parents"
                                            checked={recipientType === "all_parents"}
                                            onChange={() => setRecipientType("all_parents")}
                                            className="text-primary-600 focus:ring-primary-500"
                                            disabled
                                        />
                                        <span className="text-gray-400 cursor-not-allowed">All Parents (Coming Soon)</span>
                                    </label>
                                </div>

                                {recipientType === "specific_numbers" && (
                                    <textarea
                                        value={recipients}
                                        onChange={(e) => setRecipients(e.target.value)}
                                        placeholder={channel === "SMS" ? "08012345678, 08087654321" : "parent1@example.com, parent2@example.com"}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 h-24"
                                    />
                                )}
                            </div>

                            {/* Subject (Email Only) */}
                            {channel === "EMAIL" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                        placeholder="Message Subject"
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                            )}

                            {/* Message Body */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Type your message here..."
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 h-40"
                                    required
                                />
                                {channel === "SMS" && (
                                    <p className="text-xs text-right text-gray-500 mt-1">
                                        {message.length} characters • {Math.ceil(message.length / 160)} SMS page(s)
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isSending}
                                className="w-full bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSending ? "Sending..." : "Send BroadCast"}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <p>Message history implementation coming soon...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
