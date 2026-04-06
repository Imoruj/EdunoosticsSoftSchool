"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";
import SuccessModal from "@/components/ui/SuccessModal";
import { showSuccessMessage } from "@/lib/successMessage";

interface CommentConfig {
    maxScorePerSubject: "dynamic" | "fixed100";
    scoreDisplayed: "raw" | "rawOutOf100";
    overallAverage: "normalized" | "direct";
    performanceBand: "normalized" | "direct";
    resitSubjects: "never" | "thirdTermBelow50";
    resitEligibleSubjects: string[];
    focusSubjectPolicy: "lowestNormalized" | "lowestRawNotResit";
}

interface AISettings {
    id?: string;
    schoolId?: string;
    teacherPrompt: string;
    principalPrompt: string;
    useMultiAgentComments: boolean;
    commentConfig?: CommentConfig;
    createdAt?: string;
    updatedAt?: string;
}

const defaultCommentConfig: CommentConfig = {
    maxScorePerSubject: "dynamic",
    scoreDisplayed: "raw",
    overallAverage: "normalized",
    performanceBand: "normalized",
    resitSubjects: "never",
    resitEligibleSubjects: [
        "Mathematics",
        "English Language",
        "Chemistry",
        "Physics",
        "Literature in English",
        "Biology",
    ],
    focusSubjectPolicy: "lowestNormalized",
};

