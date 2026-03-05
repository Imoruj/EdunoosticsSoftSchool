"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import BehaviorSkillsSettings from "@/components/settings/BehaviorSkillsSettings";
import TermMappingSettings from "@/components/settings/TermMappingSettings";
import BroadsheetTermMappingSettings from "@/components/settings/BroadsheetTermMappingSettings";
import SuccessModal from "@/components/ui/SuccessModal";
import { GradingCategory, GradingPreset, getPresetLabel, getPresetOptionsForCategory, isPresetAllowedForCategory } from "@/lib/gradingPresets";

interface SchoolData {
    id: string;
    name: string;
    motto: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    logoUrl: string | null;
    principalSignatureUrl: string | null;
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("school");
    const [fixedHeaderHeight, setFixedHeaderHeight] = useState(0);
    const fixedHeaderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateFixedHeaderHeight = () => {
            if (fixedHeaderRef.current) {
                setFixedHeaderHeight(fixedHeaderRef.current.offsetHeight);
            }
        };

        updateFixedHeaderHeight();
        window.addEventListener("resize", updateFixedHeaderHeight);

        return () => {
            window.removeEventListener("resize", updateFixedHeaderHeight);
        };
    }, []);

    return (
        <div className="pb-10">
            {/* Fixed Header Container */}
            <div
                ref={fixedHeaderRef}
                className="fixed top-[var(--dashboard-topbar-height)] left-0 right-0 lg:left-64 z-20 bg-white border-b border-gray-200 shadow-sm px-4 lg:px-8 py-3"
            >
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-wrap gap-1.5">
                        {[
                            { id: "school", label: "School Profile" },
                            { id: "academic", label: "Academic Settings" },
                            { id: "grading", label: "Grading System" },
                            { id: "behavior", label: "Behavior & Skills" },
                            { id: "report-cards", label: "Report Card Templates", href: "/dashboard/settings/report-cards" },
                            { id: "broadsheet", label: "Broadsheet Templates", href: "/dashboard/settings/broadsheet" },
                            { id: "notifications", label: "Notifications" },
                            { id: "term-mapping", label: "Term Mapping" },
                            { id: "ai", label: "AI & Comments" },
                        ].map((tab) =>
                            tab.href ? (
                                <Link
                                    key={tab.id}
                                    href={tab.href}
                                    className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors bg-gray-100 text-gray-600 hover:bg-gray-200"
                                >
                                    {tab.label}
                                </Link>
                            ) : (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                        ? "bg-primary-600 text-white shadow-sm"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>


            <div
                aria-hidden="true"
                style={{ height: fixedHeaderHeight > 0 ? fixedHeaderHeight + 24 : 168 }}
            />

            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Tab Content */}
                {activeTab === "school" && <SchoolProfileSettings />}
                {activeTab === "academic" && <AcademicSettings />}
                {activeTab === "grading" && <GradingSettings />}
                {activeTab === "behavior" && <BehaviorSkillsSettings />}
                {activeTab === "notifications" && <NotificationSettings />}
                {activeTab === "term-mapping" && (
                    <div className="space-y-8">
                        <TermMappingSettings />
                        <BroadsheetTermMappingSettings />
                    </div>
                )}
                {activeTab === "ai" && <AISettingsContent />}
            </div>
        </div>
    );
}

function SchoolProfileSettings() {
    const [school, setSchool] = useState<SchoolData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
    const [signatureBase64, setSignatureBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchSchool();
    }, []);

    const fetchSchool = async () => {
        try {
            const response = await fetch("/api/school");
            if (response.ok) {
                const data = await response.json();
                setSchool(data);
            } else {
                setError("Failed to load school data");
            }
        } catch (err) {
            setError("Failed to load school data");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        setSuccess("");

        const formData = new FormData(e.currentTarget);

        try {
            const response = await fetch("/api/school", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.get("name"),
                    motto: formData.get("motto"),
                    address: formData.get("address"),
                    city: formData.get("city"),
                    state: formData.get("state"),
                    phone: formData.get("phone"),
                    email: formData.get("email"),
                    website: formData.get("website"),
                    logoUrl: logoBase64 || school?.logoUrl,
                    principalSignatureUrl: signatureBase64 || school?.principalSignatureUrl,
                }),
            });


            if (response.ok) {
                const data = await response.json();
                setSchool(data);

                // Dispatch event to update sidebar
                window.dispatchEvent(new Event("school-updated"));

                setShowSuccessModal(true);
            } else {
                const data = await response.json();
                setError(data.error || "Failed to save");
            }
        } catch (err) {
            setError("Failed to save school settings");
        } finally {
            setSaving(false);
        }
    };

    const handleLogoClick = () => {
        fileInputRef.current?.click();
    };

    const handleSignatureClick = () => {
        signatureInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature') => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (500KB)
            if (file.size > 500 * 1024) {
                setError("File size must be less than 500KB");
                return;
            }

            // Create local preview
            const previewUrl = URL.createObjectURL(file);
            if (type === 'logo') {
                setLogoPreview(previewUrl);
            } else {
                setSignaturePreview(previewUrl);
            }

            // Convert to base64 for saving to database
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                if (type === 'logo') {
                    setLogoBase64(base64);
                } else {
                    setSignatureBase64(base64);
                }
                setSuccess(`${type === 'logo' ? 'Logo' : 'Signature'} selected. Click 'Save Changes' to apply.`);
                setTimeout(() => setSuccess(""), 3000);
            };
            reader.readAsDataURL(file);
        }
    };

    if (loading) {
        return (
            <div className="card p-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="card p-6 space-y-6">
            {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
                    {success}
                </div>
            )}

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">School Information</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">School Name *</label>
                        <input
                            type="text"
                            name="name"
                            className="input w-full"
                            defaultValue={school?.name || ""}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">School Motto</label>
                        <input
                            type="text"
                            name="motto"
                            className="input w-full"
                            defaultValue={school?.motto || ""}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className="input w-full"
                            defaultValue={school?.email || ""}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input
                            type="tel"
                            name="phone"
                            className="input w-full"
                            defaultValue={school?.phone || ""}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <input
                            type="text"
                            name="address"
                            className="input w-full"
                            defaultValue={school?.address || ""}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                            type="text"
                            name="city"
                            className="input w-full"
                            defaultValue={school?.city || ""}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <select name="state" className="input w-full" defaultValue={school?.state || ""}>
                            <option value="">Select state</option>
                            <option value="Lagos">Lagos</option>
                            <option value="Abuja">FCT Abuja</option>
                            <option value="Kano">Kano</option>
                            <option value="Rivers">Rivers</option>
                            <option value="Oyo">Oyo</option>
                            <option value="Kaduna">Kaduna</option>
                            <option value="Enugu">Enugu</option>
                            <option value="Delta">Delta</option>
                            <option value="Anambra">Anambra</option>
                            <option value="Ogun">Ogun</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                        <input
                            type="url"
                            name="website"
                            className="input w-full"
                            defaultValue={school?.website || ""}
                            placeholder="https://www.yourschool.edu.ng"
                        />
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">School Logo</h3>
                <div className="flex items-start gap-6">
                    <div className="w-32 h-32 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden shrink-0">
                        {logoPreview ? (
                            <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                        ) : school?.logoUrl ? (
                            <img src={school.logoUrl} alt="School Logo" className="w-full h-full object-contain" />
                        ) : (
                            <div className="text-center">
                                <svg className="w-10 h-10 text-gray-300 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <p className="text-xs text-gray-400 mt-1">No logo</p>
                            </div>
                        )}
                    </div>
                    <div className="space-y-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => handleFileChange(e, 'logo')}
                            accept="image/png,image/jpeg"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={handleLogoClick}
                            className="btn-secondary"
                        >
                            {logoPreview || school?.logoUrl ? "Change Logo" : "Upload Logo"}
                        </button>
                        <p className="text-sm text-gray-500">PNG, JPG up to 500KB</p>
                        <p className="text-xs text-gray-400">Recommended: 256×256px square image</p>
                    </div>
                </div>
            </div>



            <div className="pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Head of School Signature</h3>
                <div className="flex items-start gap-6">
                    <div className="w-64 h-32 bg-gray-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden shrink-0">
                        {signaturePreview ? (
                            <img src={signaturePreview} alt="Signature Preview" className="w-full h-full object-contain" />
                        ) : school?.principalSignatureUrl ? (
                            <img src={school.principalSignatureUrl} alt="Signature" className="w-full h-full object-contain" />
                        ) : (
                            <div className="text-center">
                                <p className="text-xs text-gray-400 mt-1">No signature</p>
                            </div>
                        )}
                    </div>
                    <div className="space-y-3">
                        <input
                            type="file"
                            ref={signatureInputRef}
                            onChange={(e) => handleFileChange(e, 'signature')}
                            accept="image/png,image/jpeg"
                            className="hidden"
                        />
                        <button
                            type="button"
                            onClick={handleSignatureClick}
                            className="btn-secondary"
                        >
                            {signaturePreview || school?.principalSignatureUrl ? "Change Signature" : "Upload Signature"}
                        </button>
                        <p className="text-sm text-gray-500">PNG, JPG up to 500KB</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-200">
                <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Profile Updated!"
                message="Your school's profile information and branding have been saved successfully."
            />
        </form >
    );
}



