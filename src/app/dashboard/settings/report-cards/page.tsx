"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "react-hot-toast";
import SuccessModal from "@/components/ui/SuccessModal";
import { showSuccessMessage } from "@/lib/successMessage";
import StandardReportPreview from "../../../../components/reports/previews/StandardReportPreview";
import { mapAssessmentTypesToScoreFields } from "@/lib/assessment-types";

// Types
interface ReportCardDisplayOptions {
    // Student Info
    showName?: boolean;
    showDOB?: boolean;
    showSex?: boolean;
    showClass?: boolean;
    showAdmNo?: boolean;
    showPhoto?: boolean; // Added
    showLogo?: boolean;
    showSchoolName?: boolean;
    showSchoolAddress?: boolean;
    showSchoolMotto?: boolean;
    showSchoolContact?: boolean; // Added
    // Attendance
    showAttOpened?: boolean;
    showAttPresent?: boolean;
    showAttAbsent?: boolean;
    // Academic
    showTermHistory?: boolean;
    showCA?: boolean;
    showCA1?: boolean;
    showScoreComponents?: boolean;
    showExam?: boolean;
    assessmentTypeVisibility?: Record<string, boolean>; // per-field visibility (e.g. { ca1: true, ca2: false, exam: true })
    showSubjectTotal?: boolean;
    showGrade?: boolean;
    showSubjectPosition?: boolean;
    showSubjectAverage?: boolean;
    showSubjectLowHigh?: boolean;
    showRemarks?: boolean; // Re-added
    showAcademicKey?: boolean; // Re-added
    showAffectiveKey?: boolean; // Re-added
    showTeacherSection?: boolean; // Re-added
    showPrincipalSection?: boolean; // Re-added
    showTeacherComment?: boolean;
    showPrincipalComment?: boolean;
    // Signatures
    showTeacherSign?: boolean;
    showTermHeader?: boolean;
    showPromotionStatus?: boolean;
    showPrincipalSign?: boolean;
    showTeacherDate?: boolean;
    showPrincipalDate?: boolean;
    // Traits (Granular)
    showTraitPunctuality?: boolean;
    showTraitNeatness?: boolean;
    showTraitPoliteness?: boolean;
    showTraitHonesty?: boolean;
    showTraitCreativity?: boolean;
    // Skills (Granular)
    showSkillHandwriting?: boolean;
    showSkillSports?: boolean;
    showSkillDrawing?: boolean;
    showSkillPublicSpeaking?: boolean;
    // Advanced Styling
    globalUniformity?: boolean;
    globalStyle?: SectionStyle;
    sectionStyles?: {
        personalData?: SectionStyle;
        attendance?: SectionStyle;
        academic?: SectionStyle;
        traits?: SectionStyle;
        skills?: SectionStyle;
        comments?: SectionStyle;
    };
}

export interface SectionStyle {
    borderWidth: number;
    borderStyle: 'solid' | 'dashed' | 'dotted' | 'double';
    borderColor?: string;
    headerBg?: string;
    headerText?: string;
}

interface CustomTemplate extends ReportCardConfig {
    id: string;
    name: string;
    createdAt: number;
}

interface ReportCardConfig {
    id?: string;
    name: string;
    activeTemplate: "classic" | "modern" | "minimal" | "professional" | "standard";
    colorScheme: string;
    showAttendance: boolean;
    showTraits: boolean;
    showSkills: boolean;
    showComments: boolean;
    showPhoto: boolean;
    showPosition: boolean;
    showBehaviourGradeKey: boolean;
    customTitles: Record<string, string>;
    displayOptions: ReportCardDisplayOptions;
}

