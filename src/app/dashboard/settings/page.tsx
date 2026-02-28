"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

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
}

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("school");

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500 mt-1">Configure your school and system preferences</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    {[
                        { id: "school", label: "School Profile" },
                        { id: "academic", label: "Academic Settings" },
                        { id: "grading", label: "Grading System" },
                        { id: "notifications", label: "Notifications" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                ? "border-primary-500 text-primary-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === "school" && <SchoolProfileSettings />}
            {activeTab === "academic" && <AcademicSettings />}
            {activeTab === "grading" && <GradingSettings />}
            {activeTab === "notifications" && <NotificationSettings />}
        </div>
    );
}

function SchoolProfileSettings() {
    const [school, setSchool] = useState<SchoolData | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [logoBase64, setLogoBase64] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setSchool(data);
                setSuccess("School settings saved successfully!");
                setTimeout(() => setSuccess(""), 3000);
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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (500KB)
            if (file.size > 500 * 1024) {
                setError("File size must be less than 500KB");
                return;
            }

            // Create local preview
            const previewUrl = URL.createObjectURL(file);
            setLogoPreview(previewUrl);

            // Convert to base64 for saving to database
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setLogoBase64(base64);
                setSuccess("Logo selected. Click 'Save Changes' to apply.");
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
                            onChange={handleFileChange}
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

            <div className="flex justify-end pt-6 border-t border-gray-200">
                <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </form>
    );
}


function AcademicSettings() {
    return (
        <div className="card p-6 space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Session</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Academic Session *</label>
                        <select className="input w-full" defaultValue="2025/2026">
                            <option value="2025/2026">2025/2026</option>
                            <option value="2024/2025">2024/2025</option>
                            <option value="2023/2024">2023/2024</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Term *</label>
                        <select className="input w-full" defaultValue="first">
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
                    {["First Term", "Second Term", "Third Term"].map((term, index) => (
                        <div key={term} className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{term}</label>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                                <input type="date" className="input w-full" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                                <input type="date" className="input w-full" />
                            </div>
                        </div>
                    ))}
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
                <button className="btn-primary">Save Changes</button>
            </div>
        </div>
    );
}