export default function AICommentSettings() {
    const { data: session } = useSession();
    const [settings, setSettings] = useState<AISettings | null>(null);
    const [subjectOptions, setSubjectOptions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchSubjectOptions();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch("/api/settings/ai");
            if (!response.ok) {
                throw new Error("Failed to fetch settings");
            }
            const data = await response.json();
            setSettings({
                teacherPrompt: data.teacherPrompt || "",
                principalPrompt: data.principalPrompt || "",
                useMultiAgentComments: data.useMultiAgentComments || false,
                commentConfig: data.commentConfig || defaultCommentConfig,
            });
        } catch (error) {
            console.error("Failed to load AI settings", error);
            toast.error("Failed to load comment settings");
        } finally {
            setLoading(false);
        }
    };

    const fetchSubjectOptions = async () => {
        try {
            const response = await fetch("/api/settings/ai/subject-options");
            if (!response.ok) {
                throw new Error("Failed to fetch subject options");
            }
            const data = await response.json();
            setSubjectOptions(data.subjects || []);
        } catch (error) {
            console.warn("Failed to load subject options", error);
            toast.error("Failed to load subject options");
        }
    };

    const saveSettings = async () => {
        if (!settings) return;

        setSaving(true);
        try {
            const response = await fetch("/api/settings/ai", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    teacherPrompt: settings.teacherPrompt,
                    principalPrompt: settings.principalPrompt,
                    useMultiAgentComments: settings.useMultiAgentComments,
                    commentConfig: settings.commentConfig,
                }),
            });

            if (response.ok) {
                setShowSuccess(true);
                showSuccessMessage("AI settings saved successfully!");
            } else {
                toast.error("Failed to save AI settings");
            }
        } catch (error) {
            toast.error("Error saving AI settings");
            console.error("Failed to save AI settings", error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="text-center py-8">
                <p className="text-gray-500">Failed to load AI settings</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Comment Settings</h1>
                <p className="text-gray-600">Configure how teacher and principal comments are generated for report cards.</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">AI System Configuration</h2>
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="useMultiAgent"
                            checked={settings.useMultiAgentComments}
                            onChange={(e) => setSettings({
                                ...settings,
                                useMultiAgentComments: e.target.checked,
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="useMultiAgent" className="ml-2 block text-sm">
                            <span className="text-gray-900 font-medium">Enable Multi-Agent AI System</span>
                            <span className="text-gray-500 block">
                                Use specialized AI agents for data collection, analysis, and validation instead of single-agent generation. Provides more accurate and validated comments.
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Comment Configuration</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Max score per subject</label>
                        <select
                            value={settings.commentConfig?.maxScorePerSubject || "dynamic"}
                            onChange={(e) => setSettings({
                                ...settings,
                                commentConfig: {
                                    ...(settings.commentConfig || defaultCommentConfig),
                                    maxScorePerSubject: e.target.value as any,
                                },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="dynamic">Dynamic (from assessment type settings)</option>
                            <option value="fixed100">100 (CA + Exam combined)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Score displayed</label>
                        <select
                            value={settings.commentConfig?.scoreDisplayed || "raw"}
                            onChange={(e) => setSettings({
                                ...settings,
                                commentConfig: {
                                    ...(settings.commentConfig || defaultCommentConfig),
                                    scoreDisplayed: e.target.value as any,
                                },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="raw">Raw score only</option>
                            <option value="rawOutOf100">Raw score out of 100</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Overall average</label>
                        <select
                            value={settings.commentConfig?.overallAverage || "normalized"}
                            onChange={(e) => setSettings({
                                ...settings,
                                commentConfig: {
                                    ...(settings.commentConfig || defaultCommentConfig),
                                    overallAverage: e.target.value as any,
                                },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="normalized">Sum of scores ÷ (subjects × max_score) × 100</option>
                            <option value="direct">Sum of scores ÷ number of subjects</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Performance band</label>
                        <select
                            value={settings.commentConfig?.performanceBand || "normalized"}
                            onChange={(e) => setSettings({
                                ...settings,
                                commentConfig: {
                                    ...(settings.commentConfig || defaultCommentConfig),
                                    performanceBand: e.target.value as any,
                                },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="normalized">Derived from normalised % average</option>
                            <option value="direct">Derived directly from average</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Resit subjects</label>
                        <select
                            value={settings.commentConfig?.resitSubjects || "never"}
                            onChange={(e) => setSettings({
                                ...settings,
                                commentConfig: {
                                    ...(settings.commentConfig || defaultCommentConfig),
                                    resitSubjects: e.target.value as any,
                                },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="never">Never</option>
                            <option value="thirdTermBelow50">3rd term only, score below 50</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Focus subject policy</label>
                        <select
                            value={settings.commentConfig?.focusSubjectPolicy || "lowestNormalized"}
                            onChange={(e) => setSettings({
                                ...settings,
                                commentConfig: {
                                    ...(settings.commentConfig || defaultCommentConfig),
                                    focusSubjectPolicy: e.target.value as any,
                                },
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="lowestNormalized">Lowest scoring subject (normalised)</option>
                            <option value="lowestRawNotResit">Lowest scoring subject (raw, not resit)</option>
                        </select>
                    </div>
                </div>
                <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Resit eligible subjects</label>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {(subjectOptions.length > 0 ? subjectOptions : settings.commentConfig?.resitEligibleSubjects || []).map((subject) => (
                            <label key={subject} className="flex items-center space-x-2 text-sm text-gray-700">
                                <input
                                    type="checkbox"
                                    checked={settings.commentConfig?.resitEligibleSubjects?.includes(subject) || false}
                                    onChange={(e) => {
                                        const current = settings.commentConfig?.resitEligibleSubjects || [];
                                        const updated = e.target.checked
                                            ? Array.from(new Set([...current, subject]))
                                            : current.filter((item) => item !== subject);
                                        setSettings({
                                            ...settings,
                                            commentConfig: {
                                                ...(settings.commentConfig || defaultCommentConfig),
                                                resitEligibleSubjects: updated,
                                            },
                                        });
                                    }}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                />
                                <span>{subject}</span>
                            </label>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                        Choose the subjects that are resit-eligible for end-of-term comments. This list is loaded from current school subjects.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Teacher Comment Template</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Prompt Template</label>
                        <textarea
                            value={settings.teacherPrompt}
                            onChange={(e) => setSettings({ ...settings, teacherPrompt: e.target.value })}
                            rows={8}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter the prompt template for teacher comments..."
                        />
                    </div>
                    <div className="bg-blue-50 p-4 rounded-md">
                        <h3 className="text-sm font-medium text-blue-900 mb-2">Available Placeholders:</h3>
                        <div className="text-sm text-blue-800 space-y-1">
                            <div><code className="bg-blue-100 px-1 rounded">{"{{name}}"}</code> - Student full name</div>
                            <div><code className="bg-blue-100 px-1 rounded">{"{{firstName}}"}</code> - Student first name</div>
                            <div><code className="bg-blue-100 px-1 rounded">{"{{lastName}}"}</code> - Student last name</div>
                            <div><code className="bg-blue-100 px-1 rounded">{"{{gender}}"}</code> - Student gender</div>
                            <div><code className="bg-blue-100 px-1 rounded">{"{{term}}"}</code> - Current term</div>
                            <div><code className="bg-blue-100 px-1 rounded">{"{{average}}"}</code> - Average score percentage</div>
                            <div><code className="bg-blue-100 px-1 rounded">{"{{position}}"}</code> - Class position</div>
                            <div><code className="bg-blue-100 px-1 rounded">{"{{attendance}}"}</code> - Attendance summary</div>
                            <div><code className="bg-blue-100 px-1 rounded">{"{{traits}}"}</code> - Behavioral traits</div>
                            <div><code className="bg-blue-100 px-1 rounded">{"{{behaviour}}"}</code> - Behavior ratings</div>
                            <div><code className="bg-blue-100 px-1 rounded">{"{{skills}}"}</code> - Skill ratings</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Principal Comment Template</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Prompt Template</label>
                        <textarea
                            value={settings.principalPrompt}
                            onChange={(e) => setSettings({ ...settings, principalPrompt: e.target.value })}
                            rows={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter the prompt template for principal comments..."
                        />
                    </div>
                    <div className="bg-green-50 p-4 rounded-md">
                        <h3 className="text-sm font-medium text-green-900 mb-2">Available Placeholders:</h3>
                        <div className="text-sm text-green-800 space-y-1">
                            <div><code className="bg-green-100 px-1 rounded">{"{{name}}"}</code> - Student full name</div>
                            <div><code className="bg-green-100 px-1 rounded">{"{{firstName}}"}</code> - Student first name</div>
                            <div><code className="bg-green-100 px-1 rounded">{"{{lastName}}"}</code> - Student last name</div>
                            <div><code className="bg-green-100 px-1 rounded">{"{{average}}"}</code> - Average score percentage</div>
                            <div><code className="bg-green-100 px-1 rounded">{"{{position}}"}</code> - Class position</div>
                            <div><code className="bg-green-100 px-1 rounded">{"{{attendance}}"}</code> - Attendance summary</div>
                            <div><code className="bg-green-100 px-1 rounded">{"{{traits}}"}</code> - Behavioral traits</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? "Saving..." : "Save Settings"}
                </button>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                title="Settings Saved"
                message="AI comment settings have been saved successfully."
            />
        </div>
    );
}