export default function ReportCardSettingsPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [customTemplates, setCustomTemplates] = useState<Record<string, CustomTemplate>>({});
    const [activeTemplateId, setActiveTemplateId] = useState<string>("default-standard");

    const [config, setConfig] = useState<ReportCardConfig>({
        name: "Standard Classic",
        activeTemplate: "standard",
        colorScheme: "blue",
        showAttendance: true,
        showTraits: true,
        showSkills: true,
        showComments: true,
        showPhoto: true,
        showPosition: true,
        showBehaviourGradeKey: true,
        customTitles: {},
        displayOptions: {
            // Content Defaults
            showLogo: true, showSchoolName: true, showSchoolAddress: true, showSchoolMotto: true, showSchoolContact: true,
            showName: true, showDOB: true, showSex: true, showClass: true, showAdmNo: true,
            showAttOpened: true, showAttPresent: true, showAttAbsent: true,
            showTermHistory: true, showCA1: true, showScoreComponents: false, showCA: true, showExam: true, showSubjectTotal: true, showGrade: true, showSubjectPosition: true, showSubjectAverage: true, showSubjectLowHigh: true, showRemarks: true, showAcademicKey: true, showAffectiveKey: true,
            showTeacherSection: true, showPrincipalSection: true,
            showTeacherComment: true, showPrincipalComment: true, showTeacherSign: true, showPrincipalSign: true, showTeacherDate: true, showPrincipalDate: true,
            showTermHeader: true, showPromotionStatus: true,
            // Traits Defaults
            showTraitPunctuality: true, showTraitNeatness: true, showTraitPoliteness: true, showTraitHonesty: true, showTraitCreativity: true,
            // Skills Defaults
            showSkillHandwriting: true, showSkillSports: true, showSkillDrawing: true, showSkillPublicSpeaking: true,
            globalUniformity: true,
            globalStyle: {
                borderWidth: 2,
                borderStyle: 'solid',
                borderColor: '#14532d',
                headerBg: '#f3f4f6',
                headerText: '#1f2937'
            }
        }
    });

    const [settingsAssessmentTypes, setSettingsAssessmentTypes] = useState<any[]>([]);

    const mappedSettingsTypes = useMemo(
        () => mapAssessmentTypesToScoreFields(settingsAssessmentTypes),
        [settingsAssessmentTypes]
    );

    useEffect(() => {
        fetch("/api/assessment-types")
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (Array.isArray(data)) setSettingsAssessmentTypes(data); })
            .catch(() => {});
    }, []);

    // Use activeSection as activeTab
    const [activeSection, setActiveSection] = useState<"template" | "saved" | "theme" | "content">("template");
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastSavedName, setLastSavedName] = useState("");
    const [zoom, setZoom] = useState(1);

    // Collapsible states for content sections
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        "schoolInfo": true, // Added
        "studentInfo": true,
        "attendance": false,
        "academic": false,
        "traits": false,
        "skills": false,
        "comments": false,
        "footer": false
    });
    const [selectedStyleSection, setSelectedStyleSection] = useState<string>("global");

    const toggleSection = (key: string) => {
        setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Fetch settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch("/api/settings/report-card");
                if (res.ok) {
                    const data = await res.json();

                    // Load custom templates
                    if (data.customTemplates) {
                        setCustomTemplates(data.customTemplates);
                        const activeId = data.activeTemplateId || "default-standard";
                        setActiveTemplateId(activeId);

                        if (activeId !== "default-standard" && data.customTemplates[activeId]) {
                            setConfig(data.customTemplates[activeId]);
                        }
                    }

                    // Merge displayOptions with defaults
                    const mergedDisplayOptions = {
                        ...config.displayOptions,
                        ...(data.displayOptions || {})
                    };

                    setConfig((prev) => ({
                        ...prev,
                        ...data,
                        activeTemplate: "standard",
                        displayOptions: mergedDisplayOptions
                    }));
                }
            } catch (error) {
                console.error("Failed to fetch settings:", error);
                toast.error("Failed to load settings");
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async (isNew: boolean = false) => {
        setSaving(true);
        try {
            let finalConfig = { ...config };
            let newTemplates = { ...customTemplates };
            let newActiveId = activeTemplateId;

            if (isNew) {
                const newId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                const newTemplate: CustomTemplate = {
                    ...finalConfig,
                    id: newId,
                    createdAt: Date.now()
                };
                newTemplates[newId] = newTemplate;
                newActiveId = newId;
            } else if (activeTemplateId !== "default-standard") {
                newTemplates[activeTemplateId] = {
                    ...finalConfig,
                    id: activeTemplateId,
                    createdAt: customTemplates[activeTemplateId]?.createdAt || Date.now()
                };
            }

            const payload = {
                ...finalConfig,
                activeTemplateId: newActiveId,
                customTemplates: newTemplates
            };

            const res = await fetch("/api/settings/report-card", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setCustomTemplates(newTemplates);
                setActiveTemplateId(newActiveId);
                setLastSavedName(isNew ? finalConfig.name : (customTemplates[newActiveId]?.name || finalConfig.name));
                setShowSuccessModal(true);
            } else {
                throw new Error("Failed to save");
            }
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Failed to save settings");
        } finally {
            setSaving(false);
        }
    };

    const deleteTemplate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (id === "default-standard") return;

        const { [id]: removed, ...remainingTemplates } = customTemplates;
        const newActiveId = activeTemplateId === id ? "default-standard" : activeTemplateId;

        try {
            const res = await fetch("/api/settings/report-card", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    activeTemplateId: newActiveId,
                    customTemplates: remainingTemplates
                }),
            });

            if (res.ok) {
                setCustomTemplates(remainingTemplates);
                if (activeTemplateId === id) {
                    setActiveTemplateId("default-standard");
                    // Reset to defaults or first available? Let's reset to defaults for simplicity
                    // or define a DEFAULT_CONFIG
                }
                showSuccessMessage("Template deleted", { title: "Template Deleted!" });
            }
        } catch (error) {
            toast.error("Failed to delete template");
        }
    };

    const duplicateTemplate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const source = customTemplates[id];
        if (!source) return;

        const newId = `tmpl-${Date.now()}`;
        const duplicate = { ...source, id: newId, name: `${source.name} (Copy)`, createdAt: Date.now() };
        const newTemplates = { ...customTemplates, [newId]: duplicate };

        try {
            const res = await fetch("/api/settings/report-card", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ activeTemplateId, customTemplates: newTemplates }),
            });
            if (res.ok) {
                setCustomTemplates(newTemplates);
                setActiveTemplateId(newId);
                setConfig(duplicate);
                showSuccessMessage("Template duplicated", { title: "Template Duplicated!" });
            }
        } catch {
            toast.error("Failed to duplicate template");
        }
    };

    const updateDisplayOption = (key: keyof ReportCardDisplayOptions, value: boolean) => {
        setConfig(prev => ({
            ...prev,
            displayOptions: {
                ...prev.displayOptions,
                [key]: value
            }
        }));
    };

    const updateStyle = (field: keyof SectionStyle, value: any) => {
        setConfig(prev => {
            const newDisplayOptions = { ...prev.displayOptions };

            if (selectedStyleSection === "global") {
                const currentGlobal = newDisplayOptions.globalStyle || { borderWidth: 2, borderStyle: 'solid', borderColor: '#14532d', headerBg: '#f3f4f6', headerText: '#1f2937' };
                newDisplayOptions.globalStyle = { ...currentGlobal, [field]: value };

                // If uniformity is on, maybe we don't need to do anything else as preview will handle it
                // But for explicit saving, let's keep it clean
            } else {
                const currentSections = newDisplayOptions.sectionStyles || {};
                const currentSection = (currentSections as any)[selectedStyleSection] || (newDisplayOptions.globalStyle || { borderWidth: 2, borderStyle: 'solid', borderColor: '#14532d', headerBg: '#f3f4f6', headerText: '#1f2937' });
                newDisplayOptions.sectionStyles = {
                    ...currentSections,
                    [selectedStyleSection]: { ...currentSection, [field]: value }
                };
            }

            return {
                ...prev,
                displayOptions: newDisplayOptions
            };
        });
    };

    const templates = [
        { id: "standard", name: "Nigerian Standard", description: "Official standard layout with detailed grids (Recommended)" },
    ];

    const colors = [
        { id: "blue", name: "Blue", value: "bg-blue-600", hex: "#2e7d32" }, // Wait, blue maps to green hex? Correcting to blue.
        { id: "green", name: "Green", value: "bg-green-600", hex: "#059669" },
        { id: "red", name: "Red", value: "bg-red-600", hex: "#dc2626" },
        { id: "purple", name: "Purple", value: "bg-purple-600", hex: "#7c3aed" },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-50">
            {/* Left Sidebar - Settings Controls */}
            <div className="w-96 flex flex-col bg-white border-r border-gray-200 shadow-sm z-10">
                <div className="p-6 border-b border-gray-100">
                    <div className="flex flex-col gap-5">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <h1 className="text-xl font-black text-gray-900 tracking-tight">Customization</h1>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Configure your report layout</p>
                            </div>
                        </div>

                        <div className="relative group">
                            <label className="absolute -top-2 left-3 px-1 bg-white text-[9px] font-black text-primary-600 uppercase tracking-tighter z-10">
                                Current Template Name
                            </label>
                            <input
                                type="text"
                                value={config.name}
                                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                                className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/5 transition-all placeholder:text-gray-300 shadow-sm group-hover:border-gray-200"
                                placeholder="e.g. 1st Term Mid-Term Report"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col">
                    {/* Tab Header */}
                    <div className="flex border-b border-gray-100 bg-white sticky top-0 z-10 px-4 pt-2">
                        <button
                            onClick={() => setActiveSection("template")}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeSection === "template"
                                ? "border-primary-600 text-primary-600 bg-primary-50/50"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            Template
                        </button>
                        <button
                            onClick={() => setActiveSection("saved")}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeSection === "saved"
                                ? "border-primary-600 text-primary-600 bg-primary-50/50"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            Saved
                        </button>
                        <button
                            onClick={() => setActiveSection("theme")}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeSection === "theme"
                                ? "border-primary-600 text-primary-600 bg-primary-50/50"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            Theme
                        </button>
                        <button
                            onClick={() => setActiveSection("content")}
                            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeSection === "content"
                                ? "border-primary-600 text-primary-600 bg-primary-50/50"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                }`}
                        >
                            Content
                        </button>
                    </div>

                    <div className="p-6 space-y-6 flex-1">
                        {/* Tab Content: Template Style */}
                        {activeSection === "template" && (
                            <div className="space-y-4 animate-fadeIn">
                                <h2 className="text-sm font-bold text-gray-900 mb-2 uppercase tracking-tight">Template Style</h2>
                                {templates.map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={() => {
                                            setConfig({ ...config, activeTemplate: t.id as any });
                                            setActiveTemplateId("default-standard");
                                        }}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${config.activeTemplate === t.id && activeTemplateId === "default-standard"
                                            ? "border-primary-600 bg-primary-50 shadow-sm"
                                            : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="font-bold text-sm text-gray-900">{t.name}</div>
                                            {config.activeTemplate === t.id && activeTemplateId === "default-standard" && (
                                                <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-gray-500 leading-relaxed font-medium">{t.description}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tab Content: Saved Templates */}
                        {activeSection === "saved" && (
                            <div className="space-y-6 animate-fadeIn pb-4">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Your Configurations</h4>
                                        <button
                                            onClick={() => handleSave(true)}
                                            className="px-2 py-1 bg-primary-50 text-primary-600 rounded-md flex items-center gap-1 text-[10px] font-bold border border-primary-100 hover:bg-primary-100 transition-colors"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                                            </svg>
                                            NEW
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Custom Templates */}
                                        {Object.values(customTemplates).length === 0 ? (
                                            <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50">
                                                <p className="text-xs text-gray-400 font-medium">No saved templates yet.</p>
                                            </div>
                                        ) : (
                                            Object.values(customTemplates).map(tmpl => (
                                                <div
                                                    key={tmpl.id}
                                                    onClick={() => {
                                                        setActiveTemplateId(tmpl.id);
                                                        setConfig(tmpl);
                                                    }}
                                                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer group ${activeTemplateId === tmpl.id ? 'bg-primary-50 border-primary-600 shadow-sm' : 'bg-white border-gray-100 hover:border-gray-200'}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-bold text-gray-900">{tmpl.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            {activeTemplateId === tmpl.id && (
                                                                <div className="w-4 h-4 rounded-full bg-primary-600 flex items-center justify-center">
                                                                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                            <button
                                                                onClick={(e) => duplicateTemplate(tmpl.id, e)}
                                                                title="Duplicate"
                                                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-all border border-transparent hover:border-blue-100"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={(e) => deleteTemplate(tmpl.id, e)}
                                                                title="Delete"
                                                                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition-all border border-transparent hover:border-red-100"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1.5">
                                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Created: {new Date(tmpl.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Content: Theme */}
                        {activeSection === "theme" && (
                            <div className="space-y-6 animate-fadeIn pb-4">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">Theme Customization</h2>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase">Uniformity</span>
                                            <div className="relative inline-flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={config.displayOptions.globalUniformity !== false}
                                                    onChange={(e) => setConfig({
                                                        ...config,
                                                        displayOptions: { ...config.displayOptions, globalUniformity: e.target.checked }
                                                    })}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-8 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary-600"></div>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Section Selector */}
                                    <div className="bg-gray-50 p-1 rounded-lg flex gap-1 mb-4 border border-gray-100">
                                        <button
                                            onClick={() => setSelectedStyleSection("global")}
                                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${selectedStyleSection === "global" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                                        >
                                            GLOBAL
                                        </button>
                                        <select
                                            value={selectedStyleSection === "global" ? "" : selectedStyleSection}
                                            onChange={(e) => setSelectedStyleSection(e.target.value)}
                                            className={`flex-1 py-1.5 text-[10px] font-bold bg-transparent outline-none cursor-pointer ${selectedStyleSection !== "global" ? "text-primary-700" : "text-gray-500"}`}
                                        >
                                            <option value="" disabled>SECTIONS</option>
                                            <option value="personalData">Student Data</option>
                                            <option value="attendance">Attendance</option>
                                            <option value="academic">Academic</option>
                                            <option value="traits">Traits</option>
                                            <option value="skills">Skills</option>
                                            <option value="comments">Comments</option>
                                        </select>
                                    </div>

                                    <div className="space-y-4">
                                        {/* 1. Border Color */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary-500"></div>
                                                Border Color
                                            </label>
                                            <div className="flex items-center gap-4">
                                                <div className="grid grid-cols-4 gap-2 flex-grow">
                                                    {colors.map((c) => (
                                                        <button
                                                            key={c.id}
                                                            onClick={() => updateStyle('borderColor', c.hex)}
                                                            className={`h-8 rounded-lg ${c.value} transition-transform hover:scale-105 shadow-sm flex items-center justify-center ${(selectedStyleSection === "global" ? config.displayOptions.globalStyle?.borderColor : (config.displayOptions.sectionStyles as any)?.[selectedStyleSection]?.borderColor) === c.hex ? "ring-2 ring-offset-2 ring-gray-900 scale-105" : ""
                                                                }`}
                                                            title={c.name}
                                                        >
                                                            {(selectedStyleSection === "global" ? config.displayOptions.globalStyle?.borderColor : (config.displayOptions.sectionStyles as any)?.[selectedStyleSection]?.borderColor) === c.hex && (
                                                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="w-px h-8 bg-gray-200"></div>
                                                <label className={`w-8 h-8 rounded-lg bg-white border-2 border-dashed border-gray-300 hover:border-primary-500 transition-colors cursor-pointer flex items-center justify-center relative overflow-hidden shrink-0 ${!colors.some(c => c.hex === (selectedStyleSection === "global" ? config.displayOptions.globalStyle?.borderColor : (config.displayOptions.sectionStyles as any)?.[selectedStyleSection]?.borderColor)) ? "ring-2 ring-offset-2 ring-gray-900" : ""}`}>
                                                    <input
                                                        type="color"
                                                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                                                        value={colors.some(c => c.hex === (selectedStyleSection === "global" ? config.displayOptions.globalStyle?.borderColor : (config.displayOptions.sectionStyles as any)?.[selectedStyleSection]?.borderColor)) ? "#ffffff" : (selectedStyleSection === "global" ? config.displayOptions.globalStyle?.borderColor : (config.displayOptions.sectionStyles as any)?.[selectedStyleSection]?.borderColor) || "#000000"}
                                                        onChange={(e) => updateStyle('borderColor', e.target.value)}
                                                    />
                                                    <div className="w-4 h-4 rounded-full border border-gray-100 shadow-sm" style={{ backgroundColor: (selectedStyleSection === "global" ? config.displayOptions.globalStyle?.borderColor : (config.displayOptions.sectionStyles as any)?.[selectedStyleSection]?.borderColor) || '#ccc' }}></div>
                                                </label>
                                            </div>
                                        </div>

                                        {/* 2. Border Width & Style */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                                                    Border Width
                                                </label>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="4"
                                                    step="1"
                                                    value={(selectedStyleSection === "global" ? config.displayOptions.globalStyle?.borderWidth : (config.displayOptions.sectionStyles as any)?.[selectedStyleSection]?.borderWidth) || 2}
                                                    onChange={(e) => updateStyle('borderWidth', parseInt(e.target.value))}
                                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                                />
                                                <div className="flex justify-between text-[8px] text-gray-400 font-bold">
                                                    <span>1px</span>
                                                    <span>4px</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2">
                                                    Border Type
                                                </label>
                                                <select
                                                    value={(selectedStyleSection === "global" ? config.displayOptions.globalStyle?.borderStyle : (config.displayOptions.sectionStyles as any)?.[selectedStyleSection]?.borderStyle) || 'solid'}
                                                    onChange={(e) => updateStyle('borderStyle', e.target.value)}
                                                    className="w-full p-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-primary-500 bg-white font-medium"
                                                >
                                                    <option value="solid">Solid</option>
                                                    <option value="dashed">Dashed</option>
                                                    <option value="dotted">Dotted</option>
                                                    <option value="double">Double</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* 3. Header Styling */}
                                        <div className="space-y-3 pt-2">
                                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-2 border-b border-gray-100 pb-1">
                                                Header Appearance
                                            </label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase">Background</span>
                                                    <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-white">
                                                        <input
                                                            type="color"
                                                            value={(selectedStyleSection === "global" ? config.displayOptions.globalStyle?.headerBg : (config.displayOptions.sectionStyles as any)?.[selectedStyleSection]?.headerBg) || "#f3f4f6"}
                                                            onChange={(e) => updateStyle('headerBg', e.target.value)}
                                                            className="w-6 h-6 rounded-md cursor-pointer border-none"
                                                        />
                                                        <span className="text-[10px] font-mono text-gray-500 uppercase">{(selectedStyleSection === "global" ? config.displayOptions.globalStyle?.headerBg : (config.displayOptions.sectionStyles as any)?.[selectedStyleSection]?.headerBg) || "#F3F4F6"}</span>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <span className="text-[9px] text-gray-400 font-bold uppercase">Text Color</span>
                                                    <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg bg-white">
                                                        <input
                                                            type="color"
                                                            value={(selectedStyleSection === "global" ? config.displayOptions.globalStyle?.headerText : (config.displayOptions.sectionStyles as any)?.[selectedStyleSection]?.headerText) || "#1f2937"}
                                                            onChange={(e) => updateStyle('headerText', e.target.value)}
                                                            className="w-6 h-6 rounded-md cursor-pointer border-none"
                                                        />
                                                        <span className="text-[10px] font-mono text-gray-500 uppercase">{(selectedStyleSection === "global" ? config.displayOptions.globalStyle?.headerText : (config.displayOptions.sectionStyles as any)?.[selectedStyleSection]?.headerText) || "#1F2937"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    {selectedStyleSection !== "global" && (
                                        <button
                                            onClick={() => {
                                                const currentStyle = (config.displayOptions.sectionStyles as any)?.[selectedStyleSection] || config.displayOptions.globalStyle;
                                                setConfig({
                                                    ...config,
                                                    displayOptions: {
                                                        ...config.displayOptions,
                                                        globalStyle: { ...currentStyle },
                                                        globalUniformity: true
                                                    }
                                                });
                                                showSuccessMessage("Applied to all sections", { title: "Changes Applied!" });
                                            }}
                                            className="w-full mt-6 py-2 border-2 border-gray-100 rounded-lg text-gray-500 hover:text-primary-600 hover:border-primary-100 hover:bg-primary-50 transition-all flex items-center justify-center gap-2 group"
                                        >
                                            <svg className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7M13 5l7 7-7 7" />
                                            </svg>
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Apply to all sections</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tab Content: Content */}
                        {activeSection === "content" && (
                            <div className="space-y-6 animate-fadeIn pb-4">

                                <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Visible Sections</h2>

                                {
                                    /* 0. School Info Section (New) */
                                }
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('schoolInfo')}
                                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                                    >
                                        <span className="text-sm font-bold text-gray-700">School Information</span>
                                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${openSections['schoolInfo'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>

                                    {openSections['schoolInfo'] && (
                                        <div className="p-3 bg-white space-y-2 border-t border-gray-200">
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <span className="text-xs text-gray-600">School Logo</span>
                                                <input
                                                    type="checkbox"
                                                    checked={config.displayOptions.showLogo !== false}
                                                    onChange={(e) => updateDisplayOption('showLogo', e.target.checked)}
                                                    className="accent-primary-600 h-4 w-4 rounded border-gray-300"
                                                />
                                            </label>
                                            <hr className="border-gray-100 my-1" />
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <span className="text-xs text-gray-600">Term Header</span>
                                                <input
                                                    type="checkbox"
                                                    checked={(config.displayOptions as any).showTermHeader !== false}
                                                    onChange={(e) => updateDisplayOption('showTermHeader' as any, e.target.checked)}
                                                    className="accent-primary-600 h-4 w-4 rounded border-gray-300"
                                                />
                                            </label>
                                            <hr className="border-gray-100 my-1" />
                                            {[
                                                { k: 'showSchoolName', l: 'School Name' },
                                                { k: 'showSchoolAddress', l: 'Address' },
                                                { k: 'showSchoolMotto', l: 'Motto' },
                                                { k: 'showSchoolContact', l: 'Contact Info' },
                                            ].map((opt) => (
                                                <label key={opt.k} className="flex items-center justify-between cursor-pointer">
                                                    <span className="text-xs text-gray-600">{opt.l}</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={(config.displayOptions as any)[opt.k] !== false}
                                                        onChange={(e) => updateDisplayOption(opt.k as keyof ReportCardDisplayOptions, e.target.checked)}
                                                        className="accent-primary-600 h-4 w-4 rounded border-gray-300"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 1. Student Info Section */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('studentInfo')}
                                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                                    >
                                        <span className="text-sm font-bold text-gray-700">Student Profile</span>
                                        <div className="flex items-center gap-2">
                                            {/* Main Toggle for Whole Section */}
                                            <div
                                                className="relative inline-flex items-center cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfig({ ...config, showPhoto: !config.showPhoto }); // Using showPhoto as proxy for section toggle or add new one?
                                                    // For now just toggle visibility of photo as main switch or keep it separate
                                                }}
                                            >
                                                {/*  Optional: Main switch for section <input type="checkbox" className="sr-only peer" checked={true} readOnly />  */}
                                            </div>
                                            <svg className={`w-4 h-4 text-gray-500 transition-transform ${openSections['studentInfo'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </div>
                                    </button>

                                    {openSections['studentInfo'] && (
                                        <div className="p-3 bg-white space-y-2 border-t border-gray-200">
                                            {/* Top Level Photo Toggle */}
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <span className="text-xs text-gray-600">Student Photograph</span>
                                                <input
                                                    type="checkbox"
                                                    checked={config.showPhoto}
                                                    onChange={(e) => setConfig({
                                                        ...config,
                                                        showPhoto: e.target.checked,
                                                        displayOptions: {
                                                            ...config.displayOptions,
                                                            showPhoto: e.target.checked
                                                        }
                                                    })}
                                                    className="accent-primary-600 h-4 w-4 rounded border-gray-300"
                                                />
                                            </label>
                                            <hr className="border-gray-100 my-1" />
                                            {/* Granular Toggles */}
                                            {[
                                                { k: 'showName', l: 'Full Name' },
                                                { k: 'showDOB', l: 'Date of Birth' },
                                                { k: 'showSex', l: 'Gender' },
                                                { k: 'showClass', l: 'Class' },
                                                { k: 'showAdmNo', l: 'Admission No.' },
                                            ].map((opt) => (
                                                <label key={opt.k} className="flex items-center justify-between cursor-pointer">
                                                    <span className="text-xs text-gray-600">{opt.l}</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={(config.displayOptions as any)[opt.k] !== false}
                                                        onChange={(e) => updateDisplayOption(opt.k as keyof ReportCardDisplayOptions, e.target.checked)}
                                                        className="accent-primary-600 h-4 w-4 rounded border-gray-300"
                                                    />
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* 2. Attendance Section */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('attendance')}
                                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                                    >
                                        <span className="text-sm font-bold text-gray-700">Attendance</span>
                                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${openSections['attendance'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>

                                    {openSections['attendance'] && (
                                        <div className="p-3 bg-white space-y-2 border-t border-gray-200">
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <span className="text-xs font-semibold text-gray-700">Show Section</span>
                                                <input type="checkbox" checked={config.showAttendance} onChange={(e) => setConfig({ ...config, showAttendance: e.target.checked })} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                            </label>
                                            {config.showAttendance && (
                                                <>
                                                    <hr className="border-gray-100 my-1" />
                                                    <label className="flex items-center justify-between cursor-pointer">
                                                        <span className="text-xs text-gray-600">Days School Opened</span>
                                                        <input type="checkbox" checked={config.displayOptions.showAttOpened !== false} onChange={(e) => updateDisplayOption('showAttOpened', e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                                    </label>
                                                    <label className="flex items-center justify-between cursor-pointer">
                                                        <span className="text-xs text-gray-600">Days Present</span>
                                                        <input type="checkbox" checked={config.displayOptions.showAttPresent !== false} onChange={(e) => updateDisplayOption('showAttPresent', e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                                    </label>
                                                    <label className="flex items-center justify-between cursor-pointer">
                                                        <span className="text-xs text-gray-600">Days Absent</span>
                                                        <input type="checkbox" checked={config.displayOptions.showAttAbsent !== false} onChange={(e) => updateDisplayOption('showAttAbsent', e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                                    </label>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 3. Academic Section */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('academic')}
                                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                                    >
                                        <span className="text-sm font-bold text-gray-700">Academic Performance</span>
                                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${openSections['academic'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>

                                    {openSections['academic'] && (
                                        <div className="p-3 bg-white space-y-2 border-t border-gray-200">
                                            {/* Static options before CA block */}
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <span className="text-xs text-gray-600">Term History (1st/2nd)</span>
                                                <input type="checkbox" checked={(config.displayOptions as any).showTermHistory !== false} onChange={(e) => updateDisplayOption('showTermHistory', e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                            </label>

                                            {/* CA master toggle */}
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <span className="text-xs text-gray-600">CA Score Columns</span>
                                                <input type="checkbox" checked={(config.displayOptions as any).showCA1 !== false} onChange={(e) => updateDisplayOption('showCA1', e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                            </label>

                                            {/* Per-type individual toggles */}
                                            {(config.displayOptions as any).showCA1 !== false && mappedSettingsTypes.length > 0 && (
                                                <div className="pl-3 border-l-2 border-gray-100 ml-1 space-y-1.5">
                                                    {mappedSettingsTypes.map(at => {
                                                        const visibility = config.displayOptions?.assessmentTypeVisibility || {};
                                                        const isVisible = visibility[at.field] !== false;
                                                        return (
                                                            <label key={at.field} className="flex items-center justify-between cursor-pointer">
                                                                <span className="text-[11px] text-gray-500">
                                                                    {at.name}
                                                                    <span className="text-gray-400 ml-1">({at.maxScore}pts)</span>
                                                                </span>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isVisible}
                                                                    onChange={(e) => {
                                                                        setConfig(prev => ({
                                                                            ...prev,
                                                                            displayOptions: {
                                                                                ...prev.displayOptions,
                                                                                assessmentTypeVisibility: {
                                                                                    ...(prev.displayOptions?.assessmentTypeVisibility || {}),
                                                                                    [at.field]: e.target.checked
                                                                                }
                                                                            }
                                                                        }));
                                                                    }}
                                                                    className="accent-primary-600 h-3.5 w-3.5 rounded border-gray-300"
                                                                />
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Remaining static academic options */}
                                            {[
                                                { k: 'showScoreComponents', l: 'Score Sub-components (Breakdown)' },
                                                { k: 'showCA', l: 'Total CA' },
                                                { k: 'showSubjectTotal', l: 'Subject Total' },
                                                { k: 'showGrade', l: 'Grade (A/B/C)' },
                                                { k: 'showSubjectPosition', l: 'Subject Position' },
                                                { k: 'showSubjectAverage', l: 'Subject Average' },
                                                { k: 'showSubjectLowHigh', l: 'Lowest/Highest Scores' },
                                                { k: 'showRemarks', l: 'Remarks' },
                                            ].map((opt) => (
                                                <label key={opt.k} className="flex items-center justify-between cursor-pointer">
                                                    <span className="text-xs text-gray-600">{opt.l}</span>
                                                    <input
                                                        type="checkbox"
                                                        checked={(config.displayOptions as any)[opt.k] !== false}
                                                        onChange={(e) => updateDisplayOption(opt.k as keyof ReportCardDisplayOptions, e.target.checked)}
                                                        className="accent-primary-600 h-4 w-4 rounded border-gray-300"
                                                    />
                                                </label>
                                            ))}
                                            <hr className="border-gray-100 my-1" />
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <span className="text-xs font-semibold text-gray-700">Class Position Summary</span>
                                                <input type="checkbox" checked={config.showPosition} onChange={(e) => setConfig({ ...config, showPosition: e.target.checked })} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                            </label>
                                            <hr className="border-gray-100 my-1" />
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <span className="text-xs font-semibold text-gray-700">Show Academic Grade Key</span>
                                                <input type="checkbox" checked={config.displayOptions.showAcademicKey !== false} onChange={(e) => updateDisplayOption('showAcademicKey', e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {/* 4. Affective Traits Section */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('traits')}
                                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                                    >
                                        <span className="text-sm font-bold text-gray-700">Affective Traits</span>
                                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${openSections['traits'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>

                                    {openSections['traits'] && (
                                        <div className="p-3 bg-white space-y-2 border-t border-gray-200">
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <span className="text-xs font-semibold text-gray-700">Show Section</span>
                                                <input type="checkbox" checked={config.showTraits} onChange={(e) => setConfig({ ...config, showTraits: e.target.checked })} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                            </label>
                                            {config.showTraits && (
                                                <>
                                                    <hr className="border-gray-100 my-1" />
                                                    <label className="flex items-center justify-between cursor-pointer">
                                                        <span className="text-xs text-gray-600">Show Behaviour/Skills Key</span>
                                                        <input
                                                            type="checkbox"
                                                            checked={config.displayOptions.showAffectiveKey !== false}
                                                            onChange={(e) => {
                                                                const val = e.target.checked;
                                                                setConfig({
                                                                    ...config,
                                                                    showBehaviourGradeKey: val,
                                                                    displayOptions: {
                                                                        ...config.displayOptions,
                                                                        showAffectiveKey: val
                                                                    }
                                                                });
                                                            }}
                                                            className="accent-primary-600 h-4 w-4 rounded border-gray-300"
                                                        />
                                                    </label>
                                                    <hr className="border-gray-100 my-1" />
                                                    {[
                                                        { k: 'showTraitPunctuality', l: 'Punctuality' },
                                                        { k: 'showTraitNeatness', l: 'Neatness' },
                                                        { k: 'showTraitPoliteness', l: 'Politeness' },
                                                        { k: 'showTraitHonesty', l: 'Honesty' },
                                                        { k: 'showTraitCreativity', l: 'Creativity' },
                                                    ].map((opt) => (
                                                        <label key={opt.k} className="flex items-center justify-between cursor-pointer">
                                                            <span className="text-xs text-gray-600">{opt.l}</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={(config.displayOptions as any)[opt.k] !== false}
                                                                onChange={(e) => updateDisplayOption(opt.k as keyof ReportCardDisplayOptions, e.target.checked)}
                                                                className="accent-primary-600 h-4 w-4 rounded border-gray-300"
                                                            />
                                                        </label>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 5. Psychomotor Skills Section */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('skills')}
                                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                                    >
                                        <span className="text-sm font-bold text-gray-700">Psychomotor Skills</span>
                                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${openSections['skills'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>

                                    {openSections['skills'] && (
                                        <div className="p-3 bg-white space-y-2 border-t border-gray-200">
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <span className="text-xs font-semibold text-gray-700">Show Section</span>
                                                <input type="checkbox" checked={config.showSkills} onChange={(e) => setConfig({ ...config, showSkills: e.target.checked })} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                            </label>
                                            {config.showSkills && (
                                                <>
                                                    <hr className="border-gray-100 my-1" />
                                                    {[
                                                        { k: 'showSkillHandwriting', l: 'Handwriting' },
                                                        { k: 'showSkillSports', l: 'Sports' },
                                                        { k: 'showSkillDrawing', l: 'Drawing' },
                                                        { k: 'showSkillPublicSpeaking', l: 'Public Speaking' },
                                                    ].map((opt) => (
                                                        <label key={opt.k} className="flex items-center justify-between cursor-pointer">
                                                            <span className="text-xs text-gray-600">{opt.l}</span>
                                                            <input
                                                                type="checkbox"
                                                                checked={(config.displayOptions as any)[opt.k] !== false}
                                                                onChange={(e) => updateDisplayOption(opt.k as keyof ReportCardDisplayOptions, e.target.checked)}
                                                                className="accent-primary-600 h-4 w-4 rounded border-gray-300"
                                                            />
                                                        </label>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* 5. Footer Section */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleSection('footer')}
                                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors"
                                    >
                                        <span className="text-sm font-bold text-gray-700">Comments & Signatures</span>
                                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${openSections['footer'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>

                                    {openSections['footer'] && (
                                        <div className="p-3 bg-white space-y-2 border-t border-gray-200">
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <span className="text-xs font-semibold text-gray-700">Show Comments Block</span>
                                                <input type="checkbox" checked={config.showComments} onChange={(e) => setConfig({ ...config, showComments: e.target.checked })} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                            </label>
                                            {config.showComments && (
                                                <>
                                                    <hr className="border-gray-100 my-1" />
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] uppercase font-bold text-gray-400">CLASS TEACHER</p>
                                                            <input type="checkbox" checked={(config.displayOptions as any).showTeacherSection !== false} onChange={(e) => updateDisplayOption('showTeacherSection' as any, e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                                        </div>
                                                        {((config.displayOptions as any).showTeacherSection !== false) && (
                                                            <div className="pl-2 border-l-2 border-gray-100 space-y-2">
                                                                <label className="flex items-center justify-between cursor-pointer">
                                                                    <span className="text-xs text-gray-600">Comment Text</span>
                                                                    <input type="checkbox" checked={(config.displayOptions as any).showTeacherComment !== false} onChange={(e) => updateDisplayOption('showTeacherComment' as any, e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                                                </label>
                                                                <label className="flex items-center justify-between cursor-pointer">
                                                                    <span className="text-xs text-gray-600">Signature</span>
                                                                    <input type="checkbox" checked={config.displayOptions.showTeacherSign !== false} onChange={(e) => updateDisplayOption('showTeacherSign', e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                                                </label>
                                                                <label className="flex items-center justify-between cursor-pointer">
                                                                    <span className="text-xs text-gray-600">Date</span>
                                                                    <input type="checkbox" checked={config.displayOptions.showTeacherDate !== false} onChange={(e) => updateDisplayOption('showTeacherDate', e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <hr className="border-gray-100 my-1" />
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] uppercase font-bold text-gray-400">PRINCIPAL</p>
                                                            <input type="checkbox" checked={(config.displayOptions as any).showPrincipalSection !== false} onChange={(e) => updateDisplayOption('showPrincipalSection' as any, e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                                        </div>
                                                        {((config.displayOptions as any).showPrincipalSection !== false) && (
                                                            <div className="pl-2 border-l-2 border-gray-100 space-y-2">
                                                                <label className="flex items-center justify-between cursor-pointer">
                                                                    <span className="text-xs text-gray-600">Comment Text</span>
                                                                    <input type="checkbox" checked={(config.displayOptions as any).showPrincipalComment !== false} onChange={(e) => updateDisplayOption('showPrincipalComment' as any, e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                                                </label>
                                                                <label className="flex items-center justify-between cursor-pointer">
                                                                    <span className="text-xs text-gray-600">Signature</span>
                                                                    <input type="checkbox" checked={config.displayOptions.showPrincipalSign !== false} onChange={(e) => updateDisplayOption('showPrincipalSign', e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                                                </label>
                                                                <label className="flex items-center justify-between cursor-pointer">
                                                                    <span className="text-xs text-gray-600">Date</span>
                                                                    <input type="checkbox" checked={config.displayOptions.showPrincipalDate !== false} onChange={(e) => updateDisplayOption('showPrincipalDate', e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                            <hr className="border-gray-100 my-1" />
                                            <label className="flex items-center justify-between cursor-pointer">
                                                <span className="text-xs font-semibold text-gray-700">Show Promotion Status</span>
                                                <input type="checkbox" checked={(config.displayOptions as any).showPromotionStatus !== false} onChange={(e) => updateDisplayOption('showPromotionStatus' as any, e.target.checked)} className="accent-primary-600 h-4 w-4 rounded border-gray-300" />
                                            </label>
                                        </div>
                                    )}
                                </div>

                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 mt-auto space-y-3">
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="w-full py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        {saving ? "Saving Changes..." : "Save Configuration"}
                    </button>

                    <button
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="w-full py-2.5 bg-white border-2 border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                        </svg>
                        Save as New Template
                    </button>
                    <p className="text-[10px] text-center text-gray-400">Manage multiple templates for different terms.</p>
                </div>
            </div>

            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                title="Template Saved!"
                message={
                    <>
                        Your template <span className="text-gray-900 font-bold">"{lastSavedName}"</span> is now ready to use and can be accessed in the <span className="text-primary-600 font-bold">Saved</span> tab.
                    </>
                }
            />

            {/* Main Preview Area */}
            <div className="flex-1 flex flex-col relative bg-gray-100 h-full overflow-hidden">
                {/* Preview Toolbar */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white/90 backdrop-blur-sm border border-gray-200 px-3 py-1.5 rounded-full shadow-sm">
                    <button
                        onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900"
                        title="Zoom Out"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                    </button>
                    <span className="text-xs font-mono w-12 text-center text-gray-600">{Math.round(zoom * 100)}%</span>
                    <button
                        onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
                        className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900"
                        title="Zoom In"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                    <div className="w-px h-4 bg-gray-300 mx-1"></div>
                    <button
                        onClick={() => setZoom(1)}
                        className="text-xs font-medium text-gray-500 hover:text-primary-600 px-2"
                    >
                        Reset
                    </button>
                </div>

                {/* Preview Canvas */}
                <div className="flex-1 overflow-auto flex items-start justify-center p-12 bg-gray-100">
                    <div
                        className="transition-transform duration-200 ease-out origin-top shadow-2xl"
                        style={{ transform: `scale(${zoom})` }}
                    >
                        <div className="dashboard-light-surface w-[794px] min-h-[1123px] bg-white">
                            <StandardReportPreview config={config as any} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
