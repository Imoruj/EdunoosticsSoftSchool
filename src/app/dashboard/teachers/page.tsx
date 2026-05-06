"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    downloadLoginCredentialsCsv,
    printLoginCredentials,
    type LoginCredentialExportPayload,
} from "@/lib/loginCredentialExport";

interface SubjectAssignment {
    subjectId: string;
    classArmId: string;
    subjectName?: string;
    className?: string;
    classArmName?: string;
}

interface Branch {
    id: string;
    name: string;
    branchCode: string | null;
    isHeadBranch: boolean;
}

interface Teacher {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    roles: string[];
    isActive: boolean;
    assignedClass: string | null;
    subjects: string[];
    classArmIds: string[];
    subjectIds: string[];
    subjectAssignments: SubjectAssignment[];
    canSwitchBranches: boolean;
    branchCount: number;
}

const roleLabels: Record<string, { label: string; color: string }> = {
    CLASS_TEACHER: { label: "Class Teacher", color: "bg-blue-100 text-blue-800" },
    SUBJECT_TEACHER: { label: "Subject Teacher", color: "bg-indigo-100 text-indigo-800" },
    SCHOOL_ADMIN: { label: "Admin", color: "bg-green-100 text-green-800" },
    PROPRIETOR: { label: "Proprietor", color: "bg-amber-100 text-amber-800" },
};

