"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

type Channel = "SMS" | "EMAIL";
type RecipientMode = "manual" | "group";
type Group = "all_parents" | "all_students" | "all_teachers" | string; // string for class:id

interface ClassArm { id: string; name: string; }

export default function CommunicationPage() {
    const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");
    const [channel, setChannel] = useState<Channel>("SMS");
    const [mode, setMode] = useState<RecipientMode>("manual");
    const [group, setGroup] = useState<Group>("all_parents");
    const [classArms, setClassArms] = useState<ClassArm[]>([]);
    const [selectedClassArmId, setSelectedClassArmId] = useState("");
    const [manualRecipients, setManualRecipients] = useState("");
    const [resolvedRecipients, setResolvedRecipients] = useState<string[]>([]);
    const [loadingRecipients, setLoadingRecipients] = useState(false);
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        fetch("/api/classes")
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.classArms) setClassArms(data.classArms.map((ca: any) => ({ id: ca.id, name: `${ca.class?.name ?? ""} ${ca.armName}`.trim() })));
            })
            .catch(() => {});
    }, []);

    const resolveGroup = async (g: Group) => {
        setLoadingRecipients(true);
        const effectiveGroup = g === "class" ? `class:${selectedClassArmId}` : g;
        try {
            const r = await fetch(`/api/communication/recipients?channel=${channel}&group=${effectiveGroup}`);
            const data = await r.json();
            setResolvedRecipients(data.recipients ?? []);
            if (data.count === 0) toast.error("No contacts found for the selected group.");
        } catch {
            toast.error("Failed to load recipients");
        } finally {
            setLoadingRecipients(false);
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) { toast.error("Message is required"); return; }

        let recipientList: string[];
        if (mode === "manual") {
            recipientList = manualRecipients.split(",").map(s => s.trim()).filter(Boolean);
            if (!recipientList.length) { toast.error("Enter at least one recipient"); return; }
        } else {
            if (!resolvedRecipients.length) { toast.error("Resolve recipients first"); return; }
            recipientList = resolvedRecipients;
        }

        if (channel === "EMAIL" && !subject.trim()) { toast.error("Subject is required for email"); return; }

        setIsSending(true);
        try {
            const res = await fetch("/api/communication/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ channel, recipients: recipientList, message, subject: channel === "EMAIL" ? subject : undefined }),
            });
            const data = await res.json();
            if (res.ok && data.success !== false) {
                toast.success(`Message sent to ${recipientList.length} recipient(s)`);
                setMessage(""); setManualRecipients(""); setSubject(""); setResolvedRecipients([]);
            } else {
                toast.error(data.error || "Failed to send");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Message Center</h1>
                <p className="text-gray-500 text-sm mt-1">Send SMS and email broadcasts to parents, students, and staff.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex border-b border-gray-200">
                    {(["compose", "history"] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3.5 text-sm font-medium capitalize ${activeTab === tab ? "text-primary-600 border-b-2 border-primary-600 bg-white" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            {tab === "compose" ? "Compose Message" : "Message History"}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {activeTab === "compose" ? (
                        <form onSubmit={handleSend} className="space-y-5">
                            {/* Channel */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(["SMS", "EMAIL"] as Channel[]).map(ch => (
                                        <button key={ch} type="button" onClick={() => { setChannel(ch); setResolvedRecipients([]); }}
                                            aria-pressed={channel === ch}
                                            className={`p-3 rounded-lg border-2 text-sm font-semibold transition-all ${channel === ch ? "border-primary-600 bg-primary-50 text-primary-700" : "border-gray-200 hover:border-gray-300 text-gray-600"}`}
                                        >
                                            {ch === "SMS" ? "📱 SMS" : "✉️ Email"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Recipients */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>
                                <div className="flex gap-4 mb-3">
                                    {(["manual", "group"] as RecipientMode[]).map(m => (
                                        <label key={m} className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)}
                                                className="text-primary-600 focus:ring-primary-500" />
                                            <span className="text-sm text-gray-700">{m === "manual" ? "Enter manually" : "Select group"}</span>
                                        </label>
                                    ))}
                                </div>

                                {mode === "manual" ? (
                                    <textarea
                                        value={manualRecipients}
                                        onChange={e => setManualRecipients(e.target.value)}
                                        aria-label={`Enter ${channel === "SMS" ? "phone numbers" : "email addresses"} separated by commas`}
                                        placeholder={channel === "SMS" ? "08012345678, 08087654321, ..." : "parent@school.com, staff@school.com, ..."}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 h-20 resize-none"
                                    />
                                ) : (
                                    <div className="space-y-3">
                                        <div className="flex gap-3 flex-wrap">
                                            {[
                                                { value: "all_parents", label: "All Parents" },
                                                { value: "all_students", label: "All Students" },
                                                { value: "all_teachers", label: "All Teachers" },
                                                { value: "class", label: "Specific Class" },
                                            ].map(opt => (
                                                <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                                                    <input type="radio" name="group" value={opt.value} checked={group === opt.value} onChange={() => { setGroup(opt.value); setResolvedRecipients([]); }}
                                                        className="text-primary-600 focus:ring-primary-500" />
                                                    <span className="text-sm text-gray-700">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {group === "class" && (
                                            <select value={selectedClassArmId} onChange={e => setSelectedClassArmId(e.target.value)}
                                                aria-label="Select class"
                                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-full focus:border-primary-500 focus:ring-primary-500">
                                                <option value="">— Select class —</option>
                                                {classArms.map(ca => <option key={ca.id} value={ca.id}>{ca.name}</option>)}
                                            </select>
                                        )}
                                        <button type="button"
                                            onClick={() => resolveGroup(group)}
                                            disabled={loadingRecipients || (group === "class" && !selectedClassArmId)}
                                            className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-40"
                                        >
                                            {loadingRecipients ? "Loading..." : resolvedRecipients.length ? `✓ ${resolvedRecipients.length} contacts loaded — Reload` : "Load contacts"}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Subject (email) */}
                            {channel === "EMAIL" && (
                                <div>
                                    <label htmlFor="msg-subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                                    <input id="msg-subject" type="text" value={subject} onChange={e => setSubject(e.target.value)}
                                        placeholder="E.g. End-of-Term Report Ready"
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                                    />
                                </div>
                            )}

                            {/* Message */}
                            <div>
                                <label htmlFor="msg-body" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                                <textarea id="msg-body" value={message} onChange={e => setMessage(e.target.value)}
                                    placeholder="Type your message here..."
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500 h-36 resize-none"
                                />
                                <p className="text-xs text-right text-gray-400 mt-1">
                                    {message.length} / 5000
                                    {channel === "SMS" && ` • ${Math.ceil(message.length / 160) || 1} SMS page(s)`}
                                </p>
                            </div>

                            <button type="submit" disabled={isSending}
                                className="w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50">
                                {isSending ? "Sending…" : `Send ${channel} Broadcast`}
                            </button>
                        </form>
                    ) : (
                        <div className="py-16 text-center text-gray-400">
                            <p className="text-sm">Message history will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