function GradingSettings() {
    // Assessment Types State
    const [assessmentTypes, setAssessmentTypes] = useState<any[]>([]);
    const [newAssessment, setNewAssessment] = useState({ name: "", maxScore: "" });
    const [editingAssessment, setEditingAssessment] = useState<string | null>(null);

    // Grading Rules State
    const [gradingRules, setGradingRules] = useState<any[]>([]);
    const [newGrade, setNewGrade] = useState({ grade: "", minScore: "", maxScore: "", remark: "" });
    const [editingGrade, setEditingGrade] = useState<string | null>(null);

    // Loading and Error States
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Fetch data on mount
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [assessmentsRes, gradesRes] = await Promise.all([
                fetch("/api/assessment-types"),
                fetch("/api/grading-rules")
            ]);

            if (assessmentsRes.ok) {
                const data = await assessmentsRes.json();
                setAssessmentTypes(data);
            }

            if (gradesRes.ok) {
                const data = await gradesRes.json();
                setGradingRules(data);
            }
        } catch (err) {
            setError("Failed to load grading settings");
        } finally {
            setLoading(false);
        }
    };

    // Calculate total points
    const totalPoints = assessmentTypes.reduce((sum, a) => sum + (a.maxScore || 0), 0);

    // Assessment Type CRUD
    const addAssessmentType = async () => {
        if (!newAssessment.name || !newAssessment.maxScore) {
            setError("Please enter name and max score");
            return;
        }
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
                setSuccess("Assessment type added!");
                setTimeout(() => setSuccess(""), 2000);
            } else {
                const err = await res.json();
                setError(err.error || "Failed to add");
            }
        } catch (err) {
            setError("Failed to add assessment type");
        } finally {
            setSaving(false);
        }
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
                setSuccess("Updated!");
                setTimeout(() => setSuccess(""), 2000);
            }
        } catch (err) {
            setError("Failed to update");
        } finally {
            setSaving(false);
        }
    };

    const deleteAssessmentType = async (id: string) => {
        if (!confirm("Delete this assessment type?")) return;
        try {
            const res = await fetch(`/api/assessment-types?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setAssessmentTypes(assessmentTypes.filter(a => a.id !== id));
                setSuccess("Deleted!");
                setTimeout(() => setSuccess(""), 2000);
            }
        } catch (err) {
            setError("Failed to delete");
        }
    };

    // Grading Rule CRUD
    const addGradingRule = async () => {
        if (!newGrade.grade || !newGrade.minScore || !newGrade.maxScore || !newGrade.remark) {
            setError("Please fill all grade fields");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/grading-rules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newGrade),
            });
            if (res.ok) {
                const data = await res.json();
                setGradingRules([...gradingRules, data].sort((a, b) => b.minScore - a.minScore));
                setNewGrade({ grade: "", minScore: "", maxScore: "", remark: "" });
                setSuccess("Grading rule added!");
                setTimeout(() => setSuccess(""), 2000);
            } else {
                const err = await res.json();
                setError(err.error || "Failed to add");
            }
        } catch (err) {
            setError("Failed to add grading rule");
        } finally {
            setSaving(false);
        }
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
                setSuccess("Updated!");
                setTimeout(() => setSuccess(""), 2000);
            }
        } catch (err) {
            setError("Failed to update");
        } finally {
            setSaving(false);
        }
    };

    const deleteGradingRule = async (id: string) => {
        if (!confirm("Delete this grading rule?")) return;
        try {
            const res = await fetch(`/api/grading-rules?id=${id}`, { method: "DELETE" });
            if (res.ok) {
                setGradingRules(gradingRules.filter(g => g.id !== id));
                setSuccess("Deleted!");
                setTimeout(() => setSuccess(""), 2000);
            }
        } catch (err) {
            setError("Failed to delete");
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
            {/* Status Messages */}
            {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                    <span>{error}</span>
                    <button onClick={() => setError("")} className="text-red-500">&times;</button>
                </div>
            )}
            {success && (
                <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg">
                    {success}
                </div>
            )}

            {/* Assessment Types Section */}
            <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Score Components</h3>
                    <span className="text-sm text-gray-500">
                        Total: <span className={`font-bold ${totalPoints === 100 ? 'text-green-600' : 'text-orange-500'}`}>{totalPoints}</span>/100 points
                    </span>
                </div>

                {/* Existing Assessment Types */}
                <div className="space-y-3 mb-4">
                    {assessmentTypes.map((assessment) => (
                        <div key={assessment.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            {editingAssessment === assessment.id ? (
                                <>
                                    <input
                                        type="text"
                                        className="input flex-1"
                                        defaultValue={assessment.name}
                                        id={`edit-name-${assessment.id}`}
                                    />
                                    <input
                                        type="number"
                                        className="input w-24"
                                        defaultValue={assessment.maxScore}
                                        id={`edit-score-${assessment.id}`}
                                    />
                                    <button
                                        onClick={() => {
                                            const name = (document.getElementById(`edit-name-${assessment.id}`) as HTMLInputElement).value;
                                            const maxScore = (document.getElementById(`edit-score-${assessment.id}`) as HTMLInputElement).value;
                                            updateAssessmentType(assessment.id, { name, maxScore });
                                        }}
                                        className="btn-primary text-sm px-3 py-1"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => setEditingAssessment(null)}
                                        className="btn-secondary text-sm px-3 py-1"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <>
                                    <span className="flex-1 font-medium">{assessment.name}</span>
                                    <span className="text-gray-600 w-24 text-center">{assessment.maxScore} pts</span>
                                    <button
                                        onClick={() => setEditingAssessment(assessment.id)}
                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => deleteAssessmentType(assessment.id)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                        Delete
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add New Assessment Type */}
                <div className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-lg">
                    <input
                        type="text"
                        placeholder="e.g., CA1, Exam, Project"
                        className="input flex-1"
                        value={newAssessment.name}
                        onChange={(e) => setNewAssessment({ ...newAssessment, name: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder="Max Score"
                        className="input w-28"
                        value={newAssessment.maxScore}
                        onChange={(e) => setNewAssessment({ ...newAssessment, maxScore: e.target.value })}
                    />
                    <button
                        onClick={addAssessmentType}
                        disabled={saving}
                        className="btn-primary text-sm px-4"
                    >
                        + Add
                    </button>
                </div>
            </div>

            {/* Grading Scale Section */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Grading Scale</h3>

                {/* Existing Grading Rules Table */}
                <div className="overflow-x-auto mb-4">
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
                            {gradingRules.map((rule) => (
                                <tr key={rule.id}>
                                    {editingGrade === rule.id ? (
                                        <>
                                            <td className="px-4 py-2">
                                                <input type="text" className="input w-16" defaultValue={rule.grade} id={`edit-grade-${rule.id}`} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="number" className="input w-20" defaultValue={rule.minScore} id={`edit-min-${rule.id}`} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="number" className="input w-20" defaultValue={rule.maxScore} id={`edit-max-${rule.id}`} />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="text" className="input w-28" defaultValue={rule.remark} id={`edit-remark-${rule.id}`} />
                                            </td>
                                            <td className="px-4 py-2 space-x-2">
                                                <button
                                                    onClick={() => {
                                                        updateGradingRule(rule.id, {
                                                            grade: (document.getElementById(`edit-grade-${rule.id}`) as HTMLInputElement).value,
                                                            minScore: (document.getElementById(`edit-min-${rule.id}`) as HTMLInputElement).value,
                                                            maxScore: (document.getElementById(`edit-max-${rule.id}`) as HTMLInputElement).value,
                                                            remark: (document.getElementById(`edit-remark-${rule.id}`) as HTMLInputElement).value,
                                                        });
                                                    }}
                                                    className="text-green-600 hover:text-green-800 text-sm"
                                                >
                                                    Save
                                                </button>
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
                    <input
                        type="text"
                        placeholder="Grade (e.g., A1)"
                        className="input w-24"
                        value={newGrade.grade}
                        onChange={(e) => setNewGrade({ ...newGrade, grade: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder="Min"
                        className="input w-20"
                        value={newGrade.minScore}
                        onChange={(e) => setNewGrade({ ...newGrade, minScore: e.target.value })}
                    />
                    <input
                        type="number"
                        placeholder="Max"
                        className="input w-20"
                        value={newGrade.maxScore}
                        onChange={(e) => setNewGrade({ ...newGrade, maxScore: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Remark (e.g., Excellent)"
                        className="input flex-1"
                        value={newGrade.remark}
                        onChange={(e) => setNewGrade({ ...newGrade, remark: e.target.value })}
                    />
                    <button
                        onClick={addGradingRule}
                        disabled={saving}
                        className="btn-primary text-sm px-4"
                    >
                        + Add
                    </button>
                </div>
            </div>

            {/* Save Button */}
            <div className="card p-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                    All changes are saved automatically when you add, edit, or delete items.
                </p>
                <button
                    onClick={() => {
                        setSuccess("All settings saved successfully!");
                        setTimeout(() => setSuccess(""), 3000);
                    }}
                    className="btn-primary"
                >
                    Save All Changes
                </button>
            </div>
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
                        <input type="text" className="input w-full" defaultValue="EduCare" maxLength={11} />
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
