"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import BehaviorSkillsSettings from "@/components/settings/BehaviorSkillsSettings";
import TermMappingSettings from "@/components/settings/TermMappingSettings";
import BroadsheetTermMappingSettings from "@/components/settings/BroadsheetTermMappingSettings";
import AICommentSettings from "@/components/settings/AICommentSettings";
import SuccessModal from "@/components/ui/SuccessModal";
import { GradingCategory, GradingPreset, getPresetLabel, getPresetOptionsForCategory, isPresetAllowedForCategory } from "@/lib/gradingPresets";
import { getAssessmentTypeSummary, MAX_CLASS_SPECIFIC_ASSESSMENT_TYPES, MAX_CONTINUOUS_ASSESSMENT_TYPES } from "@/lib/assessment-types";
import { handleUnauthorizedApiResponse, readApiError } from "@/lib/client-session";

type TermKey = "first" | "second" | "third";

interface TermDateConfig {
    start: string;
    end: string;
    weeks: string;
    manualWeeks: boolean;
}

type TermDatesState = Record<TermKey, TermDateConfig>;

const TERM_KEYS: TermKey[] = ["first", "second", "third"];
const TERM_LABELS: Record<TermKey, string> = {
    first: "First Term",
    second: "Second Term",
    third: "Third Term",
};

function createEmptyTermDates(): TermDatesState {
    return {
        first: { start: "", end: "", weeks: "", manualWeeks: false },
        second: { start: "", end: "", weeks: "", manualWeeks: false },
        third: { start: "", end: "", weeks: "", manualWeeks: false },
    };
}

function parseDateInput(value: string) {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(Date.UTC(year, month - 1, day));
}

function calculateTermWeeks(start: string, end: string) {
    const startDate = parseDateInput(start);
    const endDate = parseDateInput(end);
    if (!startDate || !endDate) return "";

    const diffMs = endDate.getTime() - startDate.getTime();
    if (diffMs < 0) return "";

    const diffDays = Math.floor(diffMs / 86400000) + 1;
    return String(Math.max(1, Math.ceil(diffDays / 7)));
}

function createTermDateConfig(start = "", end = "", totalWeeks?: number | null): TermDateConfig {
    const autoWeeks = calculateTermWeeks(start, end);
    const storedWeeks = typeof totalWeeks === "number" && totalWeeks > 0 ? String(totalWeeks) : "";
    return {
        start,
        end,
        weeks: storedWeeks || autoWeeks,
        manualWeeks: !!storedWeeks && storedWeeks !== autoWeeks,
    };
}

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
    allowStudentAdmissionNumberLogin: boolean;
    allowStudentEmailLogin: boolean;
}

interface AssessmentTypeConfig {
    id: string;
    name: string;
    maxScore: number;
    order: number;
    shortName?: string | null;
    includeInTotal?: boolean;
}

interface AssessmentTypeDraft {
    name: string;
    maxScore: string;
    includeInTotal: boolean;
}

interface ClassOverrideEditorState {
    overrides: AssessmentTypeConfig[];
    loaded: boolean;
    loading: boolean;
    editingId: string | null;
    newItem: AssessmentTypeDraft;
    saving: boolean;
    error: string;
}

interface ClassOverrideOption {
    id: string;
    name: string;
}

interface ClassOverrideLoadResult {
    classId: string;
    overrides: AssessmentTypeConfig[];
    error: string;
}

function createEmptyAssessmentTypeDraft(): AssessmentTypeDraft {
    return { name: "", maxScore: "", includeInTotal: true };
}

function createEmptyClassOverrideEditorState(): ClassOverrideEditorState {
    return {
        overrides: [],
        loaded: false,
        loading: false,
        editingId: null,
        newItem: createEmptyAssessmentTypeDraft(),
        saving: false,
        error: "",
    };
}

