"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "react-hot-toast";

import { Student, StudentChangeRequest, ClassOption, SessionOption, SubjectOption, Pagination } from "./types";
import { StudentViewModal } from "./StudentViewModal";
import { Card } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import {
    downloadLoginCredentialsCsv,
    printLoginCredentials,
    type LoginCredentialExportPayload,
} from "@/lib/loginCredentialExport";

interface StudentsClientProps {
    initialSessions: SessionOption[];
    initialClasses: ClassOption[];
    initialSubjects: SubjectOption[];
}

export default function StudentsClient({ initialSessions, initialClasses, initialSubjects }: StudentsClientProps) {
    const { data: sessionData } = useSession();
    const userRoles: string[] = (sessionData?.user as any)?.roles || [];
    const isAdmin = userRoles.includes("SUPER_ADMIN") || userRoles.includes("SCHOOL_ADMIN");
    const isClassTeacher = userRoles.includes("CLASS_TEACHER");
    const canCreateStudents = isAdmin || isClassTeacher;
    const canManageStudentPhotos = isAdmin || isClassTeacher;
    const canRequestStudentChanges = isAdmin || isClassTeacher;
    const restrictToAssignedScope = !isAdmin && isClassTeacher;

    // Data state
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>(initialClasses);
    const [subjects, setSubjects] = useState<SubjectOption[]>(initialSubjects);
    const [sessions, setSessions] = useState<SessionOption[]>(initialSessions);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
    });

    // Filter state
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSessionId, setSelectedSessionId] = useState("");
    const [selectedClassArm, setSelectedClassArm] = useState("");
    const [selectedGender, setSelectedGender] = useState("");
    const router = useRouter();

    // UI state
    const [viewStudent, setViewStudent] = useState<Student | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [nextAdmissionNumber, setNextAdmissionNumber] = useState("");
    const [loadingAdmissionNumber, setLoadingAdmissionNumber] = useState(false);
    const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [resettingUserId, setResettingUserId] = useState<string | null>(null);
    const [passwordResetTarget, setPasswordResetTarget] = useState<Student | null>(null);
    const [importDryRun, setImportDryRun] = useState(false);
    const [createLoginAccounts, setCreateLoginAccounts] = useState(true);
    const [credentialAction, setCredentialAction] = useState<"download" | "print" | null>(null);
    const [importResults, setImportResults] = useState<{
        success: number;
        failed: number;
        errors: string[];
        dryRun?: boolean;
        createLoginAccounts?: boolean;
    } | null>(null);
    const [showLegacyImportModal, setShowLegacyImportModal] = useState(false);
    const [legacyImportFile, setLegacyImportFile] = useState<File | null>(null);
    const [legacyImporting, setLegacyImporting] = useState(false);
    const [legacyImportDryRun, setLegacyImportDryRun] = useState(true);
    const [legacyForceOverwrite, setLegacyForceOverwrite] = useState(false);
    const [legacyAtomic, setLegacyAtomic] = useState(true);
    const [selectedLegacySessionId, setSelectedLegacySessionId] = useState("");
    const [selectedLegacyTermId, setSelectedLegacyTermId] = useState("");
    const [selectedLegacyClassArmId, setSelectedLegacyClassArmId] = useState("");
    const [selectedLegacySubjectId, setSelectedLegacySubjectId] = useState("");
    const [legacyImportResult, setLegacyImportResult] = useState<{
        status?: string;
        success: number;
        failed: number;
        errors: string[];
        conflictCount?: number;
        affectedStudents?: { name: string; admissionNumber: string }[];
        dryRun?: boolean;
        forceOverwrite?: boolean;
        atomic?: boolean;
    } | null>(null);
    const [studentChangeRequests, setStudentChangeRequests] = useState<StudentChangeRequest[]>([]);
    const [loadingStudentChangeRequests, setLoadingStudentChangeRequests] = useState(false);
    const [reviewingStudentChangeRequestId, setReviewingStudentChangeRequestId] = useState<string | null>(null);

    const getFirstClassArmId = (classList: ClassOption[]) => {
        for (const cls of classList) {
            if (cls.arms.length > 0) {
                return cls.arms[0].id;
            }
        }
        return "";
    };

    // Fetch students from API
    const fetchStudents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
            });
            const fallbackSessionId = sessions.find((s) => s.isCurrent)?.id || sessions[0]?.id || "";
            const effectiveSessionId = selectedSessionId || (restrictToAssignedScope ? fallbackSessionId : "");
            const effectiveClassArmId = selectedClassArm || (restrictToAssignedScope ? getFirstClassArmId(classes) : "");

            if (searchQuery) params.append("search", searchQuery);
            if (effectiveSessionId) params.append("sessionId", effectiveSessionId);
            if (effectiveClassArmId) params.append("classArmId", effectiveClassArmId);
            if (selectedGender) params.append("gender", selectedGender);

            const response = await fetch(`/api/students?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch students");

            const data = await response.json();
            setStudents(data.students || []);
            setPagination(data.pagination || pagination);
        } catch (err: any) {
            setError(err.message || "Failed to load students");
            // Keep showing existing data if available
        } finally {
            setLoading(false);
        }
    }, [
        pagination.page,
        pagination.limit,
        searchQuery,
        selectedSessionId,
        selectedClassArm,
        selectedGender,
        restrictToAssignedScope,
        sessions,
        classes
    ]);

    const fetchStudentChangeRequests = useCallback(async () => {
        if (!isAdmin) {
            setStudentChangeRequests([]);
            return;
        }

        setLoadingStudentChangeRequests(true);
        try {
            const response = await fetch("/api/students/change-requests?status=PENDING&limit=20");
            if (!response.ok) {
                throw new Error("Failed to load student approval requests");
            }

            const data = await response.json();
            setStudentChangeRequests(data.requests || []);
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Failed to load student approval requests");
        } finally {
            setLoadingStudentChangeRequests(false);
        }
    }, [isAdmin]);

    // Initial data load setup
    useEffect(() => {
        // Set default session/term from props
        const currentSession = initialSessions.find((s: any) => s.isCurrent) || initialSessions[0];
        if (currentSession) {
            setSelectedSessionId(currentSession.id);
            if (!selectedLegacySessionId) {
                setSelectedLegacySessionId(currentSession.id);
            }
            const defaultTerm = currentSession.terms.find((t: any) => t.isCurrent) || currentSession.terms[0];
            if (defaultTerm && !selectedLegacyTermId) {
                setSelectedLegacyTermId(defaultTerm.id);
            }
        }

        if (restrictToAssignedScope && !selectedClassArm) {
            const firstClassArmId = getFirstClassArmId(initialClasses);
            if (firstClassArmId) {
                setSelectedClassArm(firstClassArmId);
            }
        }

        // Handle ?add=true query param to open modal
        const urlParams = new URLSearchParams(window.location.search);
        if (canCreateStudents && urlParams.get("add") === "true") {
            setShowAddModal(true);
            // Clear the param from URL without refreshing
            router.replace("/dashboard/students", { scroll: false });
        }
    }, [router, initialSessions, initialClasses, restrictToAssignedScope, canCreateStudents]);

    // Refresh class list when session filter changes
    useEffect(() => {
        const applyClassScope = (nextClasses: ClassOption[]) => {
            setClasses(nextClasses);
            setSelectedClassArm((current) => {
                const availableArmIds = nextClasses.flatMap((cls) => cls.arms.map((arm) => arm.id));

                if (!restrictToAssignedScope) {
                    return "";
                }

                if (current && availableArmIds.includes(current)) {
                    return current;
                }

                return availableArmIds[0] || "";
            });
        };

        const loadClasses = async () => {
            if (selectedSessionId) {
                try {
                    const response = await fetch(`/api/classes?sessionId=${selectedSessionId}`);
                    if (response.ok) {
                        const data = await response.json();
                        applyClassScope(data.classes || []);
                    }
                } catch (err) {
                    console.error(err);
                }
            } else {
                applyClassScope(initialClasses);
            }
        };
        loadClasses();
        setPagination((prev) => ({ ...prev, page: 1 }));
    }, [selectedSessionId, initialClasses, restrictToAssignedScope]);

    // Fetch students when filters change (with debounce for search)
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchStudents();
        }, searchQuery ? 300 : 0); // Debounce search

        return () => clearTimeout(timer);
    }, [fetchStudents, searchQuery]);

    useEffect(() => {
        fetchStudentChangeRequests();
    }, [fetchStudentChangeRequests]);

    // Get all class arms as flat list for dropdown
    const classArmOptions = classes.flatMap(cls =>
        cls.arms.map(arm => ({
            id: arm.id,
            name: `${cls.name} ${arm.armName}`,
        }))
    );

    const selectedLegacySession = sessions.find((session) => session.id === selectedLegacySessionId) || null;
    const legacyTermOptions = selectedLegacySession?.terms || [];

    useEffect(() => {
        if (!selectedLegacySession) return;
        if (legacyTermOptions.length === 0) {
            setSelectedLegacyTermId("");
            return;
        }

        const hasSelectedTerm = legacyTermOptions.some((term) => term.id === selectedLegacyTermId);
        if (!hasSelectedTerm) {
            const defaultTerm = legacyTermOptions.find((term) => term.isCurrent) || legacyTermOptions[0];
            setSelectedLegacyTermId(defaultTerm.id);
        }
    }, [selectedLegacySessionId, sessions, selectedLegacyTermId]);

    // Calculate stats
    const stats = {
        total: pagination.total,
        female: pagination.femaleCount !== undefined ? pagination.femaleCount : students.filter(s => s.gender === "FEMALE").length,
        male: pagination.maleCount !== undefined ? pagination.maleCount : students.filter(s => s.gender === "MALE").length,
        active: pagination.activeCount !== undefined ? pagination.activeCount : students.filter(s => s.isActive).length,
    };

    // Download CSV Template function

    // Download CSV Template function
    const downloadCSVTemplate = () => {
        const headers = [
            "First Name",
            "Last Name",
            "Other Names",
            "Admission Number",
            "Gender (MALE/FEMALE)",
            "Date of Birth (YYYY-MM-DD)",
            "Admission Date (YYYY-MM-DD)",
            "Class",
            "State of Origin",
            "Religion",
            "Blood Group",
            "Parent Name",
            "Parent Phone",
            "Parent Email",
            "Address",
            "Status (Active/Inactive)"
        ];

        // Sample row to guide users
        const sampleRow = [
            "John",
            "Doe",
            "Michael",
            "",
            "MALE",
            "2012-05-15",
            "2018-09-10",
            "Primary 1A",
            "Lagos",
            "Christianity",
            "O+",
            "Mr. John Doe Sr.",
            "08012345678",
            "parent@email.com",
            "123 Sample Street, Lagos",
            "Active"
        ];

        const instructionRow = [
            "Required",
            "Required",
            "Optional",
            "Optional (auto-generated if empty)",
            "Required: MALE or FEMALE",
            "Optional: Format YYYY-MM-DD",
            "Optional: Format YYYY-MM-DD",
            "Required: Full class name with arm (e.g., Primary 1A)",
            "Optional",
            "Optional",
            "Optional",
            "Optional",
            "Optional",
            "Optional",
            "Optional",
            "Optional: Active or Inactive"
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
        link.setAttribute("download", "student_import_template.csv");
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
            if (selectedSessionId) {
                formData.append("sessionId", selectedSessionId);
            }

            const response = await fetch("/api/students/import", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to import students");
            }

            setImportResults(result);
            setImportFile(null);

            // Refresh the students list
            if (result.success > 0 && !result.dryRun) {
                fetchStudents();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setImporting(false);
        }
    };

    const downloadLegacyRecordsTemplate = () => {
        const headers = [
            "Admission Number",
            "CA1",
            "CA2",
            "CA3",
            "Exam",
            "Total Score",
            "Average",
            "Class Position",
            "Class Size",
            "Days Present",
            "Days Absent",
            "Total School Days",
            "Class Teacher Comment",
            "Principal Comment",
            "Is Published"
        ];

        const instructionRow = [
            "Required",
            "Optional",
            "Optional",
            "Optional",
            "Optional",
            "Optional",
            "Optional",
            "Optional",
            "Optional",
            "Optional",
            "Optional",
            "Optional",
            "Optional",
            "Optional",
            "Optional (true/false)"
        ];

        const sampleRow = [
            "SCH/2022/014",
            "15",
            "18",
            "7",
            "52",
            "92",
            "76.5",
            "3",
            "42",
            "61",
            "4",
            "65",
            "Good effort this term",
            "Keep improving next term",
            "true"
        ];

        const csvContent = [
            headers.join(","),
            instructionRow.join(","),
            sampleRow.map((cell) => {
                if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
                    return `"${cell.replace(/"/g, '""')}"`;
                }
                return cell;
            }).join(","),
            new Array(headers.length).fill("").join(","),
            new Array(headers.length).fill("").join(","),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "legacy_records_import_template.csv");
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLegacyImport = async () => {
        if (!legacyImportFile) {
            setError("Please select a legacy records CSV file.");
            return;
        }
        if (!selectedLegacyTermId || !selectedLegacyClassArmId || !selectedLegacySubjectId) {
            setError("Please select session, term, class, and subject for legacy import.");
            return;
        }

        setLegacyImporting(true);
        setError(null);
        setLegacyImportResult(null);

        try {
            const formData = new FormData();
            formData.append("file", legacyImportFile);
            formData.append("termId", selectedLegacyTermId);
            formData.append("classArmId", selectedLegacyClassArmId);
            formData.append("subjectId", selectedLegacySubjectId);
            formData.append("dryRun", String(legacyImportDryRun));
            formData.append("forceOverwrite", String(legacyForceOverwrite));
            formData.append("atomic", String(legacyAtomic));

            const response = await fetch("/api/students/legacy-records/import", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();
            setLegacyImportResult(result);

            if (!response.ok && !result?.errors) {
                throw new Error(result.error || "Failed to import legacy records");
            }

            if (response.ok && !legacyImportDryRun) {
                fetchStudents();
            }
        } catch (err: any) {
            setError(err.message || "Failed to import legacy records");
        } finally {
            setLegacyImporting(false);
        }
    };

    const exportStudentsCSV = () => {
        const headers = [
            "First Name",
            "Last Name",
            "Other Names",
            "Admission Number",
            "Gender",
            "Date of Birth",
            "Class",
            "State of Origin",
            "Religion",
            "Blood Group",
            "Parent Name",
            "Parent Phone",
            "Parent Email",
            "Address",
            "Status"
        ];

        const rows = students.map((student) => [
            student.firstName,
            student.lastName,
            student.otherNames || "",
            student.admissionNumber,
            student.gender,
            student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : "",
            `${student.classArm.class.name} ${student.classArm.armName}`,
            student.stateOfOrigin || "",
            "", // Religion field (not in current schema)
            "", // Blood Group field (not in current schema)
            student.parentName || "",
            student.parentPhone || "",
            student.parentEmail || "",
            student.address || "",
            student.isActive ? "Active" : "Inactive"
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => {
                // Escape cells containing commas or quotes
                const cellStr = String(cell);
                if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const timestamp = new Date().toISOString().split('T')[0];
        link.setAttribute("download", `students_export_${timestamp}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleStudentCredentialAction = async (action: "download" | "print") => {
        setCredentialAction(action);
        setError(null);

        try {
            const response = await fetch("/api/students/login-credentials");
            const payload = await response.json() as LoginCredentialExportPayload & { error?: string };

            if (!response.ok) {
                throw new Error(payload.error || "Failed to fetch student login credentials");
            }

            if (action === "download") {
                const timestamp = new Date().toISOString().split("T")[0];
                downloadLoginCredentialsCsv(payload, `student_login_credentials_${timestamp}.csv`);
                toast.success("Student login credentials downloaded.");
                return;
            }

            printLoginCredentials(payload);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to fetch student login credentials";
            setError(message);
            toast.error(message);
        } finally {
            setCredentialAction(null);
        }
    };

    const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data: any = {
            firstName: formData.get("firstName"),
            lastName: formData.get("lastName"),
            otherNames: formData.get("otherNames"),
            gender: formData.get("gender"),
            dateOfBirth: formData.get("dateOfBirth"),
            classArmId: formData.get("classArmId"),
            stateOfOrigin: formData.get("stateOfOrigin"),
            address: formData.get("address"),
            parentName: formData.get("parentName"),
            parentPhone: formData.get("parentPhone"),
            parentEmail: formData.get("parentEmail"),
        };

        if (!selectedStudent) {
            data.admissionNumber = formData.get("admissionNumber") || nextAdmissionNumber;
            data.autoGenerate = autoGenerateEnabled;
            data.sessionId = selectedSessionId || undefined;
        } else {
            data.id = selectedStudent.id;
        }

        try {
            const url = "/api/students";
            const method = selectedStudent ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            const result = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(result.error || `Failed to ${selectedStudent ? 'update' : 'add'} student`);
            }

            setShowAddModal(false);
            setSelectedStudent(null);
            toast.success(
                result.message ||
                (selectedStudent
                    ? (isAdmin ? "Student updated successfully." : "Student update submitted for approval.")
                    : "Student added successfully.")
            );

            if (!selectedStudent || response.status !== 202) {
                fetchStudents();
            }

            if (isAdmin) {
                fetchStudentChangeRequests();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const confirmDelete = async (studentId: string) => {
        if (!studentId) return;

        try {
            const response = await fetch(`/api/students?id=${studentId}`, {
                method: "DELETE",
            });

            const result = await response.json().catch(() => ({}));

            if (response.ok) {
                setShowDeleteConfirm(null);
                toast.success(
                    result.message ||
                    (isAdmin ? "Student deleted successfully." : "Student deletion submitted for approval.")
                );

                if (response.status !== 202) {
                    fetchStudents();
                }

                if (isAdmin) {
                    fetchStudentChangeRequests();
                }
            } else {
                toast.error(result.error || "Failed to delete student");
            }
        } catch (err) {
            console.error("Error deleting student:", err);
            toast.error("Error deleting student");
        }
    };

    const handleDelete = (studentId: string) => {
        setShowDeleteConfirm(studentId);
    };

    const handleEdit = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (student) {
            setSelectedStudent(student);
            setShowAddModal(true);
            setAutoGenerateEnabled(false); // Disable auto-gen for edits usually
            setNextAdmissionNumber(student.admissionNumber);
        }
    };

    const handleToggleStatus = async (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        try {
            const response = await fetch("/api/students", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: student.id,
                    isActive: !student.isActive
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to update status");
            }

            fetchStudents(); // Refresh list
        } catch (err: any) {
            console.error("Error toggling status:", err);
            toast.error("Error updating student status");
        }
    };

    const fetchNextAdmissionNumber = async () => {
        setLoadingAdmissionNumber(true);
        try {
            const params = new URLSearchParams({ getNextAdmissionNumber: "true" });
            if (selectedSessionId) params.append("sessionId", selectedSessionId);
            const response = await fetch(`/api/students?${params.toString()}`);
            if (response.ok) {
                const data = await response.json();
                setNextAdmissionNumber(data.nextAdmissionNumber);
            }
        } catch (error) {
            console.error("Failed to fetch next admission number:", error);
        } finally {
            setLoadingAdmissionNumber(false);
        }
    };

    // Fetch next admission number when modal opens
    useEffect(() => {
        if (showAddModal && autoGenerateEnabled) {
            fetchNextAdmissionNumber();
        }
    }, [showAddModal, autoGenerateEnabled, selectedSessionId]);

    // Photo upload handler
    const handlePhotoUpload = async (file: File, studentId: string) => {
        try {
            // 1. Upload file
            const formData = new FormData();
            formData.append("file", file);
            formData.append("studentId", studentId);

            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!uploadRes.ok) {
                const errData = await uploadRes.json().catch(() => ({}));
                throw new Error(errData.error || "Upload failed");
            }
            const { url } = await uploadRes.json();

            // 2. Update student record
            const updateRes = await fetch("/api/students", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: studentId,
                    photoUrl: url
                }),
            });

            if (!updateRes.ok) {
                const errData = await updateRes.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to update student photo");
            }

            // 3. Refresh list
            toast.success("Student photo updated successfully.");
            fetchStudents();
        } catch (err) {
            console.error("Photo upload error:", err);
            toast.error(err instanceof Error ? err.message : "Failed to upload photo");
        }
    };

    const handleStudentChangeRequestReview = async (
        requestId: string,
        action: "approve" | "reject"
    ) => {
        if (!requestId) return;

        const confirmed = window.confirm(
            action === "approve"
                ? "Approve this student request?"
                : "Reject this student request?"
        );

        if (!confirmed) return;

        const reviewNote = action === "reject"
            ? window.prompt("Optional rejection reason:", "") ?? ""
            : "";

        setReviewingStudentChangeRequestId(requestId);
        try {
            const response = await fetch(`/api/students/change-requests/${requestId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action, reviewNote }),
            });

            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(result.error || `Failed to ${action} request`);
            }

            toast.success(result.message || `Request ${action}d successfully.`);
            fetchStudentChangeRequests();
            fetchStudents();
        } catch (err) {
            console.error(`Failed to ${action} student request:`, err);
            toast.error(err instanceof Error ? err.message : `Failed to ${action} request`);
        } finally {
            setReviewingStudentChangeRequestId(null);
        }
    };

    const handleResetUserPassword = async () => {
        if (!passwordResetTarget) return;
        const student = passwordResetTarget;

        if (!student.userId) {
            toast.error("This student does not have a login account yet.");
            return;
        }

        setResettingUserId(student.id);
        try {
            const response = await fetch("/api/users/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: student.userId }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to reset password");
            }

            toast.success(`${student.firstName} ${student.lastName}'s password was reset to 1234.`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to reset password";
            toast.error(message);
        } finally {
            setResettingUserId(null);
            setPasswordResetTarget(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Students</h1>
                    <p className="text-gray-500 mt-1">Manage student records and information</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {isAdmin && (
                        <>
                            <button
                                onClick={downloadCSVTemplate}
                                className="btn-secondary flex items-center gap-2"
                                title="Download student registration CSV template"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Student Template
                            </button>
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Import Students
                            </button>
                            <button
                                onClick={() => setShowLegacyImportModal(true)}
                                className="btn-secondary flex items-center gap-2"
                                title="Import scores/report data for previous academic years"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m-7 4h8a2 2 0 002-2V6a2 2 0 00-2-2h-3.5a1 1 0 01-.8-.4L12 2 10.3 3.6a1 1 0 01-.8.4H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Legacy Records
                            </button>
                            <button
                                onClick={() => handleStudentCredentialAction("download")}
                                className="btn-secondary flex items-center gap-2"
                                title="Download login identifiers for all student accounts"
                                disabled={credentialAction !== null}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {credentialAction === "download" ? "Preparing..." : "Download Student Logins"}
                            </button>
                            <button
                                onClick={() => handleStudentCredentialAction("print")}
                                className="btn-secondary flex items-center gap-2"
                                title="Print login identifiers for all student accounts"
                                disabled={credentialAction !== null}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V4h12v5M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v6H6v-6z" />
                                </svg>
                                {credentialAction === "print" ? "Preparing..." : "Print Student Logins"}
                            </button>
                        </>
                    )}
                    <button
                        onClick={exportStudentsCSV}
                        className="btn-secondary flex items-center gap-2"
                        title="Export all students to CSV"
                        disabled={students.length === 0}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Students
                    </button>
                    {canCreateStudents && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Student
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                            <p className="text-sm text-gray-500">Total Students</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.female}
                            </p>
                            <p className="text-sm text-gray-500">Female</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.male}
                            </p>
                            <p className="text-sm text-gray-500">Male</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {stats.active}
                            </p>
                            <p className="text-sm text-gray-500">Active</p>
                        </div>
                    </div>
                </div>
            </div>

            {isAdmin && (
                <Card className="overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Pending Student Requests</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Review edit and delete requests submitted by class teachers.
                            </p>
                        </div>
                        <button
                            onClick={fetchStudentChangeRequests}
                            className="btn-secondary text-sm"
                            disabled={loadingStudentChangeRequests}
                        >
                            {loadingStudentChangeRequests ? "Refreshing..." : "Refresh"}
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Student
                                    </TableHead>
                                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Request
                                    </TableHead>
                                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Submitted By
                                    </TableHead>
                                    <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Requested At
                                    </TableHead>
                                    <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingStudentChangeRequests ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                                            Loading approval requests...
                                        </TableCell>
                                    </TableRow>
                                ) : studentChangeRequests.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                                            No pending student requests.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    studentChangeRequests.map((request) => (
                                        <TableRow key={request.id}>
                                            <TableCell className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{request.studentName}</div>
                                                    <div className="text-xs text-gray-500 font-mono">{request.admissionNumber}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        request.action === "DELETE"
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-amber-100 text-amber-700"
                                                    }`}>
                                                        {request.action === "DELETE" ? "Delete" : "Edit"}
                                                    </span>
                                                    <p className="text-sm text-gray-600">{request.summary || "Pending review"}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {request.requester.lastName} {request.requester.firstName}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {new Date(request.createdAt).toLocaleString("en-GB", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </TableCell>
                                            <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleStudentChangeRequestReview(request.id, "approve")}
                                                        disabled={reviewingStudentChangeRequestId === request.id}
                                                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleStudentChangeRequestReview(request.id, "reject")}
                                                        disabled={reviewingStudentChangeRequestId === request.id}
                                                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-md text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            )}

            {/* Filters */}
            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Search by name or admission number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input pl-10 w-full"
                        />
                        <svg
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    {/* Session Filter */}
                    <select
                        value={selectedSessionId}
                        onChange={(e) => setSelectedSessionId(e.target.value)}
                        className="input w-full md:w-48"
                    >
                        {!restrictToAssignedScope && <option value="">All Sessions</option>}
                        {sessions.map((session) => (
                            <option key={session.id} value={session.id}>
                                {session.name} {session.isCurrent ? "(Current)" : ""}
                            </option>
                        ))}
                    </select>

                    {/* Class Filter */}
                    <select
                        value={selectedClassArm}
                        onChange={(e) => setSelectedClassArm(e.target.value)}
                        className="input w-full md:w-48"
                    >
                        {!restrictToAssignedScope && <option value="">All Classes</option>}
                        {classArmOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                                {option.name}
                            </option>
                        ))}
                    </select>

                    {/* Gender Filter */}
                    <select
                        value={selectedGender}
                        onChange={(e) => setSelectedGender(e.target.value)}
                        className="input w-full md:w-36"
                    >
                        <option value="">All Genders</option>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                    </select>
                </div>
            </div>

            {/* Students Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Student
                                </TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Admission No.
                                </TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Class
                                </TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Gender
                                </TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Parent Phone
                                </TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </TableHead>
                                <TableHead className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="px-6 py-10 text-center">
                                        <div className="flex justify-center">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500">Loading students...</p>
                                    </TableCell>
                                </TableRow>
                            ) : students.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            <p className="text-gray-500">No students found</p>
                                            <p className="text-gray-400 text-sm mt-1">
                                                Try adjusting your search or filter criteria
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                students.map((student) => (
                                    <TableRow key={student.id} className="hover:bg-gray-50">
                                        <TableCell className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="relative group">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium overflow-hidden ${student.gender === "FEMALE" ? "bg-pink-500" : "bg-blue-500"
                                                        }`}>
                                                        {student.photoUrl ? (
                                                            <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span>{student.firstName[0]}{student.lastName[0]}</span>
                                                        )}
                                                    </div>

                                                    {canManageStudentPhotos && (
                                                        <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                accept="image/*"
                                                                onChange={(e) => {
                                                                    if (e.target.files?.[0]) {
                                                                        handlePhotoUpload(e.target.files[0], student.id);
                                                                    }
                                                                }}
                                                            />
                                                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                        </label>
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {student.firstName} {student.lastName}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-gray-900 font-mono">
                                                {student.admissionNumber}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                                {student.classArm.class.name} {student.classArm.armName}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.gender === "FEMALE"
                                                ? "bg-pink-100 text-pink-800"
                                                : "bg-blue-100 text-blue-800"
                                                }`}>
                                                {student.gender === "FEMALE" ? "Female" : "Male"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {student.parentPhone}
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${student.isActive
                                                ? "bg-green-100 text-green-800"
                                                : "bg-gray-100 text-gray-800"
                                                }`}>
                                                {student.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setViewStudent(student)}
                                                    title="View Student"
                                                    className="inline-flex items-center justify-center p-2 rounded-md text-primary-600 hover:text-primary-800 hover:bg-primary-50"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                {canRequestStudentChanges && (
                                                    <button
                                                        onClick={() => handleEdit(student.id)}
                                                        title={isAdmin ? "Edit Student" : "Request Student Update"}
                                                        className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleToggleStatus(student.id)}
                                                        title={student.isActive ? "Deactivate Student" : "Activate Student"}
                                                        className="inline-flex items-center justify-center p-2 rounded-md text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => setPasswordResetTarget(student)}
                                                        title={student.userId ? "Reset Password" : "No login account"}
                                                        disabled={!student.userId || resettingUserId === student.id}
                                                        className="inline-flex items-center justify-center p-2 rounded-md text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {resettingUserId === student.id ? (
                                                            <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                                        ) : (
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11V7a4 4 0 118 0v4m-8 0h8m-8 0H8a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2" />
                                                            </svg>
                                                        )}
                                                    </button>
                                                )}
                                                {canRequestStudentChanges && (
                                                    <button
                                                        onClick={() => handleDelete(student.id)}
                                                        title={isAdmin ? "Delete Student" : "Request Student Deletion"}
                                                        className="inline-flex items-center justify-center p-2 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                    <div className="flex-1 flex justify-between sm:hidden">
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                            disabled={pagination.page === 1}
                            className="btn-secondary disabled:opacity-50"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                            disabled={pagination.page >= pagination.totalPages}
                            className="btn-secondary disabled:opacity-50"
                        >
                            Next
                        </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                                <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{" "}
                                <span className="font-medium">{pagination.total}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                                    disabled={pagination.page === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <span className="sr-only">Previous</span>
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                    // Simple pagination logic to show current page and surrounding
                                    let pageNum = i + 1;
                                    if (pagination.totalPages > 5 && pagination.page > 3) {
                                        pageNum = pagination.page - 2 + i;
                                        if (pageNum > pagination.totalPages) pageNum = pagination.totalPages - (4 - i);
                                    }

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${pagination.page === pageNum
                                                ? "z-10 bg-primary-50 border-primary-500 text-primary-600"
                                                : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                                    disabled={pagination.page >= pagination.totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    <span className="sr-only">Next</span>
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Student Modal */}
            {
                canCreateStudents && showAddModal && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex min-h-screen items-center justify-center p-4">
                            <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={() => { setShowAddModal(false); setSelectedStudent(null); }} />

                            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            {selectedStudent
                                                ? (isAdmin ? "Edit Student" : "Request Student Update")
                                                : "Add New Student"}
                                        </h3>
                                        {selectedStudent && !isAdmin && (
                                            <p className="text-sm text-amber-600 mt-1">
                                                Your changes will be sent to the admin user for approval.
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => { setShowAddModal(false); setSelectedStudent(null); }}
                                        className="text-gray-400 hover:text-gray-500"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <form key={selectedStudent?.id || "new"} onSubmit={handleAddStudent} className="p-6 space-y-6">
                                    {selectedStudent && !isAdmin && (
                                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                            The student record will stay unchanged until an admin approves this request.
                                        </div>
                                    )}

                                    {/* Basic Info */}
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900 mb-4">Basic Information</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    First Name *
                                                </label>
                                                <input name="firstName" defaultValue={selectedStudent?.firstName} type="text" className="input w-full" required />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Last Name *
                                                </label>
                                                <input name="lastName" defaultValue={selectedStudent?.lastName} type="text" className="input w-full" required />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Other Names
                                                </label>
                                                <input name="otherNames" defaultValue={selectedStudent?.otherNames || ""} type="text" className="input w-full" />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Gender *
                                                </label>
                                                <select name="gender" defaultValue={selectedStudent?.gender} className="input w-full" required>
                                                    <option value="">Select Gender</option>
                                                    <option value="MALE">Male</option>
                                                    <option value="FEMALE">Female</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Date of Birth *
                                                </label>
                                                <input
                                                    name="dateOfBirth"
                                                    defaultValue={selectedStudent?.dateOfBirth ? new Date(selectedStudent.dateOfBirth).toISOString().split('T')[0] : ''}
                                                    type="date"
                                                    className="input w-full"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Admission Number *
                                                </label>
                                                <div className="flex gap-2">
                                                    <input
                                                        name="admissionNumber"
                                                        type="text"
                                                        className="input w-full bg-gray-50"
                                                        value={nextAdmissionNumber}
                                                        readOnly={autoGenerateEnabled || !!selectedStudent}
                                                        onChange={(e) => setNextAdmissionNumber(e.target.value)}
                                                        required
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={fetchNextAdmissionNumber}
                                                        disabled={loadingAdmissionNumber || !autoGenerateEnabled}
                                                        className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg border border-gray-200"
                                                        title="Refresh Admission Number"
                                                    >
                                                        <svg className={`w-5 h-5 ${loadingAdmissionNumber ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="mt-1 flex items-center justify-between">
                                                    {!selectedStudent && (
                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={autoGenerateEnabled}
                                                                onChange={(e) => setAutoGenerateEnabled(e.target.checked)}
                                                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                            />
                                                            <span className="text-xs text-gray-500">Auto-generate</span>
                                                        </label>
                                                    )}
                                                    {autoGenerateEnabled && nextAdmissionNumber && !selectedStudent && (
                                                        <span className="text-xs text-green-600 flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                            Next: {nextAdmissionNumber}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Academic Info */}
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900 mb-4">Academic Information</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Class *
                                                </label>
                                                <select
                                                    name="classArmId"
                                                    defaultValue={selectedStudent?.classArm.id || selectedClassArm || ""}
                                                    className="input w-full"
                                                    required
                                                >
                                                    <option value="">Select Class</option>
                                                    {classArmOptions.map((option) => (
                                                        <option key={option.id} value={option.id}>
                                                            {option.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Parent Info */}
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-900 mb-4">Parent/Guardian Information</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Parent Name *
                                                </label>
                                                <input name="parentName" defaultValue={selectedStudent?.parentName || ""} type="text" className="input w-full" required />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Phone Number *
                                                </label>
                                                <input name="parentPhone" defaultValue={selectedStudent?.parentPhone || ""} type="tel" className="input w-full" required />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Email Address
                                                </label>
                                                <input name="parentEmail" defaultValue={selectedStudent?.parentEmail || ""} type="email" className="input w-full" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Home Address
                                                </label>
                                                <textarea name="address" defaultValue={selectedStudent?.address || ""} rows={3} className="input w-full"></textarea>
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    State of Origin
                                                </label>
                                                <input name="stateOfOrigin" defaultValue={selectedStudent?.stateOfOrigin || ""} type="text" className="input w-full" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Form Actions */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                        <button
                                            type="button"
                                            onClick={() => { setShowAddModal(false); setSelectedStudent(null); }}
                                            className="btn-secondary"
                                            disabled={submitting}
                                        >
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn-primary" disabled={submitting}>
                                            {submitting
                                                ? "Saving..."
                                                : selectedStudent
                                                    ? (isAdmin ? "Update Student" : "Submit for Approval")
                                                    : "Add Student"}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                showDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                                {isAdmin ? "Delete Student?" : "Request Student Deletion?"}
                            </h3>
                            <p className="text-gray-500 text-center mb-6">
                                {isAdmin
                                    ? "This action cannot be undone. All data associated with this student including scores, attendance, and report cards will be permanently deleted."
                                    : "This sends a deletion request to the admin user. The student record will remain unchanged until approval."}
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(null)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => confirmDelete(showDeleteConfirm)}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                                >
                                    {isAdmin ? "Delete Student" : "Submit Request"}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Import CSV Modal */}
            {isAdmin && showImportModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={() => !importing && setShowImportModal(false)} />

                        <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Import Students from CSV</h3>
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
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-blue-700">
                                                Download the student template, fill registration data (including optional Admission Date and Status), then upload.
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
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-green-600">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-medium">
                                                {importResults.success} students {importResults.dryRun ? "validated" : "imported"} successfully
                                            </span>
                                        </div>

                                        {importResults.failed > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 text-red-600 mb-2">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="font-medium">{importResults.failed} students failed</span>
                                                </div>
                                                <div className="bg-red-50 rounded-md p-3 max-h-40 overflow-y-auto">
                                                    <ul className="text-sm text-red-700 space-y-1">
                                                        {importResults.errors.map((error, idx) => (
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
                                        className="btn-secondary"
                                        disabled={importing}
                                    >
                                        {importResults ? "Close" : "Cancel"}
                                    </button>
                                    {!importResults && (
                                        <button
                                            onClick={handleImportCSV}
                                            className="btn-primary"
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

            {isAdmin && showLegacyImportModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div
                            className="fixed inset-0 bg-gray-500/75 transition-opacity"
                            onClick={() => {
                                if (!legacyImporting) {
                                    setShowLegacyImportModal(false);
                                }
                            }}
                        />

                        <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Import Legacy Records (Historical Years)</h3>
                                <button
                                    onClick={() => {
                                        if (!legacyImporting) {
                                            setShowLegacyImportModal(false);
                                            setLegacyImportFile(null);
                                            setLegacyImportResult(null);
                                            setLegacyImportDryRun(true);
                                            setLegacyForceOverwrite(false);
                                            setLegacyAtomic(true);
                                        }
                                    }}
                                    className="text-gray-400 hover:text-gray-500"
                                    disabled={legacyImporting}
                                >
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                                    <p className="text-sm text-amber-800">
                                        Use this for pre-app historical data. Select the correct session, term, class, and subject before upload.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={downloadLegacyRecordsTemplate}
                                        className="btn-secondary text-sm"
                                    >
                                        Download Legacy Template
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Session *</label>
                                        <select
                                            className="input w-full"
                                            value={selectedLegacySessionId}
                                            onChange={(e) => setSelectedLegacySessionId(e.target.value)}
                                            disabled={legacyImporting}
                                        >
                                            <option value="">Select Session</option>
                                            {sessions.map((session) => (
                                                <option key={session.id} value={session.id}>
                                                    {session.name} {session.isCurrent ? "(Current)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Term *</label>
                                        <select
                                            className="input w-full"
                                            value={selectedLegacyTermId}
                                            onChange={(e) => setSelectedLegacyTermId(e.target.value)}
                                            disabled={legacyImporting || !selectedLegacySessionId}
                                        >
                                            <option value="">Select Term</option>
                                            {legacyTermOptions.map((term) => (
                                                <option key={term.id} value={term.id}>
                                                    {term.name} {term.isCurrent ? "(Current)" : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Class *</label>
                                        <select
                                            className="input w-full"
                                            value={selectedLegacyClassArmId}
                                            onChange={(e) => setSelectedLegacyClassArmId(e.target.value)}
                                            disabled={legacyImporting}
                                        >
                                            <option value="">Select Class</option>
                                            {classArmOptions.map((option) => (
                                                <option key={option.id} value={option.id}>
                                                    {option.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                                        <select
                                            className="input w-full"
                                            value={selectedLegacySubjectId}
                                            onChange={(e) => setSelectedLegacySubjectId(e.target.value)}
                                            disabled={legacyImporting}
                                        >
                                            <option value="">Select Subject</option>
                                            {subjects.map((subject) => (
                                                <option key={subject.id} value={subject.id}>
                                                    {subject.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Legacy CSV File *</label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => {
                                            setLegacyImportFile(e.target.files?.[0] || null);
                                            setLegacyImportResult(null);
                                        }}
                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                                        disabled={legacyImporting}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-50 rounded-lg p-3">
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={legacyImportDryRun}
                                            onChange={(e) => setLegacyImportDryRun(e.target.checked)}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            disabled={legacyImporting}
                                        />
                                        Dry run
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={legacyForceOverwrite}
                                            onChange={(e) => setLegacyForceOverwrite(e.target.checked)}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            disabled={legacyImporting}
                                        />
                                        Force overwrite
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={legacyAtomic}
                                            onChange={(e) => setLegacyAtomic(e.target.checked)}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                            disabled={legacyImporting}
                                        />
                                        Atomic import
                                    </label>
                                </div>

                                {legacyImportResult && (
                                    <div className="space-y-3 border border-gray-200 rounded-lg p-4">
                                        <div className="flex items-center gap-2 text-green-600">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-medium">
                                                {legacyImportResult.success} rows {legacyImportResult.dryRun ? "validated" : "processed"}
                                            </span>
                                        </div>

                                        {legacyImportResult.status === "conflict_admin" && (
                                            <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 text-sm space-y-2">
                                                <p>
                                                    {legacyImportResult.conflictCount || 0} student(s) already have existing records for the selected term/subject.
                                                    Enable <span className="font-semibold">Force overwrite</span> and re-run to replace them.
                                                </p>
                                                {legacyImportResult.affectedStudents && legacyImportResult.affectedStudents.length > 0 && (
                                                    <ul className="list-disc list-inside">
                                                        {legacyImportResult.affectedStudents.slice(0, 10).map((student, idx) => (
                                                            <li key={idx}>{student.name} ({student.admissionNumber})</li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        )}

                                        {legacyImportResult.failed > 0 && (
                                            <div>
                                                <div className="flex items-center gap-2 text-red-600 mb-2">
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="font-medium">{legacyImportResult.failed} row issues</span>
                                                </div>
                                                <div className="bg-red-50 rounded-md p-3 max-h-52 overflow-y-auto">
                                                    <ul className="text-sm text-red-700 space-y-1">
                                                        {legacyImportResult.errors.map((entry, idx) => (
                                                            <li key={idx}>- {entry}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => {
                                            if (!legacyImporting) {
                                                setShowLegacyImportModal(false);
                                                setLegacyImportFile(null);
                                                setLegacyImportResult(null);
                                                setLegacyImportDryRun(true);
                                                setLegacyForceOverwrite(false);
                                                setLegacyAtomic(true);
                                            }
                                        }}
                                        className="btn-secondary"
                                        disabled={legacyImporting}
                                    >
                                        {legacyImportResult ? "Close" : "Cancel"}
                                    </button>
                                    {!legacyImportResult && (
                                        <button
                                            onClick={handleLegacyImport}
                                            className="btn-primary"
                                            disabled={
                                                legacyImporting ||
                                                !legacyImportFile ||
                                                !selectedLegacyTermId ||
                                                !selectedLegacyClassArmId ||
                                                !selectedLegacySubjectId
                                            }
                                        >
                                            {legacyImporting ? "Importing..." : "Import Legacy Records"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {passwordResetTarget && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div
                            className="fixed inset-0 bg-gray-500/75 transition-opacity"
                            onClick={() => {
                                if (resettingUserId !== passwordResetTarget.id) {
                                    setPasswordResetTarget(null);
                                }
                            }}
                        />

                        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
                            <div className="p-6 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Reset Password</h3>
                                <p className="text-sm text-gray-600 mt-2">
                                    Reset password for <span className="font-semibold">{passwordResetTarget.firstName} {passwordResetTarget.lastName}</span>?
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    The new temporary password will be <span className="font-semibold">1234</span>.
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setPasswordResetTarget(null)}
                                    disabled={resettingUserId === passwordResetTarget.id}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleResetUserPassword}
                                    disabled={resettingUserId === passwordResetTarget.id}
                                    className="btn-primary"
                                >
                                    {resettingUserId === passwordResetTarget.id ? "Resetting..." : "Confirm Reset"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Student View Modal */}
            {viewStudent && (
                <StudentViewModal
                    student={viewStudent}
                    onClose={() => setViewStudent(null)}
                />
            )}
        </div >
    );
}