function AcademicSettings() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>("");
    const [newSessionName, setNewSessionName] = useState("");
    const [currentTerm, setCurrentTerm] = useState("first");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Term Dates State
    const [termDates, setTermDates] = useState({
        first: { start: "", end: "" },
        second: { start: "", end: "" },
        third: { start: "", end: "" }
    });

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const response = await fetch("/api/sessions");
            if (response.ok) {
                const data = await response.json();
                setSessions(data.sessions);

                // Set default selected session (current or first)
                const current = data.sessions.find((s: any) => s.isCurrent);
                if (current) {
                    selectSession(current);
                } else if (data.sessions.length > 0) {
                    selectSession(data.sessions[0]);
                } else {
                    // Default for new session
                    setNewSessionName("2025/2026");
                }
            }
        } catch (err) {
            console.error("Failed to fetch sessions");
        } finally {
            setLoading(false);
        }
    };

    const selectSession = (session: any) => {
        setSelectedSessionId(session.id);
        setNewSessionName(session.name);

        // Find current term
        const currentTermObj = session.terms.find((t: any) => t.isCurrent);
        if (currentTermObj) {
            if (currentTermObj.termNumber === 1) setCurrentTerm("first");
            if (currentTermObj.termNumber === 2) setCurrentTerm("second");
            if (currentTermObj.termNumber === 3) setCurrentTerm("third");
        }

        // Set dates
        const newDates = {
            first: { start: "", end: "" },
            second: { start: "", end: "" },
            third: { start: "", end: "" }
        };

        session.terms.forEach((t: any) => {
            const start = t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : "";
            const end = t.endDate ? new Date(t.endDate).toISOString().split('T')[0] : "";

            if (t.termNumber === 1) newDates.first = { start, end };
            if (t.termNumber === 2) newDates.second = { start, end };
            if (t.termNumber === 3) newDates.third = { start, end };
        });

        setTermDates(newDates);
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const payload = {
                sessionId: selectedSessionId === "new" ? null : selectedSessionId,
                sessionName: newSessionName,
                currentTerm,
                terms: [
                    { name: "First Term", startDate: termDates.first.start, endDate: termDates.first.end },
                    { name: "Second Term", startDate: termDates.second.start, endDate: termDates.second.end },
                    { name: "Third Term", startDate: termDates.third.start, endDate: termDates.third.end }
                ]
            };

            const response = await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setShowSuccessModal(true);
                window.dispatchEvent(new Event("term-updated"));
                // Refresh list
                fetchSessions();
            } else {
                const data = await response.json();
                setError(data.error || "Failed to save");
            }
        } catch (err) {
            setError("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="card p-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="card p-6 space-y-6">
            {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm">
                    {success}
                </div>
            )}

            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Session</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Academic Session *</label>
                        <div className="flex gap-2">
                            <select
                                className="input w-full"
                                value={selectedSessionId}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "new") {
                                        setSelectedSessionId("new");
                                        setNewSessionName("");
                                        setTermDates({
                                            first: { start: "", end: "" },
                                            second: { start: "", end: "" },
                                            third: { start: "", end: "" }
                                        });
                                    } else {
                                        const s = sessions.find(s => s.id === val);
                                        if (s) selectSession(s);
                                    }
                                }}
                            >
                                {sessions.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} {s.isCurrent ? "(Current)" : ""}</option>
                                ))}
                                <option value="new">+ Create New Session</option>
                            </select>
                        </div>
                        {selectedSessionId === "new" && (
                            <input
                                type="text"
                                className="input w-full mt-2"
                                placeholder="e.g. 2026/2027"
                                value={newSessionName}
                                onChange={(e) => setNewSessionName(e.target.value)}
                            />
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Term *</label>
                        <select
                            className="input w-full"
                            value={currentTerm}
                            onChange={(e) => setCurrentTerm(e.target.value)}
                        >
                            <option value="first">First Term</option>
                            <option value="second">Second Term</option>
                            <option value="third">Third Term</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Term Dates</h3>
                <div className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Term</label>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                            <input
                                type="date"
                                className="input w-full"
                                value={termDates.first.start}
                                onChange={(e) => setTermDates({ ...termDates, first: { ...termDates.first, start: e.target.value } })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">End Date</label>
                            <input
                                type="date"
                                className="input w-full"
                                value={termDates.first.end}
                                onChange={(e) => setTermDates({ ...termDates, first: { ...termDates.first, end: e.target.value } })}
                            />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Second Term</label>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                            <input
                                type="date"
                                className="input w-full"
                                value={termDates.second.start}
                                onChange={(e) => setTermDates({ ...termDates, second: { ...termDates.second, start: e.target.value } })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">End Date</label>
                            <input
                                type="date"
                                className="input w-full"
                                value={termDates.second.end}
                                onChange={(e) => setTermDates({ ...termDates, second: { ...termDates.second, end: e.target.value } })}
                            />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Third Term</label>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                            <input
                                type="date"
                                className="input w-full"
                                value={termDates.third.start}
                                onChange={(e) => setTermDates({ ...termDates, third: { ...termDates.third, start: e.target.value } })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">End Date</label>
                            <input
                                type="date"
                                className="input w-full"
                                value={termDates.third.end}
                                onChange={(e) => setTermDates({ ...termDates, third: { ...termDates.third, end: e.target.value } })}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">School Days</h3>
                <div className="flex gap-2">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                        <label
                            key={day}
                            className="flex items-center justify-center w-12 h-12 rounded-lg border cursor-pointer hover:bg-gray-50"
                        >
                            <input type="checkbox" className="sr-only peer" defaultChecked={index < 5} />
                            <span className="text-sm font-medium text-gray-500 peer-checked:text-primary-600">
                                {day}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary"
                >
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Academic Settings Saved!"
                message="Session and term configurations have been updated for your school."
            />
        </div>
    );
}

interface GradingRuleRow {
    id: string;
    grade: string;
    minScore: number;
    maxScore: number;
    remark: string;
}

function GradingCategoryPanel({ category, categoryLabel }: { category: GradingCategory; categoryLabel: string }) {
    const [gradingRules, setGradingRules] = useState<GradingRuleRow[]>([]);
    const [newGrade, setNewGrade] = useState({ grade: "", minScore: "", maxScore: "", remark: "" });
    const [editingGrade, setEditingGrade] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    useEffect(() => {
        fetchRules();
    }, [category]);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/grading-rules?category=${category}`);
            if (res.ok) setGradingRules(await res.json());
        } catch { setError("Failed to load rules"); }
        finally { setLoading(false); }
    };

    const addGradingRule = async () => {
        if (!newGrade.grade || !newGrade.minScore || !newGrade.maxScore || !newGrade.remark) {
            setError("Please fill all grade fields"); return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/grading-rules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newGrade, schoolCategory: category }),
            });
            if (res.ok) {
                const data = await res.json();
                setGradingRules([...gradingRules, data].sort((a, b) => b.minScore - a.minScore));
                setNewGrade({ grade: "", minScore: "", maxScore: "", remark: "" });
                setSuccessMessage("Grading rule added.");
                setShowSuccessModal(true);
            } else {
                const err = await res.json();
                setError(err.error || "Failed to add");
            }
        } catch { setError("Failed to add grading rule"); }
        finally { setSaving(false); }
    };

    const updateGradingRule = async (id: string, data: any) => {
        setSaving(true);
        try {
            const res = await fetch("/api/grading-rules", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, ...data }),
            });
            if (res.ok) {
                const updated = await res.json();
                setGradingRules(gradingRules.map(g => g.id === id ? updated : g).sort((a, b) => b.minScore - a.minScore));
                setEditingGrade(null);
                setSuccessMessage("Grading rule updated.");
                setShowSuccessModal(true);
            }
        } catch { setError("Failed to update"); }
        finally { setSaving(false); }
    };

    const deleteGradingRule = async (id: string) => {
        try {
            const res = await fetch(`/api/grading-rules?id=${id}`, { method: "DELETE" });
            if (res.ok) setGradingRules(gradingRules.filter(g => g.id !== id));
        } catch { setError("Failed to delete"); }
    };

    const applyPreset = async (preset: GradingPreset, presetLabel?: string) => {
        if (!isPresetAllowedForCategory(preset, category)) {
            setError(`${getPresetLabel(preset)} preset is not available for ${categoryLabel}.`);
            return;
        }

        const label = presetLabel || getPresetLabel(preset);

        setSaving(true);
        setError("");

        try {
            const res = await fetch("/api/grading-rules/presets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ preset, category }),
            });

            if (res.ok) {
                const data = await res.json();
                const nextRules = Array.isArray(data.rules) ? data.rules : [];
                setGradingRules(nextRules.sort((a: GradingRuleRow, b: GradingRuleRow) => b.minScore - a.minScore));
                setSuccessMessage(`${label} preset loaded for ${categoryLabel}.`);
                setShowSuccessModal(true);
            } else {
                const err = await res.json();
                setError(err.error || "Failed to load preset");
            }
        } catch {
            setError("Failed to load preset");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
    );

    const presetOptions = getPresetOptionsForCategory(category);
    const getPresetButtonClass = (preset: GradingPreset) => {
        if (preset === "WAEC") return "border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100";
        return "border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100";
    };

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError("")} className="text-red-500">&times;</button>
                </div>
            )}

            <p className="text-sm text-gray-500">
                Configure the grading scale used for <strong>{categoryLabel}</strong> students. Leave empty to fall back to school-wide rules.
            </p>

            <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Preset Rules</span>
                {presetOptions.length === 0 && (
                    <span className="text-xs text-gray-500">No presets available for this category.</span>
                )}
                {presetOptions.map((option) => (
                    <button
                        key={option.preset}
                        type="button"
                        onClick={() => applyPreset(option.preset, option.label)}
                        disabled={saving || !isPresetAllowedForCategory(option.preset, category)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md border ${isPresetAllowedForCategory(option.preset, category)
                            ? getPresetButtonClass(option.preset)
                            : "border-gray-200 text-gray-400 bg-gray-100 cursor-not-allowed"
                            }`}
                    >
                        {`Load ${option.label}`}
                    </button>
                ))}
                <span className="text-xs text-gray-500">
                    Loading a preset replaces all rules in this category and saves immediately.
                </span>
            </div>

            {/* Existing Grading Rules Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min Score</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Max Score</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Remark</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {gradingRules.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-sm">
                                    No rules yet. Add rules below or leave empty to use school-wide rules.
                                </td>
                            </tr>
                        )}
                        {gradingRules.map((rule) => (
                            <tr key={rule.id}>
                                {editingGrade === rule.id ? (
                                    <>
                                        <td className="px-4 py-2"><input type="text" className="input w-16" defaultValue={rule.grade} id={`edit-grade-${rule.id}`} /></td>
                                        <td className="px-4 py-2"><input type="number" className="input w-20" defaultValue={rule.minScore} id={`edit-min-${rule.id}`} /></td>
                                        <td className="px-4 py-2"><input type="number" className="input w-20" defaultValue={rule.maxScore} id={`edit-max-${rule.id}`} /></td>
                                        <td className="px-4 py-2"><input type="text" className="input w-28" defaultValue={rule.remark} id={`edit-remark-${rule.id}`} /></td>
                                        <td className="px-4 py-2 space-x-2">
                                            <button
                                                onClick={() => updateGradingRule(rule.id, {
                                                    grade: (document.getElementById(`edit-grade-${rule.id}`) as HTMLInputElement).value,
                                                    minScore: (document.getElementById(`edit-min-${rule.id}`) as HTMLInputElement).value,
                                                    maxScore: (document.getElementById(`edit-max-${rule.id}`) as HTMLInputElement).value,
                                                    remark: (document.getElementById(`edit-remark-${rule.id}`) as HTMLInputElement).value,
                                                })}
                                                className="text-green-600 hover:text-green-800 text-sm"
                                            >Save</button>
                                            <button onClick={() => setEditingGrade(null)} className="text-gray-600 text-sm">Cancel</button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-4 py-2">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold grade-${rule.grade?.toLowerCase()}`}>
                                                {rule.grade}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-700">{rule.minScore}</td>
                                        <td className="px-4 py-2 text-gray-700">{rule.maxScore}</td>
                                        <td className="px-4 py-2 text-gray-700">{rule.remark}</td>
                                        <td className="px-4 py-2 space-x-2">
                                            <button onClick={() => setEditingGrade(rule.id)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                                            <button onClick={() => deleteGradingRule(rule.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add New Grading Rule */}
            <div className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-lg">
                <input type="text" placeholder="Grade (e.g., A1)" className="input w-24" value={newGrade.grade} onChange={(e) => setNewGrade({ ...newGrade, grade: e.target.value })} />
                <input type="number" placeholder="Min" className="input w-20" value={newGrade.minScore} onChange={(e) => setNewGrade({ ...newGrade, minScore: e.target.value })} />
                <input type="number" placeholder="Max" className="input w-20" value={newGrade.maxScore} onChange={(e) => setNewGrade({ ...newGrade, maxScore: e.target.value })} />
                <input type="text" placeholder="Remark (e.g., Excellent)" className="input flex-1" value={newGrade.remark} onChange={(e) => setNewGrade({ ...newGrade, remark: e.target.value })} />
                <button onClick={addGradingRule} disabled={saving} className="btn-primary text-sm px-4">+ Add</button>
            </div>

            <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="Grading Updated!" message={successMessage} />
        </div>
    );
}