function sortAssessmentTypes(types: AssessmentTypeConfig[]) {
    return [...types].sort((left, right) => {
        const orderDiff = left.order - right.order;
        if (orderDiff !== 0) return orderDiff;
        return left.name.localeCompare(right.name);
    });
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
                            { id: "role-access", label: "Role Access", href: "/dashboard/settings/roles" },
                            { id: "report-cards", label: "Report Card Templates", href: "/dashboard/settings/report-cards" },
                            { id: "broadsheet", label: "Broadsheet Templates", href: "/dashboard/settings/broadsheet" },
                            { id: "notifications", label: "Notifications" },
                            { id: "term-mapping", label: "Term Mapping" },
                            { id: "ai", label: "Comment Settings" },
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
    const [allowStudentAdmissionNumberLogin, setAllowStudentAdmissionNumberLogin] = useState(true);
    const [allowStudentEmailLogin, setAllowStudentEmailLogin] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const signatureInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchSchool();
    }, []);

    const fetchSchool = async () => {
        try {
            const response = await fetch("/api/school", { cache: "no-store" });
            if (await handleUnauthorizedApiResponse(response)) {
                return;
            }
            if (response.ok) {
                const data = await response.json();
                setSchool(data);
                setAllowStudentAdmissionNumberLogin(data.allowStudentAdmissionNumberLogin ?? true);
                setAllowStudentEmailLogin(data.allowStudentEmailLogin ?? true);
            } else {
                setError(await readApiError(response, "Failed to load school data"));
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

        if (!allowStudentAdmissionNumberLogin && !allowStudentEmailLogin) {
            setError("Enable at least one student login method.");
            setSaving(false);
            return;
        }

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
                    allowStudentAdmissionNumberLogin,
                    allowStudentEmailLogin,
                }),
            });

            if (await handleUnauthorizedApiResponse(response)) {
                return;
            }

            if (response.ok) {
                const data = await response.json();
                setSchool(data);
                setAllowStudentAdmissionNumberLogin(data.allowStudentAdmissionNumberLogin ?? true);
                setAllowStudentEmailLogin(data.allowStudentEmailLogin ?? true);

                // Dispatch event to update sidebar
                window.dispatchEvent(new Event("school-updated"));
                window.dispatchEvent(new CustomEvent("student-login-modes-updated", {
                    detail: {
                        allowStudentAdmissionNumberLogin: data.allowStudentAdmissionNumberLogin ?? true,
                        allowStudentEmailLogin: data.allowStudentEmailLogin ?? true,
                    },
                }));

                setShowSuccessModal(true);
            } else {
                setError(await readApiError(response, "Failed to save"));
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
                <div className="flex items-start justify-between gap-6 mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Student Login Settings</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Control whether students sign in with admission number, email address, or both.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4">
                        <div className="pr-4">
                            <p className="text-sm font-semibold text-gray-900">Admission number login</p>
                            <p className="mt-1 text-sm text-gray-500">
                                Students can sign in with their admission number.
                            </p>
                        </div>
                        <span className="relative inline-flex shrink-0 items-center">
                            <input
                                type="checkbox"
                                name="allowStudentAdmissionNumberLogin"
                                checked={allowStudentAdmissionNumberLogin}
                                onChange={(e) => setAllowStudentAdmissionNumberLogin(e.target.checked)}
                                className="peer sr-only"
                            />
                            <span className="h-6 w-11 rounded-full bg-gray-200 transition peer-checked:bg-primary-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></span>
                        </span>
                    </label>

                    <label className="flex items-start justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-4 py-4">
                        <div className="pr-4">
                            <p className="text-sm font-semibold text-gray-900">Email login</p>
                            <p className="mt-1 text-sm text-gray-500">
                                Students can sign in with the generated school email address.
                            </p>
                        </div>
                        <span className="relative inline-flex shrink-0 items-center">
                            <input
                                type="checkbox"
                                name="allowStudentEmailLogin"
                                checked={allowStudentEmailLogin}
                                onChange={(e) => setAllowStudentEmailLogin(e.target.checked)}
                                className="peer sr-only"
                            />
                            <span className="h-6 w-11 rounded-full bg-gray-200 transition peer-checked:bg-primary-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white"></span>
                        </span>
                    </label>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                    At least one student login method must remain enabled.
                </p>
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
    const [termDates, setTermDates] = useState<TermDatesState>(createEmptyTermDates());

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
        const newDates = createEmptyTermDates();

        session.terms.forEach((t: any) => {
            const start = t.startDate ? new Date(t.startDate).toISOString().split('T')[0] : "";
            const end = t.endDate ? new Date(t.endDate).toISOString().split('T')[0] : "";

            if (t.termNumber === 1) newDates.first = createTermDateConfig(start, end, t.totalWeeks);
            if (t.termNumber === 2) newDates.second = createTermDateConfig(start, end, t.totalWeeks);
            if (t.termNumber === 3) newDates.third = createTermDateConfig(start, end, t.totalWeeks);
        });

        setTermDates(newDates);
    };

    const handleTermDateChange = (termKey: TermKey, field: "start" | "end", value: string) => {
        setTermDates((prev) => {
            const currentTerm = prev[termKey];
            const nextTerm = { ...currentTerm, [field]: value };
            const autoWeeks = calculateTermWeeks(nextTerm.start, nextTerm.end);

            if (!currentTerm.manualWeeks || !currentTerm.weeks) {
                nextTerm.weeks = autoWeeks;
            }

            return { ...prev, [termKey]: nextTerm };
        });
    };

    const handleTermWeeksChange = (termKey: TermKey, value: string) => {
        const sanitized = value.replace(/[^\d]/g, "");
        setTermDates((prev) => {
            const currentTerm = prev[termKey];
            const autoWeeks = calculateTermWeeks(currentTerm.start, currentTerm.end);

            return {
                ...prev,
                [termKey]: {
                    ...currentTerm,
                    weeks: sanitized,
                    manualWeeks: sanitized !== "" && sanitized !== autoWeeks,
                },
            };
        });
    };

    const resetTermWeeksToAuto = (termKey: TermKey) => {
        setTermDates((prev) => {
            const currentTerm = prev[termKey];
            return {
                ...prev,
                [termKey]: {
                    ...currentTerm,
                    weeks: calculateTermWeeks(currentTerm.start, currentTerm.end),
                    manualWeeks: false,
                },
            };
        });
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
                    {
                        name: "First Term",
                        startDate: termDates.first.start,
                        endDate: termDates.first.end,
                        totalWeeks: termDates.first.weeks ? Number(termDates.first.weeks) : null,
                    },
                    {
                        name: "Second Term",
                        startDate: termDates.second.start,
                        endDate: termDates.second.end,
                        totalWeeks: termDates.second.weeks ? Number(termDates.second.weeks) : null,
                    },
                    {
                        name: "Third Term",
                        startDate: termDates.third.start,
                        endDate: termDates.third.end,
                        totalWeeks: termDates.third.weeks ? Number(termDates.third.weeks) : null,
                    }
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
                                        setTermDates(createEmptyTermDates());
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
                    {TERM_KEYS.map((termKey) => {
                        const term = termDates[termKey];
                        const autoWeeks = calculateTermWeeks(term.start, term.end);

                        return (
                            <div key={termKey} className="grid md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{TERM_LABELS[termKey]}</label>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        className="input w-full"
                                        value={term.start}
                                        onChange={(e) => handleTermDateChange(termKey, "start", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        className="input w-full"
                                        value={term.end}
                                        onChange={(e) => handleTermDateChange(termKey, "end", e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Number of Weeks</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="input w-full"
                                        value={term.weeks}
                                        onChange={(e) => handleTermWeeksChange(termKey, e.target.value)}
                                        placeholder="Auto"
                                    />
                                    <div className="mt-1 min-h-[20px] flex items-center gap-2 text-xs">
                                        {autoWeeks ? (
                                            term.manualWeeks ? (
                                                <>
                                                    <span className="text-amber-600">Auto: {autoWeeks} week{autoWeeks === "1" ? "" : "s"}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => resetTermWeeksToAuto(termKey)}
                                                        className="text-primary-600 hover:text-primary-700 font-medium"
                                                    >
                                                        Use auto
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-green-600">Auto-filled from selected dates</span>
                                            )
                                        ) : (
                                            <span className="text-gray-400">Set valid start and end dates to auto-calculate.</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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

function AISettingsContent() {
    return <AICommentSettings />;
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
                                        <td className="px-4 py-2"><input type="number" step="0.1" className="input w-20" defaultValue={rule.minScore} id={`edit-min-${rule.id}`} /></td>
                                        <td className="px-4 py-2"><input type="number" step="0.1" className="input w-20" defaultValue={rule.maxScore} id={`edit-max-${rule.id}`} /></td>
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
                <input type="number" step="0.1" placeholder="Min" className="input w-20" value={newGrade.minScore} onChange={(e) => setNewGrade({ ...newGrade, minScore: e.target.value })} />
                <input type="number" step="0.1" placeholder="Max" className="input w-20" value={newGrade.maxScore} onChange={(e) => setNewGrade({ ...newGrade, maxScore: e.target.value })} />
                <input type="text" placeholder="Remark (e.g., Excellent)" className="input flex-1" value={newGrade.remark} onChange={(e) => setNewGrade({ ...newGrade, remark: e.target.value })} />
                <button onClick={addGradingRule} disabled={saving} className="btn-primary text-sm px-4">+ Add</button>
            </div>

            <SuccessModal isOpen={showSuccessModal} onClose={() => setShowSuccessModal(false)} title="Grading Updated!" message={successMessage} />
        </div>
    );
}

function ClassAssessmentOverrides({ defaultTypes }: { defaultTypes: AssessmentTypeConfig[] }) {
    const [classes, setClasses] = useState<ClassOverrideOption[]>([]);
    const [classStates, setClassStates] = useState<Record<string, ClassOverrideEditorState>>({});
    const [expandedClassIds, setExpandedClassIds] = useState<string[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        const fetchClassesAndOverrides = async () => {
            setLoadingClasses(true);
            setError("");

            try {
                const response = await fetch("/api/classes");
                if (await handleUnauthorizedApiResponse(response)) {
                    return;
                }

                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload.error || "Failed to load classes.");
                }

                const nextClasses: ClassOverrideOption[] = Array.isArray(payload.classes)
                    ? payload.classes.map((item: any) => ({ id: item.id, name: item.name }))
                    : [];

                if (!isMounted) return;

                setClasses(nextClasses);

                if (nextClasses.length === 0) {
                    setClassStates({});
                    setExpandedClassIds([]);
                    return;
                }

                const overrideResults: ClassOverrideLoadResult[] = await Promise.all(
                    nextClasses.map(async (classItem) => {
                        try {
                            const classResponse = await fetch(`/api/class-assessment-types?classId=${classItem.id}`);
                            if (await handleUnauthorizedApiResponse(classResponse)) {
                                return {
                                    classId: classItem.id,
                                    overrides: [] as AssessmentTypeConfig[],
                                    error: "",
                                };
                            }

                            const classPayload = await classResponse.json().catch(() => ([]));
                            if (!classResponse.ok) {
                                throw new Error(
                                    (classPayload && classPayload.error) || `Failed to load overrides for ${classItem.name}.`
                                );
                            }

                            return {
                                classId: classItem.id,
                                overrides: sortAssessmentTypes(Array.isArray(classPayload) ? classPayload : []),
                                error: "",
                            };
                        } catch (classError: any) {
                            return {
                                classId: classItem.id,
                                overrides: [] as AssessmentTypeConfig[],
                                error: classError.message || `Failed to load overrides for ${classItem.name}.`,
                            };
                        }
                    })
                );

                if (!isMounted) return;

                const nextStates = nextClasses.reduce((accumulator: Record<string, ClassOverrideEditorState>, classItem: ClassOverrideOption) => {
                    const match = overrideResults.find((result) => result.classId === classItem.id);
                    accumulator[classItem.id] = {
                        ...createEmptyClassOverrideEditorState(),
                        overrides: match?.overrides ?? [],
                        loaded: true,
                        error: match?.error ?? "",
                    };
                    return accumulator;
                }, {});

                setClassStates(nextStates);
                setExpandedClassIds(
                    overrideResults
                        .filter((result) => result.overrides.length > 0)
                        .map((result) => result.classId)
                );
            } catch (fetchError: any) {
                if (isMounted) {
                    setClasses([]);
                    setClassStates({});
                    setExpandedClassIds([]);
                    setError(fetchError.message || "Failed to load classes.");
                }
            } finally {
                if (isMounted) {
                    setLoadingClasses(false);
                }
            }
        };

        fetchClassesAndOverrides();

        return () => {
            isMounted = false;
        };
    }, []);

    const defaultSummary = getAssessmentTypeSummary(defaultTypes);

    const updateClassState = (
        classId: string,
        updater: (current: ClassOverrideEditorState) => ClassOverrideEditorState
    ) => {
        setClassStates((current) => {
            const existing = current[classId] ?? createEmptyClassOverrideEditorState();
            return {
                ...current,
                [classId]: updater(existing),
            };
        });
    };

    const toggleClassCard = (classId: string) => {
        setExpandedClassIds((current) =>
            current.includes(classId)
                ? current.filter((item) => item !== classId)
                : [...current, classId]
        );
    };

    const addOverride = async (classId: string) => {
        const currentState = classStates[classId] ?? createEmptyClassOverrideEditorState();
        if (!currentState.newItem.name || !currentState.newItem.maxScore) {
            updateClassState(classId, (state) => ({ ...state, error: "Enter name and max score" }));
            return;
        }

        updateClassState(classId, (state) => ({ ...state, saving: true, error: "" }));
        try {
            const res = await fetch("/api/class-assessment-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ classId, ...currentState.newItem }),
            });
            if (await handleUnauthorizedApiResponse(res)) {
                return;
            }
            if (res.ok) {
                const created = await res.json();
                updateClassState(classId, (state) => ({
                    ...state,
                    overrides: sortAssessmentTypes([...state.overrides, created]),
                    newItem: createEmptyAssessmentTypeDraft(),
                }));
                setExpandedClassIds((current) => (current.includes(classId) ? current : [...current, classId]));
            } else {
                const nextError = await readApiError(res, "Failed to add");
                updateClassState(classId, (state) => ({ ...state, error: nextError }));
            }
        } catch {
            updateClassState(classId, (state) => ({ ...state, error: "Failed to add" }));
        } finally {
            updateClassState(classId, (state) => ({ ...state, saving: false }));
        }
    };

    const updateOverride = async (classId: string, id: string, name: string, maxScore: string, includeInTotal: boolean) => {
        updateClassState(classId, (state) => ({ ...state, saving: true, error: "" }));
        try {
            const res = await fetch("/api/class-assessment-types", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, name, maxScore, includeInTotal }),
            });
            if (await handleUnauthorizedApiResponse(res)) {
                return;
            }
            if (res.ok) {
                const updated = await res.json();
                updateClassState(classId, (state) => ({
                    ...state,
                    overrides: sortAssessmentTypes(state.overrides.map((item) => (item.id === id ? updated : item))),
                    editingId: null,
                }));
            } else {
                const nextError = await readApiError(res, "Failed to update");
                updateClassState(classId, (state) => ({ ...state, error: nextError }));
            }
        } catch {
            updateClassState(classId, (state) => ({ ...state, error: "Failed to update" }));
        } finally {
            updateClassState(classId, (state) => ({ ...state, saving: false }));
        }
    };

    const deleteOverride = async (classId: string, id: string) => {
        try {
            const res = await fetch(`/api/class-assessment-types?id=${id}`, { method: "DELETE" });
            if (await handleUnauthorizedApiResponse(res)) {
                return;
            }
            if (res.ok) {
                updateClassState(classId, (state) => ({
                    ...state,
                    overrides: state.overrides.filter((item) => item.id !== id),
                }));
            } else {
                const nextError = await readApiError(res, "Failed to delete");
                updateClassState(classId, (state) => ({ ...state, error: nextError }));
            }
        } catch {
            updateClassState(classId, (state) => ({ ...state, error: "Failed to delete" }));
        }
    };

    const resetToDefaults = async (classId: string) => {
        if (!confirm("Remove all overrides for this class and revert to school defaults?")) return;
        try {
            const res = await fetch(`/api/class-assessment-types?classId=${classId}&all=true`, { method: "DELETE" });
            if (await handleUnauthorizedApiResponse(res)) {
                return;
            }
            if (res.ok) {
                updateClassState(classId, (state) => ({
                    ...state,
                    overrides: [],
                    editingId: null,
                    newItem: createEmptyAssessmentTypeDraft(),
                    error: "",
                }));
            } else {
                const nextError = await readApiError(res, "Failed to reset");
                updateClassState(classId, (state) => ({ ...state, error: nextError }));
            }
        } catch {
            updateClassState(classId, (state) => ({ ...state, error: "Failed to reset" }));
        }
    };

    return (
        <div className="space-y-4">
            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError("")} className="text-red-500 text-lg leading-none">&times;</button>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                    Manage overrides for as many classes as needed. Each class keeps its own score-component setup.
                </p>
                {classes.length > 1 && (
                    <div className="flex items-center gap-3 text-sm">
                        <button
                            onClick={() => setExpandedClassIds(classes.map((classItem) => classItem.id))}
                            className="text-blue-600 hover:text-blue-800"
                        >
                            Expand all
                        </button>
                        <button
                            onClick={() => setExpandedClassIds([])}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            Collapse all
                        </button>
                    </div>
                )}
            </div>

            <p className="text-xs text-gray-500">
                Each class can use up to {MAX_CLASS_SPECIFIC_ASSESSMENT_TYPES} score components total:
                {" "}up to {MAX_CONTINUOUS_ASSESSMENT_TYPES} CA components and 1 exam.
            </p>

            {loadingClasses ? (
                <p className="text-sm text-gray-400">Loading classes...</p>
            ) : classes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    No classes are available yet.
                </div>
            ) : (
                <div className="space-y-3">
                    {classes.map((classItem) => {
                        const state = classStates[classItem.id] ?? createEmptyClassOverrideEditorState();
                        const hasOverrides = state.overrides.length > 0;
                        const isExpanded = expandedClassIds.includes(classItem.id);
                        const summary = getAssessmentTypeSummary(hasOverrides ? state.overrides : defaultTypes);

                        return (
                            <div key={classItem.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                                <button
                                    type="button"
                                    onClick={() => toggleClassCard(classItem.id)}
                                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-gray-50"
                                >
                                    <div>
                                        <div className="text-base font-semibold text-gray-900">{classItem.name}</div>
                                        <div className="text-sm text-gray-500">
                                            {hasOverrides
                                                ? `${state.overrides.length} class-specific component${state.overrides.length === 1 ? "" : "s"} configured`
                                                : "Using school defaults"}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right text-sm text-gray-500">
                                            <div>
                                                Counted total:{" "}
                                                <span className={`font-bold ${summary.countedMaxScore === 100 ? "text-green-600" : "text-orange-500"}`}>
                                                    {summary.countedMaxScore}
                                                </span>
                                                /100 pts
                                            </div>
                                            {summary.excludedMaxScore > 0 && (
                                                <div className="text-xs text-gray-500">Recorded only: {summary.excludedMaxScore} pts</div>
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-blue-600">{isExpanded ? "Hide" : "Manage"}</span>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="border-t border-gray-200 px-4 py-4">
                                        {state.error && (
                                            <div className="mb-3 flex items-center justify-between rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
                                                <span>{state.error}</span>
                                                <button
                                                    onClick={() => updateClassState(classItem.id, (current) => ({ ...current, error: "" }))}
                                                    className="text-red-500 text-lg leading-none"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        )}

                                        {!hasOverrides ? (
                                            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                                                Using school defaults:&nbsp;
                                                {defaultTypes.length > 0
                                                    ? defaultTypes.map((item) => `${item.name} (${item.maxScore} pts)`).join(" · ")
                                                    : "none configured"}
                                                {defaultTypes.length > 0 && (
                                                    <div className="mt-2 text-xs text-gray-500">
                                                        Counted total:{" "}
                                                        <span className={`font-semibold ${defaultSummary.countedMaxScore === 100 ? "text-green-600" : "text-orange-500"}`}>
                                                            {defaultSummary.countedMaxScore}
                                                        </span>
                                                        /100 pts
                                                        {defaultSummary.excludedMaxScore > 0 && (
                                                            <span className="ml-3">Recorded only: {defaultSummary.excludedMaxScore} pts</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="mb-3 space-y-2">
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Class overrides</span>
                                                    <button
                                                        onClick={() => resetToDefaults(classItem.id)}
                                                        className="text-sm text-red-500 hover:text-red-700 underline"
                                                    >
                                                        Reset to school defaults
                                                    </button>
                                                </div>
                                                {state.overrides.map((item) => (
                                                    <div key={item.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                                                        {state.editingId === item.id ? (
                                                            <>
                                                                <input type="text" className="input flex-1" defaultValue={item.name} id={`co-name-${classItem.id}-${item.id}`} />
                                                                <input type="number" className="input w-24" defaultValue={item.maxScore} id={`co-score-${classItem.id}-${item.id}`} />
                                                                <label className="flex items-center gap-2 whitespace-nowrap text-sm text-gray-600">
                                                                    <input type="checkbox" defaultChecked={item.includeInTotal !== false} id={`co-include-${classItem.id}-${item.id}`} />
                                                                    Count in total
                                                                </label>
                                                                <button
                                                                    disabled={state.saving}
                                                                    onClick={() => {
                                                                        const name = (document.getElementById(`co-name-${classItem.id}-${item.id}`) as HTMLInputElement).value;
                                                                        const maxScore = (document.getElementById(`co-score-${classItem.id}-${item.id}`) as HTMLInputElement).value;
                                                                        const includeInTotal = (document.getElementById(`co-include-${classItem.id}-${item.id}`) as HTMLInputElement).checked;
                                                                        updateOverride(classItem.id, item.id, name, maxScore, includeInTotal);
                                                                    }}
                                                                    className="btn-primary px-3 py-1 text-sm"
                                                                >
                                                                    Save
                                                                </button>
                                                                <button
                                                                    onClick={() => updateClassState(classItem.id, (current) => ({ ...current, editingId: null }))}
                                                                    className="btn-secondary px-3 py-1 text-sm"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="font-medium">{item.name}</div>
                                                                    {item.includeInTotal === false && (
                                                                        <div className="text-xs text-amber-700">Recorded only, excluded from end-of-term total</div>
                                                                    )}
                                                                </div>
                                                                <span className="w-24 text-center text-gray-600">{item.maxScore} pts</span>
                                                                <button
                                                                    onClick={() => updateClassState(classItem.id, (current) => ({ ...current, editingId: item.id }))}
                                                                    className="text-sm text-blue-600 hover:text-blue-800"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteOverride(classItem.id, item.id)}
                                                                    className="text-sm text-red-600 hover:text-red-800"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-2 flex items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-3">
                                            <input
                                                type="text"
                                                placeholder="e.g., CA1, Exam, Project"
                                                className="input flex-1"
                                                value={state.newItem.name}
                                                onChange={(e) =>
                                                    updateClassState(classItem.id, (current) => ({
                                                        ...current,
                                                        newItem: { ...current.newItem, name: e.target.value },
                                                    }))
                                                }
                                            />
                                            <input
                                                type="number"
                                                placeholder="Max Score"
                                                className="input w-28"
                                                value={state.newItem.maxScore}
                                                onChange={(e) =>
                                                    updateClassState(classItem.id, (current) => ({
                                                        ...current,
                                                        newItem: { ...current.newItem, maxScore: e.target.value },
                                                    }))
                                                }
                                            />
                                            <label className="flex items-center gap-2 whitespace-nowrap text-sm text-gray-600">
                                                <input
                                                    type="checkbox"
                                                    checked={state.newItem.includeInTotal}
                                                    onChange={(e) =>
                                                        updateClassState(classItem.id, (current) => ({
                                                            ...current,
                                                            newItem: { ...current.newItem, includeInTotal: e.target.checked },
                                                        }))
                                                    }
                                                />
                                                Count in total
                                            </label>
                                            <button
                                                onClick={() => addOverride(classItem.id)}
                                                disabled={state.saving}
                                                className="btn-primary px-4 text-sm"
                                            >
                                                + Add
                                            </button>
                                        </div>
                                        <p className="mt-2 text-xs text-gray-500">
                                            Components that are not counted still appear during score entry, but they do not affect end-of-term totals or grades.
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function GradingSettings() {
    // Assessment Types State
    const [assessmentTypes, setAssessmentTypes] = useState<AssessmentTypeConfig[]>([]);
    const [newAssessment, setNewAssessment] = useState<AssessmentTypeDraft>({ name: "", maxScore: "", includeInTotal: true });
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
            if (await handleUnauthorizedApiResponse(res)) {
                return;
            }
            if (res.ok) setAssessmentTypes(await res.json());
            else setError(await readApiError(res, "Failed to load assessment types"));
        } catch { setError("Failed to load assessment types"); }
        finally { setLoading(false); }
    };

    const assessmentSummary = getAssessmentTypeSummary(assessmentTypes);

    const addAssessmentType = async () => {
        if (!newAssessment.name || !newAssessment.maxScore) { setError("Please enter name and max score"); return; }
        setSaving(true);
        try {
            const res = await fetch("/api/assessment-types", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newAssessment),
            });
            if (await handleUnauthorizedApiResponse(res)) {
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setAssessmentTypes([...assessmentTypes, data]);
                setNewAssessment({ name: "", maxScore: "", includeInTotal: true });
                setSuccessMessage("Score component added successfully.");
                setShowSuccessModal(true);
            } else {
                setError(await readApiError(res, "Failed to add"));
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
            if (await handleUnauthorizedApiResponse(res)) {
                return;
            }
            if (res.ok) {
                const updated = await res.json();
                setAssessmentTypes(assessmentTypes.map(a => a.id === id ? updated : a));
                setEditingAssessment(null);
                setSuccessMessage("Score component updated.");
                setShowSuccessModal(true);
            } else {
                setError(await readApiError(res, "Failed to update"));
            }
        } catch { setError("Failed to update"); }
        finally { setSaving(false); }
    };

    const deleteAssessmentType = async (id: string) => {
        try {
            const res = await fetch(`/api/assessment-types?id=${id}`, { method: "DELETE" });
            if (await handleUnauthorizedApiResponse(res)) {
                return;
            }
            if (res.ok) {
                setAssessmentTypes(assessmentTypes.filter(a => a.id !== id));
                setSuccessMessage("Score component deleted.");
                setShowSuccessModal(true);
            } else {
                setError(await readApiError(res, "Failed to delete"));
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
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 mb-1">
                            Global Assessment Type Settings
                        </p>
                        <h3 className="text-lg font-semibold text-gray-900">Score Components</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            These are the school-wide default assessment components used unless a class-specific override is configured below.
                        </p>
                    </div>
                    <div className="text-sm text-gray-500 text-right">
                        <div>
                            Counted total: <span className={`font-bold ${assessmentSummary.countedMaxScore === 100 ? 'text-green-600' : 'text-orange-500'}`}>{assessmentSummary.countedMaxScore}</span>/100 points
                        </div>
                        {assessmentSummary.excludedMaxScore > 0 && (
                            <div className="text-xs text-gray-500">Recorded only: {assessmentSummary.excludedMaxScore} pts</div>
                        )}
                    </div>
                </div>
                <div className="space-y-3 mb-4">
                    {assessmentTypes.map((assessment) => (
                        <div key={assessment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            {editingAssessment === assessment.id ? (
                                <>
                                    <input type="text" className="input flex-1" defaultValue={assessment.name} id={`edit-name-${assessment.id}`} />
                                    <input type="number" className="input w-24" defaultValue={assessment.maxScore} id={`edit-score-${assessment.id}`} />
                                    <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                                        <input type="checkbox" defaultChecked={assessment.includeInTotal !== false} id={`edit-include-${assessment.id}`} />
                                        Count in total
                                    </label>
                                    <button
                                        onClick={() => {
                                            const name = (document.getElementById(`edit-name-${assessment.id}`) as HTMLInputElement).value;
                                            const maxScore = (document.getElementById(`edit-score-${assessment.id}`) as HTMLInputElement).value;
                                            const includeInTotal = (document.getElementById(`edit-include-${assessment.id}`) as HTMLInputElement).checked;
                                            updateAssessmentType(assessment.id, { name, maxScore, includeInTotal });
                                        }}
                                        className="btn-primary text-sm px-3 py-1"
                                    >Save</button>
                                    <button onClick={() => setEditingAssessment(null)} className="btn-secondary text-sm px-3 py-1">Cancel</button>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium">{assessment.name}</div>
                                        {assessment.includeInTotal === false && (
                                            <div className="text-xs text-amber-700">Recorded only, excluded from end-of-term total</div>
                                        )}
                                    </div>
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
                    <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                        <input
                            type="checkbox"
                            checked={newAssessment.includeInTotal}
                            onChange={(e) => setNewAssessment({ ...newAssessment, includeInTotal: e.target.checked })}
                        />
                        Count in total
                    </label>
                    <button onClick={addAssessmentType} disabled={saving} className="btn-primary text-sm px-4">+ Add</button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                    Components that are not counted can still be entered on score sheets, but they do not contribute to the end-of-term total or grade.
                </p>
            </div>

            {/* Class-specific Score Components */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Class-specific Score Components</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Override the default score components for a specific class. Classes without overrides use the school defaults above.
                </p>
                <ClassAssessmentOverrides defaultTypes={assessmentTypes} />
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