export default function TeachersPage() {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedRole, setSelectedRole] = useState("All");

    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<{
        classes: { id: string; name: string; classTeacherId?: string | null; classId: string }[];
        subjects: { id: string; name: string }[];
        subjectAssignments: {
            teacherId: string;
            teacherName: string;
            subjectId: string;
            classArmId: string;
            subjectName: string;
            className: string;
            classArmName: string;
        }[];
        subjectClassArms: { classArmId: string; subjectId: string }[];
    }>({ classes: [], subjects: [], subjectAssignments: [], subjectClassArms: [] });

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        roles: [] as string[],
        classArmIds: [] as string[],
    });
    const [bulkSubjectIds, setBulkSubjectIds] = useState<string[]>([]);
    const [bulkSubjectClassArmIds, setBulkSubjectClassArmIds] = useState<string[]>([]);

    const [importDryRun, setImportDryRun] = useState(false);
    const [createLoginAccounts, setCreateLoginAccounts] = useState(true);
    // New state for individual subject-class pairs
    const [currentSubject, setCurrentSubject] = useState<string>("");
    const [currentClassArms, setCurrentClassArms] = useState<string[]>([]);
    const [savedSubjectPairs, setSavedSubjectPairs] = useState<SubjectAssignment[]>([]);
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
    const [pendingSubjectChange, setPendingSubjectChange] = useState<string>("");
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [resettingUserId, setResettingUserId] = useState<string | null>(null);
    const [passwordResetTarget, setPasswordResetTarget] = useState<Teacher | null>(null);
    const [credentialAction, setCredentialAction] = useState<"download" | "print" | null>(null);
    const [importResults, setImportResults] = useState<{
        success: number;
        failed: number;
        errors: string[];
        dryRun?: boolean;
    } | null>(null);

    // Branch management modal
    const [branchModalTeacher, setBranchModalTeacher] = useState<Teacher | null>(null);
    const [branchModalData, setBranchModalData] = useState<{
        canSwitchBranches: boolean;
        assignedBranchIds: string[];
        availableBranches: Branch[];
        duplicateAccounts: { id: string; firstName: string; lastName: string; email: string; schoolId: string; school: { name: string; branchCode: string | null } }[];
    } | null>(null);
    const [branchModalLoading, setBranchModalLoading] = useState(false);
    const [branchModalSaving, setBranchModalSaving] = useState(false);
    const [adoptingCredential, setAdoptingCredential] = useState(false);
    const [adoptConfirmOpen, setAdoptConfirmOpen] = useState(false);
    const [selectedDuplicateIds, setSelectedDuplicateIds] = useState<string[]>([]);

    const openBranchModal = async (teacher: Teacher, forceEnableSwitch?: boolean) => {
        setBranchModalTeacher(teacher);
        setBranchModalData(null);
        setBranchModalLoading(true);
        setAdoptConfirmOpen(false);
        setSelectedDuplicateIds([]);
        try {
            const res = await fetch(`/api/teachers/${teacher.id}/branches`);
            if (res.ok) {
                const data = await res.json();
                setBranchModalData({
                    ...data,
                    // If opened via toggle-ON, force the switch ON so it's clear what will be saved
                    canSwitchBranches: forceEnableSwitch ? true : (data.canSwitchBranches ?? true),
                    duplicateAccounts: data.duplicateAccounts ?? [],
                });
                setSelectedDuplicateIds((data.duplicateAccounts ?? []).map((d: any) => d.id));
            }
        } catch {}
        setBranchModalLoading(false);
    };

    const adoptCredential = async () => {
        if (!branchModalTeacher || selectedDuplicateIds.length === 0) return;
        setAdoptingCredential(true);
        try {
            const res = await fetch(`/api/teachers/${branchModalTeacher.id}/branches`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "adopt-credential", duplicateUserIds: selectedDuplicateIds }),
            });
            if (res.ok) {
                const result = await res.json();
                // Remove adopted duplicates from the list + enable switching
                setBranchModalData((prev) => prev ? {
                    ...prev,
                    canSwitchBranches: true,
                    duplicateAccounts: prev.duplicateAccounts.filter((d) => !selectedDuplicateIds.includes(d.id)),
                } : prev);
                setTeachers((prev) => prev.map((t) =>
                    t.id === branchModalTeacher.id ? { ...t, canSwitchBranches: true } : t
                ));
                setAdoptConfirmOpen(false);
                setSelectedDuplicateIds([]);
                // Refresh modal data to get updated branch list
                const refresh = await fetch(`/api/teachers/${branchModalTeacher.id}/branches`);
                if (refresh.ok) {
                    const data = await refresh.json();
                    setBranchModalData({ ...data, duplicateAccounts: data.duplicateAccounts ?? [] });
                    setTeachers((prev) => prev.map((t) =>
                        t.id === branchModalTeacher.id ? { ...t, branchCount: (data.assignedBranchIds ?? []).length } : t
                    ));
                }
            }
        } catch {}
        setAdoptingCredential(false);
    };

    const saveBranchModal = async () => {
        if (!branchModalTeacher || !branchModalData) return;
        setBranchModalSaving(true);
        try {
            const res = await fetch(`/api/teachers/${branchModalTeacher.id}/branches`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    assignedBranchIds: branchModalData.assignedBranchIds,
                    canSwitchBranches: branchModalData.canSwitchBranches,
                }),
            });
            if (res.ok) {
                setTeachers((prev) =>
                    prev.map((t) =>
                        t.id === branchModalTeacher.id
                            ? { ...t, canSwitchBranches: branchModalData.canSwitchBranches, branchCount: branchModalData.assignedBranchIds.length }
                            : t
                    )
                );
                setBranchModalTeacher(null);
                setBranchModalData(null);
            }
        } catch {}
        setBranchModalSaving(false);
    };

    const toggleCanSwitch = async (teacher: Teacher) => {
        const newValue = !teacher.canSwitchBranches;
        if (newValue) {
            // Turning ON → open the branch modal so the admin selects which branches to grant
            openBranchModal(teacher, true);
            return;
        }
        // Turning OFF → directly disable, no modal needed
        setTeachers((prev) => prev.map((t) => t.id === teacher.id ? { ...t, canSwitchBranches: false } : t));
        try {
            const res = await fetch(`/api/teachers/${teacher.id}/branches`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assignedBranchIds: null, canSwitchBranches: false, toggleOnly: true }),
            });
            if (!res.ok) {
                setTeachers((prev) => prev.map((t) => t.id === teacher.id ? { ...t, canSwitchBranches: true } : t));
            }
        } catch {
            setTeachers((prev) => prev.map((t) => t.id === teacher.id ? { ...t, canSwitchBranches: true } : t));
        }
    };

    const toggleBranchId = (branchId: string) => {
        if (!branchModalData) return;
        const exists = branchModalData.assignedBranchIds.includes(branchId);
        setBranchModalData({
            ...branchModalData,
            assignedBranchIds: exists
                ? branchModalData.assignedBranchIds.filter((id) => id !== branchId)
                : [...branchModalData.assignedBranchIds, branchId],
        });
    };

    useEffect(() => {
        if (editingTeacher) {
            setFormData({
                firstName: editingTeacher.firstName,
                lastName: editingTeacher.lastName,
                email: editingTeacher.email,
                phone: editingTeacher.phone || "",
                roles: editingTeacher.roles,
                classArmIds: editingTeacher.classArmIds || [],
            });
            setSavedSubjectPairs(editingTeacher.subjectAssignments || []);
            setCurrentSubject("");
            setCurrentClassArms([]);
            setShowAddModal(true);
        } else {
            setFormData({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                roles: [],
                classArmIds: [],
            });
            setSavedSubjectPairs([]);
            setCurrentSubject("");
            setCurrentClassArms([]);
        }
    }, [editingTeacher]);

    const fetchTeachers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/teachers");
            if (!response.ok) throw new Error("Failed to fetch staff");
            const data = await response.json();
            setTeachers(data.teachers || []);
            setMetadata(data.metadata || { classes: [], subjects: [], subjectAssignments: [], subjectClassArms: [] });
            setError(null);
        } catch (err: any) {
            setError(err.message || "Failed to load teachers");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTeachers();
    }, [fetchTeachers]);

    // Auto-deselect class arms that are no longer in the filtered list
    useEffect(() => {
        if (bulkSubjectIds.length > 0) {
            const filteredClassArmIds = new Set(
                metadata.classes
                    .filter((cls) =>
                        bulkSubjectIds.some((subjectId) =>
                            metadata.subjectClassArms.some(
                                (sca) => sca.classArmId === cls.id && sca.subjectId === subjectId
                            )
                        )
                    )
                    .map((cls) => cls.id)
            );

            setBulkSubjectClassArmIds((prev) =>
                prev.filter((classArmId) => filteredClassArmIds.has(classArmId))
            );
        }
    }, [bulkSubjectIds, metadata.classes, metadata.subjectClassArms]);

    const filteredTeachers = teachers.filter((teacher) => {
        const matchesSearch =
            teacher.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            teacher.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            teacher.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = selectedRole === "All" || teacher.roles.includes(selectedRole);
        return matchesSearch && matchesRole;
    });

    // Stats
    const totalTeachers = teachers.length;
    const activeTeachers = teachers.filter(t => t.isActive).length;
    const classTeachersCount = teachers.filter(t => t.roles.includes("CLASS_TEACHER")).length;
    const executiveCount = teachers.filter(t => t.roles.includes("SCHOOL_ADMIN") || t.roles.includes("PROPRIETOR")).length;

    const handleToggleStatus = async (teacherId: string, currentStatus: boolean) => {
        try {
            const response = await fetch(`/api/teachers/${teacherId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus }),
            });
            if (!response.ok) throw new Error("Failed to update status");

            // Optimistic update
            setTeachers(prev => prev.map(t => t.id === teacherId ? { ...t, isActive: !currentStatus } : t));
            setSuccessMessage(`Staff member ${!currentStatus ? "activated" : "deactivated"} successfully`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to toggle status");
        }
    };

    const handleResetPassword = async () => {
        if (!passwordResetTarget) return;

        const teacher = passwordResetTarget;
        setResettingUserId(teacher.id);
        setError(null);

        try {
            const response = await fetch("/api/users/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: teacher.id }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to reset password");
            }

            setSuccessMessage(`${teacher.firstName} ${teacher.lastName}'s password was reset to 1234.`);
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to reset password";
            setError(message);
        } finally {
            setResettingUserId(null);
            setPasswordResetTarget(null);
        }
    };

    // Handle subject change with unsaved warning
    const handleSubjectChange = (newSubjectId: string) => {
        if (currentSubject && currentClassArms.length > 0 && newSubjectId !== currentSubject) {
            // Show warning - there are unsaved selections
            setPendingSubjectChange(newSubjectId);
            setShowUnsavedWarning(true);
        } else {
            // Safe to switch
            setCurrentSubject(newSubjectId);
            setCurrentClassArms([]);
        }
    };

    // Confirm subject switch and lose unsaved selections
    const confirmSubjectSwitch = () => {
        setCurrentSubject(pendingSubjectChange);
        setCurrentClassArms([]);
        setShowUnsavedWarning(false);
        setPendingSubjectChange("");
    };

    // Cancel subject switch
    const cancelSubjectSwitch = () => {
        setShowUnsavedWarning(false);
        setPendingSubjectChange("");
    };

    // Save current subject-class selections
    const saveCurrentSubjectPairs = () => {
        if (!currentSubject || currentClassArms.length === 0) return;

        const newPairs: SubjectAssignment[] = currentClassArms.map(classArmId => ({
            subjectId: currentSubject,
            classArmId,
        }));

        // Remove old pairs for this subject, then add new ones
        setSavedSubjectPairs(prev => [
            ...prev.filter(p => p.subjectId !== currentSubject),
            ...newPairs
        ]);

        // Clear current selection
        setCurrentClassArms([]);

        // Show success feedback
        const subjectName = metadata.subjects.find(s => s.id === currentSubject)?.name || '';
        setSuccessMessage(`Saved ${currentClassArms.length} class(es) for ${subjectName}`);
        setTimeout(() => setSuccessMessage(null), 2000);
    };

    // Remove a saved subject-class pair
    const removeSavedPair = (subjectId: string, classArmId: string) => {
        setSavedSubjectPairs(prev =>
            prev.filter(p => !(p.subjectId === subjectId && p.classArmId === classArmId))
        );
    };

    // Remove all pairs for a subject
    const removeSubjectPairs = (subjectId: string) => {
        setSavedSubjectPairs(prev => prev.filter(p => p.subjectId !== subjectId));
    };

    // Toggle class arm in current selection
    const toggleCurrentClassArm = (classArmId: string) => {
        setCurrentClassArms(prev =>
            prev.includes(classArmId)
                ? prev.filter(id => id !== classArmId)
                : [...prev, classArmId]
        );
    };

    // Filter class arms based on current subject
    const availableClassArms = metadata.classes.filter((cls) => {
        if (!currentSubject) return false;
        return metadata.subjectClassArms.some(
            (sca) => sca.classArmId === cls.id && sca.subjectId === currentSubject
        );
    });

    // Get subjects that have saved pairs
    const subjectsWithPairs = Array.from(new Set(savedSubjectPairs.map(p => p.subjectId)));

    // Check for conflicts with other teachers
    const assignmentConflicts = savedSubjectPairs
        .map(assignment => {
            const existing = metadata.subjectAssignments.find(item =>
                item.subjectId === assignment.subjectId &&
                item.classArmId === assignment.classArmId &&
                (!editingTeacher || item.teacherId !== editingTeacher.id)
            );
            return existing || null;
        })
        .filter(Boolean);

    const hasInvalidSubjectAssignmentState =
        formData.roles.includes("SUBJECT_TEACHER") &&
        (savedSubjectPairs.length === 0 || assignmentConflicts.length > 0);

    const handleAddTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (hasInvalidSubjectAssignmentState) {
            setError("Resolve subject assignment errors before saving.");
            return;
        }
        setIsSaving(true);
        setError(null);

        try {
            const url = editingTeacher ? `/api/teachers/${editingTeacher.id}` : "/api/teachers";
            const method = editingTeacher ? "PATCH" : "POST";
            const payload = {
                ...formData,
                subjectAssignments: savedSubjectPairs,
                subjectIds: Array.from(new Set(savedSubjectPairs.map(assignment => assignment.subjectId))),
                subjectClassArmIds: Array.from(new Set(savedSubjectPairs.map(assignment => assignment.classArmId))),
            };

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to save staff member");

            setSuccessMessage(data.message || `Staff member ${editingTeacher ? "updated" : "added"} successfully`);
            setShowAddModal(false);
            setEditingTeacher(null);
            fetchTeachers(); // Refresh list
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    const downloadCSVTemplate = () => {
        const headers = [
            "First Name",
            "Last Name",
            "Email",
            "Phone",
            "Roles (semicolon-separated)",
        ];

        const sampleRow = [
            "John",
            "Doe",
            "john.doe@school.com",
            "08012345678",
            "PROPRIETOR",
        ];

        const instructionRow = [
            "Required",
            "Required",
            "Required (must be unique)",
            "Optional",
            "Required: PROPRIETOR, SUBJECT_TEACHER, CLASS_TEACHER, or SCHOOL_ADMIN (semicolon-separated for multiple)",
        ];

        const csvContent = [
            headers.join(","),
            instructionRow.join(","),
            sampleRow.join(","),
            // Empty rows for users to fill
            new Array(headers.length).fill("").join(","),
            new Array(headers.length).fill("").join(","),
            new Array(headers.length).fill("").join(","),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "staff_import_template.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportCSV = async () => {
        if (!importFile) {
            setError("Please select a CSV file");
            return;
        }

        setImporting(true);
        setError(null);
        setImportResults(null);

        try {
            const formData = new FormData();
            formData.append("file", importFile);
            formData.append("dryRun", String(importDryRun));
            formData.append("createLoginAccounts", String(createLoginAccounts));

            const response = await fetch("/api/teachers/import", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to import staff");
            }

            setImportResults(result);
            setImportFile(null);

            // Refresh the teachers list
            if (result.success > 0) {
                fetchTeachers();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setImporting(false);
        }
    };

    const handleTeacherCredentialAction = async (action: "download" | "print") => {
        setCredentialAction(action);
        setError(null);

        try {
            const response = await fetch("/api/teachers/login-credentials");
            const payload = await response.json() as LoginCredentialExportPayload & { error?: string };

            if (!response.ok) {
                throw new Error(payload.error || "Failed to fetch staff login credentials");
            }

            if (action === "download") {
                const timestamp = new Date().toISOString().split("T")[0];
                downloadLoginCredentialsCsv(payload, `staff_login_credentials_${timestamp}.csv`);
                setSuccessMessage("Staff login credentials downloaded.");
                setTimeout(() => setSuccessMessage(null), 3000);
            } else {
                printLoginCredentials(payload);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to fetch staff login credentials";
            setError(message);
        } finally {
            setCredentialAction(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff</h1>
                    <p className="text-slate-500 mt-1 font-medium">Manage teachers, executives, and school-level staff accounts</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button
                        variant="secondary"
                        onClick={downloadCSVTemplate}
                        title="Download CSV template for bulk staff upload"
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Template
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setShowImportModal(true)}
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import CSV
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => handleTeacherCredentialAction("download")}
                        disabled={credentialAction !== null}
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {credentialAction === "download" ? "Preparing..." : "Download Login IDs"}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => handleTeacherCredentialAction("print")}
                        disabled={credentialAction !== null}
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V4h12v5M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v6H6v-6z" />
                        </svg>
                        {credentialAction === "print" ? "Preparing..." : "Print Login IDs"}
                    </Button>
                    <Button
                        onClick={() => setShowAddModal(true)}
                    >
                        <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Staff
                    </Button>
                </div>
            </div>

            {/* Error / Success Messages */}
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}
            {successMessage && (
                <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium">{successMessage}</p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center border border-primary-100/50">
                            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 leading-none">{totalTeachers}</p>
                            <p className="text-sm font-medium text-slate-500 mt-1">Total Staff</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100/50">
                            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 leading-none">{classTeachersCount}</p>
                            <p className="text-sm font-medium text-slate-500 mt-1">Class Teachers</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100/50">
                            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 leading-none">{executiveCount}</p>
                            <p className="text-sm font-medium text-slate-500 mt-1">Executives</p>
                        </div>
                    </div>
                </Card>
                <Card className="p-4 border-slate-200/60 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100/50">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 leading-none">{activeTeachers}</p>
                            <p className="text-sm font-medium text-slate-500 mt-1">Active Staff</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4 border-slate-200/60 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Input
                            placeholder="Search staff..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10"
                        />
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {/* Role Filter */}
                    <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="flex h-10 w-full md:w-48 items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="All">All Roles</option>
                        {Object.entries(roleLabels).map(([key, { label }]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
            </Card>

            {/* Teachers Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Loading staff...</p>
                </div>
            ) : filteredTeachers.length === 0 ? (
                <Card className="text-center py-16 border-dashed border-2 border-slate-200 bg-slate-50/50 rounded-2xl">
                    <div className="max-w-xs mx-auto">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">No staff found</h3>
                        <p className="text-slate-500 mt-1">Try adjusting your search or filters to find what you're looking for.</p>
                        <Button
                            variant="primary"
                            className="mt-6"
                            onClick={() => {
                                setSearchQuery("");
                                setSelectedRole("All");
                            }}
                        >
                            Clear all filters
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeachers.map((teacher) => (
                        <Card key={teacher.id} className="group p-5 hover:shadow-xl transition-all duration-300 border-slate-200/60 overflow-hidden relative rounded-2xl">
                            {/* Status Indicator */}
                            <div className={`absolute top-0 left-0 w-1.5 h-full ${teacher.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />

                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-primary-100/50 bg-gradient-to-br from-primary-50 to-primary-100/30 transition-transform duration-300 group-hover:scale-110">
                                        <span className="text-primary-700 font-bold text-lg uppercase">
                                            {teacher.firstName[0]}{teacher.lastName[0]}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-slate-900 leading-tight truncate">
                                            {teacher.firstName} {teacher.lastName}
                                        </h3>
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {teacher.roles.map((role) => (
                                                <span key={role} className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${roleLabels[role]?.color || "bg-slate-100 text-slate-800"}`}>
                                                    {roleLabels[role]?.label || role}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openBranchModal(teacher)}
                                        className="p-2 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-xl transition-all"
                                        title="Manage Branch Access"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setEditingTeacher(teacher)}
                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                        title="Edit Staff Member"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setPasswordResetTarget(teacher)}
                                        disabled={resettingUserId === teacher.id}
                                        className="p-2 rounded-xl transition-all text-amber-500 hover:text-amber-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Reset Password"
                                    >
                                        {resettingUserId === teacher.id ? (
                                            <div className="w-5 h-5 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11V7a4 4 0 118 0v4m-8 0h8m-8 0H8a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2" />
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(teacher.id, teacher.isActive)}
                                        className={`p-2 rounded-xl transition-all ${teacher.isActive ? 'text-red-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                                        title={teacher.isActive ? "Deactivate Staff Member" : "Activate Staff Member"}
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            {teacher.isActive ? (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            ) : (
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            )}
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <span className="truncate flex-1 font-medium">{teacher.email}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                        </svg>
                                    </div>
                                    <span className="font-medium">{teacher.phone || "No phone added"}</span>
                                </div>

                                {teacher.assignedClass && (
                                    <div className="flex items-center gap-3 text-sm text-slate-500">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        <span className="font-medium">Class Teacher: <span className="text-primary-600">{teacher.assignedClass}</span></span>
                                    </div>
                                )}

                                {/* Branch access row */}
                                <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                                        </svg>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-700 leading-tight">Branch switching</p>
                                            <p className="text-[10px] text-slate-400 leading-tight">{teacher.branchCount > 1 ? `${teacher.branchCount} branches` : "1 branch"}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleCanSwitch(teacher)}
                                        title={teacher.canSwitchBranches ? "Disable branch switching" : "Enable branch switching"}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${teacher.canSwitchBranches ? "bg-violet-600" : "bg-slate-300"}`}
                                    >
                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${teacher.canSwitchBranches ? "translate-x-4" : "translate-x-0"}`} />
                                    </button>
                                </div>

                                <div className="pt-3 border-t border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block">Subjects & Classes</span>
                                    {(teacher.subjectAssignments || []).length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">No subjects assigned</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {Object.entries(
                                                (teacher.subjectAssignments || []).reduce<Record<string, { className?: string; armName?: string }[]>>((acc, a) => {
                                                    const name = a.subjectName || 'Unknown';
                                                    if (!acc[name]) acc[name] = [];
                                                    acc[name].push({ className: a.className, armName: a.classArmName });
                                                    return acc;
                                                }, {})
                                            ).map(([subject, classEntries]) => (
                                                <div key={subject} className="flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary-400 mt-[6px] shrink-0" />
                                                    <div className="min-w-0">
                                                        <span className="text-xs font-semibold text-slate-700 leading-tight">{subject}</span>
                                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                                            {classEntries.map((entry, i) => {
                                                                const armShort = entry.armName ? entry.armName.slice(0, 3) : '';
                                                                const label = entry.className
                                                                    ? `${entry.className}${armShort}`
                                                                    : entry.armName || '—';
                                                                return (
                                                                    <span key={i} className="inline-flex items-center px-1.5 py-px rounded bg-primary-50 text-primary-700 text-[10px] font-medium border border-primary-100/60">
                                                                        {label}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Branch Management Modal */}
            {branchModalTeacher && (
                <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => { setBranchModalTeacher(null); setBranchModalData(null); }} />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col border-none animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Branch Access</h3>
                                <p className="text-sm text-slate-500">{branchModalTeacher.firstName} {branchModalTeacher.lastName}</p>
                            </div>
                            <button onClick={() => { setBranchModalTeacher(null); setBranchModalData(null); }} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
                            {branchModalLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
                                </div>
                            ) : !branchModalData ? (
                                <p className="text-sm text-slate-500 text-center py-4">Failed to load branch data.</p>
                            ) : (
                                <>
                                    {/* Branch Switching Toggle */}
                                    <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">Branch Switching</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Allow this staff member to switch between branches</p>
                                        </div>
                                        <button
                                            onClick={() => setBranchModalData({ ...branchModalData, canSwitchBranches: !branchModalData.canSwitchBranches })}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${branchModalData.canSwitchBranches ? "bg-violet-600" : "bg-slate-300"}`}
                                        >
                                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${branchModalData.canSwitchBranches ? "translate-x-5" : "translate-x-0"}`} />
                                        </button>
                                    </div>

                                    {/* Single Login Credential */}
                                    {branchModalData.duplicateAccounts.length === 0 ? (
                                        <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 flex items-start gap-3">
                                            <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div>
                                                <p className="text-sm font-semibold text-emerald-800">Single Login Credential Active</p>
                                                <p className="text-xs text-emerald-700 mt-0.5">No duplicate accounts found. This staff member uses one set of credentials across all assigned branches.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="rounded-2xl border border-amber-300 bg-amber-50 overflow-hidden">
                                            <div className="flex items-start gap-3 p-4">
                                                <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                                <div className="flex-1">
                                                    <p className="text-sm font-semibold text-amber-800">Duplicate Accounts Detected</p>
                                                    <p className="text-xs text-amber-700 mt-0.5">{branchModalData.duplicateAccounts.length} separate account{branchModalData.duplicateAccounts.length > 1 ? "s" : ""} found with the same email in other branches. Adopt single credential to merge access and disable the duplicates.</p>
                                                </div>
                                            </div>
                                            <div className="border-t border-amber-200 divide-y divide-amber-100">
                                                {branchModalData.duplicateAccounts.map((dup) => (
                                                    <label key={dup.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-amber-100/50 transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedDuplicateIds.includes(dup.id)}
                                                            onChange={(e) => setSelectedDuplicateIds((prev) =>
                                                                e.target.checked ? [...prev, dup.id] : prev.filter((x) => x !== dup.id)
                                                            )}
                                                            className="w-4 h-4 text-amber-600 rounded border-amber-300"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-semibold text-slate-800">{dup.school?.name ?? dup.schoolId}</p>
                                                            <p className="text-[10px] text-slate-500">{dup.email}</p>
                                                        </div>
                                                        {dup.school?.branchCode && (
                                                            <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded shrink-0">{dup.school.branchCode}</span>
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                            {!adoptConfirmOpen ? (
                                                <div className="p-3 border-t border-amber-200">
                                                    <button
                                                        onClick={() => setAdoptConfirmOpen(true)}
                                                        disabled={selectedDuplicateIds.length === 0}
                                                        className="w-full py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl transition-all"
                                                    >
                                                        Adopt Single Credential ({selectedDuplicateIds.length} selected)
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="p-3 border-t border-amber-200 space-y-2">
                                                    <p className="text-xs font-semibold text-red-700">⚠ This will deactivate {selectedDuplicateIds.length} account(s). Those users will no longer be able to log in with their old credentials. Confirm?</p>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setAdoptConfirmOpen(false)} className="flex-1 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={adoptCredential}
                                                            disabled={adoptingCredential}
                                                            className="flex-1 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-1"
                                                        >
                                                            {adoptingCredential && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                                            Confirm & Disable
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Available Branches */}
                                    <div>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Accessible Branches</p>
                                        <div className="space-y-2">
                                            {branchModalData.availableBranches.map((branch) => {
                                                const isChecked = branchModalData.assignedBranchIds.includes(branch.id);
                                                return (
                                                    <button
                                                        key={branch.id}
                                                        onClick={() => toggleBranchId(branch.id)}
                                                        className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${isChecked ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${isChecked ? "bg-violet-600" : "border-2 border-slate-300 bg-white"}`}>
                                                            {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-slate-800 truncate">{branch.name}</p>
                                                            <p className="text-xs text-slate-500">{branch.branchCode ? `Code: ${branch.branchCode}` : "No branch code"}</p>
                                                        </div>
                                                        {branch.isHeadBranch && (
                                                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase shrink-0">Head</span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        {branchModalData && (
                            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 rounded-b-3xl">
                                <button onClick={() => { setBranchModalTeacher(null); setBranchModalData(null); }} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                                    Cancel
                                </button>
                                <button
                                    onClick={saveBranchModal}
                                    disabled={branchModalSaving}
                                    className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all disabled:opacity-60 flex items-center gap-2"
                                >
                                    {branchModalSaving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Add Teacher Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => { setShowAddModal(false); setEditingTeacher(null); }} />

                    <Card className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-hidden flex flex-col border-none animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">
                                    {editingTeacher ? "Edit Staff Member" : "Add New Staff Member"}
                                </h3>
                                <p className="text-sm text-slate-500 font-medium">
                                    {editingTeacher ? "Update staff information and permissions" : "Register a new staff member account"}
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowAddModal(false); setEditingTeacher(null); }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleAddTeacher} className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                                        First Name <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        placeholder="John"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        required
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                                        Last Name <span className="text-red-500">*</span>
                                    </label>
                                    <Input
                                        placeholder="Doe"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        required
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="email"
                                    placeholder="john.doe@school.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                                    Phone Number
                                </label>
                                <Input
                                    type="tel"
                                    placeholder="08012345678"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="h-11"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">
                                    Staff Role Selection <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                                    {Object.entries(roleLabels).map(([value, { label }]) => (
                                        <label key={value} className="flex items-center gap-3 cursor-pointer group hover:bg-white p-2 rounded-xl transition-all border border-transparent hover:border-slate-100 hover:shadow-sm">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-primary-600 rounded-md border-slate-300 focus:ring-primary-500 transition-all cursor-pointer"
                                                checked={formData.roles.includes(value)}
                                                onChange={(e) => {
                                                    const roles = e.target.checked
                                                        ? [...formData.roles, value]
                                                        : formData.roles.filter(r => r !== value);
                                                    if (value === "SUBJECT_TEACHER" && !e.target.checked) {
                                                        setBulkSubjectIds([]);
                                                        setBulkSubjectClassArmIds([]);
                                                    }
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        roles,
                                                        classArmIds: value === "CLASS_TEACHER" && !e.target.checked ? [] : prev.classArmIds
                                                    }));
                                                }}
                                            />
                                            <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {formData.roles.includes("CLASS_TEACHER") && (
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assign Class(es)</label>
                                        <span className="text-[10px] font-medium text-slate-400">Select classes to assign as teacher</span>
                                    </div>
                                    <div className="max-h-40 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                                        {metadata.classes
                                            .filter(cls => {
                                                return !cls.classTeacherId || (editingTeacher && cls.classTeacherId === editingTeacher.id);
                                            })
                                            .map((cls) => (
                                                <label key={cls.id} className="flex items-center gap-3 cursor-pointer group hover:bg-white p-2 rounded-xl transition-all border border-transparent hover:border-slate-100">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 text-primary-600 rounded-md border-slate-300 focus:ring-primary-500 transition-all cursor-pointer"
                                                        checked={formData.classArmIds.includes(cls.id)}
                                                        onChange={(e) => {
                                                            const classArmIds = e.target.checked
                                                                ? [...formData.classArmIds, cls.id]
                                                                : formData.classArmIds.filter(id => id !== cls.id);
                                                            setFormData({ ...formData, classArmIds });
                                                        }}
                                                    />
                                                    <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{cls.name}</span>
                                                </label>
                                            ))}
                                        {metadata.classes.filter(cls => !cls.classTeacherId || (editingTeacher && cls.classTeacherId === editingTeacher.id)).length === 0 && (
                                            <div className="py-8 text-center">
                                                <p className="text-sm text-slate-400 font-medium italic">No available classes to assign</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {formData.roles.includes("SUBJECT_TEACHER") && (
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assign Subject-Class Pairs</label>
                                        <span className="text-[10px] font-medium text-slate-400">Select one subject at a time</span>
                                    </div>

                                    {/* Current Selection */}
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                                        {/* Subject Selector */}
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Select Subject</label>
                                            <select
                                                value={currentSubject}
                                                onChange={(e) => handleSubjectChange(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                            >
                                                <option value="">-- Choose a subject --</option>
                                                {metadata.subjects.map((subj) => (
                                                    <option key={subj.id} value={subj.id}>{subj.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Class Arms for Current Subject */}
                                        {currentSubject && (
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Select Classes for {metadata.subjects.find(s => s.id === currentSubject)?.name}</label>
                                                <div className="max-h-32 overflow-y-auto bg-white border border-slate-200 rounded-xl p-2 space-y-1">
                                                    {availableClassArms.map((cls) => (
                                                        <label key={cls.id} className="flex items-center gap-2.5 p-1.5 cursor-pointer group hover:bg-slate-50 rounded-lg transition-all">
                                                            <input
                                                                type="checkbox"
                                                                className="w-3.5 h-3.5 text-primary-600 rounded border-slate-300 transition-all cursor-pointer"
                                                                checked={currentClassArms.includes(cls.id)}
                                                                onChange={() => toggleCurrentClassArm(cls.id)}
                                                            />
                                                            <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">{cls.name}</span>
                                                        </label>
                                                    ))}
                                                    {availableClassArms.length === 0 && (
                                                        <p className="text-[10px] text-slate-400 font-medium italic p-4 text-center">
                                                            No classes offer this subject
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Save Button */}
                                                {currentClassArms.length > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={saveCurrentSubjectPairs}
                                                        className="w-full px-3 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                                                    >
                                                        Save {currentClassArms.length} class(es) for this subject
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Saved Subject-Class Pairs */}
                                    {savedSubjectPairs.length > 0 && (
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Assigned Subjects ({subjectsWithPairs.length})</label>
                                            <div className="space-y-2">
                                                {subjectsWithPairs.map(subjectId => {
                                                    const subject = metadata.subjects.find(s => s.id === subjectId);
                                                    const pairs = savedSubjectPairs.filter(p => p.subjectId === subjectId);
                                                    return (
                                                        <div key={subjectId} className="p-3 bg-white border border-slate-200 rounded-xl">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h4 className="text-sm font-bold text-slate-700">{subject?.name}</h4>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeSubjectPairs(subjectId)}
                                                                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                                                                >
                                                                    Remove all
                                                                </button>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {pairs.map(pair => {
                                                                    const cls = metadata.classes.find(c => c.id === pair.classArmId);
                                                                    return (
                                                                        <span
                                                                            key={`${pair.subjectId}-${pair.classArmId}`}
                                                                            className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary-50 border border-primary-200 text-primary-700 rounded-lg text-xs font-semibold"
                                                                        >
                                                                            {cls?.name}
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removeSavedPair(pair.subjectId, pair.classArmId)}
                                                                                className="hover:bg-primary-200 rounded-full p-0.5 transition-colors"
                                                                            >
                                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                                </svg>
                                                                            </button>
                                                                        </span>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="flex items-center gap-2 px-1">
                                                <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                                                <p className="text-[10px] font-bold text-slate-500">
                                                    {savedSubjectPairs.length} TOTAL ASSIGNMENTS
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Conflicts Warning */}
                                    {assignmentConflicts.length > 0 && (
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                                            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-xs font-medium text-red-700">
                                                Conflicts detected: Some combinations are already assigned to other teachers.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </form>

                        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => { setShowAddModal(false); setEditingTeacher(null); }}
                                disabled={isSaving}
                                className="px-6"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const form = document.querySelector('form');
                                    if (form) form.requestSubmit();
                                }}
                                disabled={isSaving || hasInvalidSubjectAssignmentState}
                                className="px-8 shadow-md shadow-primary-500/20"
                            >
                                {isSaving ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Saving staff...</span>
                                    </div>
                                ) : (editingTeacher ? "Save Changes" : "Confirm & Add Staff")}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Unsaved Changes Warning Modal */}
            {showUnsavedWarning && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto overflow-x-hidden p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={cancelSubjectSwitch} />

                    <Card className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-none animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            {/* Warning Icon */}
                            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>

                            {/* Warning Message */}
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Unsaved Changes</h3>
                            <p className="text-slate-600 mb-6">
                                You have selected {currentClassArms.length} class{currentClassArms.length !== 1 ? 'es' : ''} for{' '}
                                <span className="font-semibold text-slate-900">
                                    {metadata.subjects.find(s => s.id === currentSubject)?.name}
                                </span>
                                . These selections will be lost if you switch subjects without saving.
                            </p>

                            {/* Action Buttons */}
                            <div className="space-y-2">
                                <Button
                                    onClick={() => {
                                        saveCurrentSubjectPairs();
                                        confirmSubjectSwitch();
                                    }}
                                    className="w-full bg-primary-600 hover:bg-primary-700 text-white"
                                >
                                    Save & Switch Subject
                                </Button>
                                <Button
                                    onClick={confirmSubjectSwitch}
                                    variant="secondary"
                                    className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                                >
                                    Switch Without Saving
                                </Button>
                                <Button
                                    onClick={cancelSubjectSwitch}
                                    variant="secondary"
                                    className="w-full"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Import CSV Modal */}
            {showImportModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={() => !importing && setShowImportModal(false)} />

                        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Import Staff from CSV</h3>
                                <button
                                    onClick={() => {
                                        if (!importing) {
                                            setShowImportModal(false);
                                            setImportFile(null);
                                            setImportResults(null);
                                            setImportDryRun(false);
                                            setCreateLoginAccounts(true);
                                        }
                                    }}
                                    className="text-gray-400 hover:text-gray-500"
                                    disabled={importing}
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Instructions */}
                                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                                    <div className="flex">
                                        <div className="shrink-0">
                                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-blue-700">
                                                Download the staff template, fill registration data, then upload.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3">
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={importDryRun}
                                            onChange={(e) => setImportDryRun(e.target.checked)}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            disabled={importing}
                                        />
                                        Dry run (validate only)
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={createLoginAccounts}
                                            onChange={(e) => setCreateLoginAccounts(e.target.checked)}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            disabled={importing}
                                        />
                                        Create login accounts
                                    </label>
                                </div>

                                {/* File Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Select CSV File
                                    </label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => {
                                            setImportFile(e.target.files?.[0] || null);
                                            setImportResults(null);
                                        }}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                        disabled={importing}
                                    />
                                </div>

                                {/* Import Results */}
                                {importResults && (
                                    <div className="space-y-2 mt-4">
                                        <div className="flex items-center gap-2 text-green-600">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-medium">
                                                {importResults.success} staff account(s) {importResults.dryRun ? "validated" : "imported"} successfully
                                            </span>
                                        </div>

                                        {importResults.failed > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 text-red-600 mb-2">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="font-medium">{importResults.failed} staff account(s) failed</span>
                                                </div>
                                                <div className="bg-red-50 rounded-md p-3 max-h-40 overflow-y-auto">
                                                    <ul className="text-sm text-red-700 space-y-1">
                                                        {importResults.errors.map((error: string, idx: number) => (
                                                            <li key={idx}>• {error}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => {
                                            setShowImportModal(false);
                                            setImportFile(null);
                                            setImportResults(null);
                                            setImportDryRun(false);
                                            setCreateLoginAccounts(true);
                                        }}
                                        className="inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                                        disabled={importing}
                                    >
                                        {importResults ? "Close" : "Cancel"}
                                    </button>
                                    {!importResults && (
                                        <button
                                            onClick={handleImportCSV}
                                            className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm shadow-primary-500/30"
                                            disabled={!importFile || importing}
                                        >
                                            {importing ? "Importing..." : "Import"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {passwordResetTarget && (
                <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => {
                            if (resettingUserId !== passwordResetTarget.id) {
                                setPasswordResetTarget(null);
                            }
                        }}
                    />

                    <Card className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border-none animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-900">Reset Password</h3>
                            <p className="text-sm text-slate-500 mt-2">
                                Reset password for <span className="font-semibold text-slate-700">{passwordResetTarget.firstName} {passwordResetTarget.lastName}</span>?
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                                The new temporary password will be <span className="font-semibold text-slate-700">1234</span>.
                            </p>
                        </div>

                        <div className="p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => setPasswordResetTarget(null)}
                                disabled={resettingUserId === passwordResetTarget.id}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleResetPassword}
                                disabled={resettingUserId === passwordResetTarget.id}
                                className="bg-amber-600 hover:bg-amber-700"
                            >
                                {resettingUserId === passwordResetTarget.id ? "Resetting..." : "Confirm Reset"}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