function GradingSettings() {
    // Assessment Types State
    const [assessmentTypes, setAssessmentTypes] = useState<any[]>([]);
    const [newAssessment, setNewAssessment] = useState({ name: "", maxScore: "" });
    const [editingAssessment, setEditingAssessment] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    // Active grading category tab
    const [gradingTab, setGradingTab] = useState<"PRIMARY" | "JUNIOR_SECONDARY" | "SENIOR_SECONDARY">("PRIMARY");

    useEffect(() => { fetchAssessments(); }, []);

    const fetchAssessments = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/assessment-types");
            if (res.ok) setAssessmentTypes(await res.json());
        } catch { setError("Failed to load assessment types"); }
        finally { setLoading(false); }
    };

    const totalPoints = assessmentTypes.reduce((sum, a) => sum + (a.maxScore || 0), 0);

    const addAssessmentType = async () => {
        if (!newAssessment.name || !newAssessment.maxScore) { setError("Please enter name and max score"); return; }
        setSaving(true);
        try {
            const res = await fetch("/api/assessment-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newAssessment),
            });
            if (res.ok) {
                const data = await res.json();
                setAssessmentTypes([...assessmentTypes, data]);
                setNewAssessment({ name: "", maxScore: "" });
                setSuccessMessage("Score component added successfully.");
                setShowSuccessModal(true);
            } else {
                const err = await res.json();
                setError(err.error || "Failed to add");
            }
        } catch { setError("Failed to add assessment type"); }
        finally { setSaving(false); }
    };

    const updateAssessmentType = async (id: string, data: any) => {
        setSaving(true);
        try {
            const res = await fetch("/api/assessment-types", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, ...data }),
            });
            if (res.ok) {
                const updated = await res.json();
                setAssessmentTypes(assessmentTypes.map(a => a.id === id ? updated : a));
                setEditingAssessment(null);
                setSuccessMessage("Score component updated.");
                setShowSuccessModal(true);
            }
        } catch { setError("Failed to update"); }
        finally { setSaving(false); }
    };

    const deleteAssessmentType = async (id: string) => {
        try {
            const res = await fetch(`/api/assessment-types?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setAssessmentTypes(assessmentTypes.filter(a => a.id !== id));
                setSuccessMessage("Score component deleted.");
                setShowSuccessModal(true);
            }
        } catch { setError("Failed to delete"); }
    };

    if (loading) return (
        <div className="card p-6 flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
    );

    const gradingTabs = [
        { id: "PRIMARY" as const, label: "Primary" },
        { id: "JUNIOR_SECONDARY" as const, label: "Junior Secondary (JSS)" },
        { id: "SENIOR_SECONDARY" as const, label: "Senior Secondary (SSS)" },
    ];

    return (
        <div className="space-y-6">
            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError("")} className="text-red-500">&times;</button>
                </div>
            )}

            {/* Assessment Types Section (shared across all categories) */}
            <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Score Components</h3>
                    <span className="text-sm text-gray-500">
                        Total: <span className={`font-bold ${totalPoints === 100 ? 'text-green-600' : 'text-orange-500'}`}>{totalPoints}</span>/100 points
                    </span>
                </div>
                <div className="space-y-3 mb-4">
                    {assessmentTypes.map((assessment) => (
                        <div key={assessment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            {editingAssessment === assessment.id ? (
                                <>
                                    <input type="text" className="input flex-1" defaultValue={assessment.name} id={`edit-name-${assessment.id}`} />
                                    <input type="number" className="input w-24" defaultValue={assessment.maxScore} id={`edit-score-${assessment.id}`} />
                                    <button
                                        onClick={() => {
                                            const name = (document.getElementById(`edit-name-${assessment.id}`) as HTMLInputElement).value;
                                            const maxScore = (document.getElementById(`edit-score-${assessment.id}`) as HTMLInputElement).value;
                                            updateAssessmentType(assessment.id, { name, maxScore });
                                        }}
                                        className="btn-primary text-sm px-3 py-1"
                                    >Save</button>
                                    <button onClick={() => setEditingAssessment(null)} className="btn-secondary text-sm px-3 py-1">Cancel</button>
                                </>
                            ) : (
                                <>
                                    <span className="flex-1 font-medium">{assessment.name}</span>
                                    <span className="text-gray-600 w-24 text-center">{assessment.maxScore} pts</span>
                                    <button onClick={() => setEditingAssessment(assessment.id)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                                    <button onClick={() => deleteAssessmentType(assessment.id)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-lg">
                    <input type="text" placeholder="e.g., CA1, Exam, Project" className="input flex-1" value={newAssessment.name} onChange={(e) => setNewAssessment({ ...newAssessment, name: e.target.value })} />
                    <input type="number" placeholder="Max Score" className="input w-28" value={newAssessment.maxScore} onChange={(e) => setNewAssessment({ ...newAssessment, maxScore: e.target.value })} />
                    <button onClick={addAssessmentType} disabled={saving} className="btn-primary text-sm px-4">+ Add</button>
                </div>
            </div>

            {/* Grading Scale Section — 3 Category Tabs */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Grading Scale</h3>
                <p className="text-sm text-gray-500 mb-4">Set separate grading scales per school category. If a category has no rules, school-wide rules (if any) will be used as a fallback.</p>

                {/* Category Sub-tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-6">
                        {gradingTabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setGradingTab(tab.id)}
                                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${gradingTab === tab.id
                                    ? "border-primary-500 text-primary-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Panel for active tab */}
                <GradingCategoryPanel
                    key={gradingTab}
                    category={gradingTab}
                    categoryLabel={gradingTabs.find(t => t.id === gradingTab)!.label}
                />
            </div>

            <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="Settings Updated!" message={successMessage} />
        </div>
    );
}


function NotificationSettings() {
    return (
        <div className="card p-6 space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">SMS Settings</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SMS Provider</label>
                        <select className="input w-full" defaultValue="termii">
                            <option value="termii">Termii</option>
                            <option value="africastalking">Africa&apos;s Talking</option>
                            <option value="twilio">Twilio</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sender ID</label>
                        <input type="text" className="input w-full" defaultValue="Edunostics" maxLength={11} />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                        <input type="password" className="input w-full" placeholder="Enter your SMS API key" />
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Triggers</h3>
                <div className="space-y-4">
                    {[
                        { id: "report_published", label: "Report Card Published", desc: "Notify parents when report cards are published" },
                        { id: "fee_reminder", label: "Fee Payment Reminder", desc: "Send reminders for pending school fees" },
                        { id: "attendance", label: "Attendance Alerts", desc: "Alert parents when student is absent" },
                        { id: "exam_schedule", label: "Exam Schedules", desc: "Notify about upcoming examinations" },
                    ].map((item) => (
                        <div key={item.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-900">{item.label}</p>
                                <p className="text-sm text-gray-500">{item.desc}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" defaultChecked />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200">
                <button className="btn-primary">Save Changes</button>
            </div>
        </div>
    );
}

function AISettingsContent() {
    const [settings, setSettings] = useState({
        teacherPrompt: "",
        principalPrompt: ""
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/settings/ai");
            if (res.ok) {
                const data = await res.json();
                setSettings({
                    teacherPrompt: data.teacherPrompt,
                    principalPrompt: data.principalPrompt
                });
            }
        } catch (err) {
            setError("Failed to load AI settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            const res = await fetch("/api/settings/ai", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                setShowSuccessModal(true);
            } else {
                setError("Failed to save settings");
            }
        } catch (err) {
            setError("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="card p-6 flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Comment Generation</h3>
                <p className="text-sm text-gray-500 mb-6">
                    Configure the criteria (prompts) used by the AI to generate student report card comments.
                    Use placeholders like <code className="bg-gray-100 px-1 rounded">{"{{name}}"}</code>,
                    <code className="bg-gray-100 px-1 rounded">{"{{average}}"}</code>,
                    <code className="bg-gray-100 px-1 rounded">{"{{position}}"}</code>, etc.
                </p>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Class Teacher&apos;s Comment Criteria
                        </label>
                        <textarea
                            className="input w-full h-32"
                            value={settings.teacherPrompt}
                            onChange={(e) => setSettings({ ...settings, teacherPrompt: e.target.value })}
                            placeholder="Describe how the teacher's comment should be generated..."
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Available placeholders: {"{{name}}, {{gender}}, {{term}}, {{average}}, {{position}}, {{attendance}}, {{traits}}"}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Principal&apos;s Closing Remark Criteria
                        </label>
                        <textarea
                            className="input w-full h-32"
                            value={settings.principalPrompt}
                            onChange={(e) => setSettings({ ...settings, principalPrompt: e.target.value })}
                            placeholder="Describe how the principal's remark should be generated..."
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Available placeholders: {"{{name}}, {{average}}, {{position}}, {{attendance}}"}
                        </p>
                    </div>
                </div>

                {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
                {success && <p className="text-green-600 text-sm mt-4">{success}</p>}

                <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary"
                    >
                        {saving ? "Saving..." : "Save AI Settings"}
                    </button>
                </div>
            </div>

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="AI Settings Updated!"
                message="Your custom AI comment generation criteria have been saved successfully."
            />
        </div>
    );
}
