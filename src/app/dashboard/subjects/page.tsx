"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import {
    mapAssessmentTypesToScoreFields,
    type AssessmentTypeLike,
    type ScoreFieldKey,
} from "@/lib/assessment-types";
import { handleUnauthorizedApiResponse, readApiError } from "@/lib/client-session";

type SubjectKind = "STANDARD" | "COMPOSITE_PARENT" | "COMPOSITE_COMPONENT";

interface SubjectTeacherAssignment {
    id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone?: string | null;
    isActive: boolean;
}

interface SubjectOfferingComponentAssignment {
    subjectId: string;
    subjectName: string;
    teacher: SubjectTeacherAssignment | null;
    isAssigned: boolean;
}

interface SubjectOffering {
    classArmId: string;
    classArmName: string;
    classId: string;
    className: string;
    level: string;
    assignmentSource?: "DIRECT" | "PARENT_SUBJECT" | "COMPONENT_SUBJECTS" | null;
    inheritedFromSubjectId?: string | null;
    inheritedFromSubjectName?: string | null;
    effectiveTeachers?: SubjectTeacherAssignment[];
    componentAssignments?: SubjectOfferingComponentAssignment[];
    missingComponentAssignments?: SubjectOfferingComponentAssignment[];
    enrollmentCount?: number;
    hasEnrolledStudents?: boolean;
    teacher: SubjectTeacherAssignment | null;
}

interface SubjectAssignmentSummary {
    totalOfferings: number;
    assignedOfferings: number;
    unassignedOfferings: number;
    classesCount: number;
    teachersCount: number;
}

interface EnrollmentContext {
    termId: string;
    termName: string;
    sessionId: string;
    sessionName: string;
}

interface Subject {
    id: string;
    name: string;
    code: string;
    category: string;
    isActive: boolean;
    classIds?: string[];
    classArmIds?: string[];
    subjectKind: SubjectKind;
    parentSubjectId?: string | null;
    parentSubjectName?: string | null;
    isCompositeConfigured?: boolean;
    isReportVisible?: boolean;
    isScoreEntryEditable?: boolean;
    offerings?: SubjectOffering[];
    assignmentSummary?: SubjectAssignmentSummary;
}

interface ClassArmOption {
    id: string;
    name: string;
    level: string;
    classId: string;
}

interface SchoolClassOption {
    id: string;
    name: string;
    level: string;
    armIds: string[];
}

interface SessionOption {
    id: string;
    name: string;
    isCurrent?: boolean;
}

interface AssessmentTypeOption extends AssessmentTypeLike {}

interface CompositeComponentRow {
    id: string;
    mode: "existing" | "new";
    componentSubjectId: string;
    createName: string;
    createCode: string;
    createCategory: string;
    ca1Max: string;
    ca2Max: string;
    ca3Max: string;
    examMax: string;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
    CORE: { bg: "bg-blue-100", text: "text-blue-800" },
    SCIENCE: { bg: "bg-green-100", text: "text-green-800" },
    ARTS: { bg: "bg-purple-100", text: "text-purple-800" },
    COMMERCIAL: { bg: "bg-amber-100", text: "text-amber-800" },
    VOCATIONAL: { bg: "bg-cyan-100", text: "text-cyan-800" },
    LANGUAGE: { bg: "bg-pink-100", text: "text-pink-800" },
};

const subjectKindStyles: Record<SubjectKind, { label: string; className: string }> = {
    STANDARD: {
        label: "Standard",
        className: "bg-slate-100 text-slate-700 border border-slate-200",
    },
    COMPOSITE_PARENT: {
        label: "Composite Parent",
        className: "bg-indigo-100 text-indigo-700 border border-indigo-200",
    },
    COMPOSITE_COMPONENT: {
        label: "Component",
        className: "bg-amber-100 text-amber-800 border border-amber-200",
    },
};

const classLevelTabs = [
    { value: "ALL", label: "All" },
    { value: "PRIMARY", label: "Primary" },
    { value: "JUNIOR_SECONDARY", label: "Junior Secondary" },
    { value: "SENIOR_SECONDARY", label: "Senior Secondary" },
];

const scoreFieldLabels: Record<ScoreFieldKey, string> = {
    ca1: "CA 1",
    ca2: "CA 2",
    ca3: "CA 3",
    exam: "Exam",
};

const scoreFieldRowKey: Record<
    ScoreFieldKey,
    keyof Pick<CompositeComponentRow, "ca1Max" | "ca2Max" | "ca3Max" | "examMax">
> = {
    ca1: "ca1Max",
    ca2: "ca2Max",
    ca3: "ca3Max",
    exam: "examMax",
};

function formatLevel(level: string) {
    return level.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function createCompositeRow(defaultCategory: string): CompositeComponentRow {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mode: "existing",
        componentSubjectId: "",
        createName: "",
        createCode: "",
        createCategory: defaultCategory,
        ca1Max: "",
        ca2Max: "",
        ca3Max: "",
        examMax: "",
    };
}

function roundCompositeMax(value: number) {
    return Math.round(value * 100) / 100;
}

function toNumber(value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return roundCompositeMax(parsed);
}

function formatCompositeMax(value: number) {
    const rounded = roundCompositeMax(value);
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

function compositeMaxMatches(left: number, right: number) {
    return Math.abs(roundCompositeMax(left) - roundCompositeMax(right)) < 0.001;
}

function getCompositeFieldValue(row: CompositeComponentRow, field: ScoreFieldKey) {
    return toNumber(row[scoreFieldRowKey[field]]);
}

function isCompositeRowBlank(row: CompositeComponentRow) {
    const hasAnyScore =
        toNumber(row.ca1Max) > 0 ||
        toNumber(row.ca2Max) > 0 ||
        toNumber(row.ca3Max) > 0 ||
        toNumber(row.examMax) > 0;

    if (row.mode === "existing") {
        return !row.componentSubjectId && !hasAnyScore;
    }

    return !row.createName.trim() && !row.createCode.trim() && !hasAnyScore;
}

function describeSubject(subject: Subject) {
    if (subject.subjectKind === "COMPOSITE_PARENT") {
        return "Visible on reports and scored automatically from its component subjects.";
    }

    if (subject.subjectKind === "COMPOSITE_COMPONENT") {
        return subject.parentSubjectName
            ? `Internal component subject that contributes to ${subject.parentSubjectName}.`
            : "Internal component subject used for composite subject scoring.";
    }

    return "Standard subject. You can assign it to class arms and optionally turn it into a composite parent.";
}

function normalizeSubjectListingName(name: string) {
    return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function isStandaloneVisibleSubject(subject: Subject, hiddenComponentNameSet: Set<string>) {
    if (subject.subjectKind === "COMPOSITE_COMPONENT" || subject.parentSubjectId) {
        return false;
    }

    return !hiddenComponentNameSet.has(normalizeSubjectListingName(subject.name));
}

function getSubjectAssignmentSummary(subject: Subject): SubjectAssignmentSummary {
    if (subject.assignmentSummary) {
        return subject.assignmentSummary;
    }

    const totalOfferings = subject.classIds?.length || subject.classArmIds?.length || 0;

    return {
        totalOfferings,
        assignedOfferings: 0,
        unassignedOfferings: totalOfferings,
        classesCount: 0,
        teachersCount: 0,
    };
}

function formatTeacherLabel(teacher: SubjectTeacherAssignment | null | undefined) {
    if (!teacher) {
        return "No teacher assigned";
    }

    return teacher.fullName?.trim() || `${teacher.firstName} ${teacher.lastName}`.trim() || "Assigned teacher";
}

function formatOfferingLabel(offering: SubjectOffering) {
    return `${offering.className} ${offering.classArmName}`.trim();
}

function getOfferingTeacherSummary(offering: SubjectOffering) {
    if (offering.teacher) {
        return formatTeacherLabel(offering.teacher);
    }

    const effectiveTeachers = offering.effectiveTeachers || [];
    if (effectiveTeachers.length === 1) {
        return formatTeacherLabel(effectiveTeachers[0]);
    }

    if (effectiveTeachers.length > 1) {
        return `${effectiveTeachers.length} component teachers assigned`;
    }

    return "No teacher assigned";
}

function getOfferingAssignmentNote(offering: SubjectOffering) {
    if (offering.assignmentSource === "PARENT_SUBJECT") {
        return `Inherited from ${offering.inheritedFromSubjectName || "parent subject"}`;
    }

    if (offering.assignmentSource === "COMPONENT_SUBJECTS") {
        const teacherNames = (offering.effectiveTeachers || []).map((teacher) => formatTeacherLabel(teacher));
        return teacherNames.length > 0
            ? `Covered by: ${teacherNames.join(", ")}`
            : "All component subjects are assigned";
    }

    return null;
}

function getMissingComponentLabel(offering: SubjectOffering) {
    const missingComponents = offering.missingComponentAssignments || [];
    if (missingComponents.length === 0) {
        return null;
    }

    return missingComponents.map((component) => component.subjectName).join(", ");
}

function getAssignedComponentAssignments(offering: SubjectOffering) {
    return (offering.componentAssignments || []).filter(
        (component) => component.isAssigned && component.teacher
    );
}

function getCompactTeacherList(teachers: SubjectTeacherAssignment[], maxVisible = 2) {
    const labels = Array.from(
        new Set(teachers.map((teacher) => formatTeacherLabel(teacher)).filter(Boolean))
    );

    if (labels.length === 0) {
        return null;
    }

    if (labels.length <= maxVisible) {
        return labels.join(", ");
    }

    return `${labels.slice(0, maxVisible).join(", ")} +${labels.length - maxVisible}`;
}

function getOfferingCardMeta(offering: SubjectOffering) {
    const componentAssignments = offering.componentAssignments || [];

    if (componentAssignments.length > 0) {
        const assignedComponents = getAssignedComponentAssignments(offering);
        const missingCount = componentAssignments.length - assignedComponents.length;
        const assignedTeachers = assignedComponents
            .map((component) => component.teacher)
            .filter((teacher): teacher is SubjectTeacherAssignment => Boolean(teacher));
        const teacherList = getCompactTeacherList(assignedTeachers);

        return {
            headline:
                assignedComponents.length > 0
                    ? `${assignedComponents.length}/${componentAssignments.length} components assigned`
                    : "No component teacher assigned",
            detail: teacherList ? `Teachers: ${teacherList}` : null,
            statusClass:
                missingCount === 0
                    ? "bg-emerald-50 text-emerald-700"
                    : assignedComponents.length > 0
                        ? "bg-amber-50 text-amber-700"
                        : "bg-rose-50 text-rose-700",
            badge:
                missingCount === 0
                    ? "Complete"
                    : `${missingCount} component${missingCount === 1 ? "" : "s"} pending`,
        };
    }

    const hasTeacher = Boolean(offering.teacher || (offering.effectiveTeachers || []).length > 0);

    return {
        headline: getOfferingTeacherSummary(offering),
        detail: getOfferingAssignmentNote(offering),
        statusClass: hasTeacher ? "bg-slate-50 text-slate-700" : "bg-amber-50 text-amber-700",
        badge: hasTeacher ? "Assigned" : "Pending",
    };
}

function getOfferingEnrollmentLabel(offering: SubjectOffering) {
    if (typeof offering.enrollmentCount !== "number") {
        return null;
    }

    if (offering.enrollmentCount <= 0) {
        return "No students enrolled";
    }

    return `${offering.enrollmentCount} student${offering.enrollmentCount === 1 ? "" : "s"} enrolled`;
}

function getOfferingEnrollmentBadgeClass(offering: SubjectOffering) {
    if (typeof offering.enrollmentCount !== "number") {
        return "bg-slate-100 text-slate-600";
    }

    return offering.enrollmentCount > 0
        ? "bg-emerald-50 text-emerald-700"
        : "bg-rose-50 text-rose-700";
}

function normalizeCompositeErrorMessage(message: string | null | undefined, fallbackMessage: string) {
    if (!message) {
        return fallbackMessage;
    }

    const normalizedMessage = message.trim();
    const lowerMessage = normalizedMessage.toLowerCase();

    if (
        lowerMessage.includes("prisma.") ||
        lowerMessage.includes("connection pool") ||
        lowerMessage.includes("server has closed the connection") ||
        lowerMessage.includes("can't reach database server") ||
        lowerMessage.includes("temporarily unavailable and could not") ||
        lowerMessage.includes("database is temporarily busy")
    ) {
        return "Composite subject settings are temporarily unavailable because the database is busy. Please retry.";
    }

    return normalizedMessage;
}

export default function SubjectsPage() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [classArms, setClassArms] = useState<ClassArmOption[]>([]);
    const [schoolClasses, setSchoolClasses] = useState<SchoolClassOption[]>([]);
    const [sessions, setSessions] = useState<SessionOption[]>([]);
    const [enrollmentContext, setEnrollmentContext] = useState<EnrollmentContext | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [submitting, setSubmitting] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [viewSubject, setViewSubject] = useState<Subject | null>(null);
    const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
    const [deletingSubject, setDeletingSubject] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [importResults, setImportResults] = useState<{
        success: number;
        failed: number;
        errors: string[];
    } | null>(null);

    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [classLevelFilter, setClassLevelFilter] = useState<string>("ALL");

    const [showCompositeModal, setShowCompositeModal] = useState(false);
    const [compositeSubject, setCompositeSubject] = useState<Subject | null>(null);
    const [compositeSessionId, setCompositeSessionId] = useState("");
    const [compositeClassId, setCompositeClassId] = useState("");
    const [compositeConfigId, setCompositeConfigId] = useState<string | null>(null);
    const [compositeAssessmentTypes, setCompositeAssessmentTypes] = useState<AssessmentTypeOption[]>([]);
    const [compositeRows, setCompositeRows] = useState<CompositeComponentRow[]>([]);
    const [compositeLoading, setCompositeLoading] = useState(false);
    const [compositeSubmitting, setCompositeSubmitting] = useState(false);
    const [compositeDeleting, setCompositeDeleting] = useState(false);
    const [compositeError, setCompositeError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [subjectsRes, classesRes, sessionsRes] = await Promise.all([
                fetch("/api/subjects?includeComponents=true&includeEnrollmentStatus=true"),
                fetch("/api/classes"),
                fetch("/api/sessions"),
            ]);

            for (const response of [subjectsRes, classesRes, sessionsRes]) {
                if (await handleUnauthorizedApiResponse(response)) {
                    return;
                }
            }

            if (!subjectsRes.ok) throw new Error(await readApiError(subjectsRes, "Failed to fetch subjects"));
            if (!classesRes.ok) throw new Error(await readApiError(classesRes, "Failed to fetch classes"));
            if (!sessionsRes.ok) throw new Error(await readApiError(sessionsRes, "Failed to fetch sessions"));

            const subjectsData = await subjectsRes.json();
            const classesData = await classesRes.json();
            const sessionsData = await sessionsRes.json();

            const nextClassArms: ClassArmOption[] = [];
            const nextSchoolClasses: SchoolClassOption[] = [];

            if (classesData.classes) {
                classesData.classes.forEach((cls: any) => {
                    nextSchoolClasses.push({
                        id: cls.id,
                        name: cls.name,
                        level: cls.level,
                        armIds: Array.isArray(cls.arms) ? cls.arms.map((arm: any) => arm.id) : [],
                    });

                    if (Array.isArray(cls.arms)) {
                        cls.arms.forEach((arm: any) => {
                            nextClassArms.push({
                                id: arm.id,
                                name: `${cls.name} ${arm.armName}`,
                                level: cls.level,
                                classId: cls.id,
                            });
                        });
                    }
                });
            }

            setSubjects(subjectsData.subjects || []);
            setEnrollmentContext(subjectsData.enrollmentContext || null);
            setClassArms(nextClassArms);
            setSchoolClasses(nextSchoolClasses);
            setSessions(sessionsData.sessions || []);
            setError(null);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (selectedSubject) {
            setSelectedClassIds(selectedSubject.classIds || []);
        }
    }, [selectedSubject]);

    const getSubjectAssignedClassIds = useCallback(
        (subject: Subject | null) => {
            if (!subject) return [];

            const classIds = new Set<string>();
            const assignedArmIds = subject.classIds || subject.classArmIds || [];

            assignedArmIds.forEach((armId) => {
                const classArm = classArms.find((item) => item.id === armId);
                if (classArm) {
                    classIds.add(classArm.classId);
                }
            });

            return Array.from(classIds);
        },
        [classArms]
    );

    const loadCompositeConfig = useCallback(
        async (subject: Subject, sessionId: string, classId: string) => {
            setCompositeLoading(true);
            setCompositeError(null);

            try {
                const searchParams = new URLSearchParams({
                    parentSubjectId: subject.id,
                    sessionId,
                    classId,
                });

                const response = await fetch(`/api/subjects/composites?${searchParams.toString()}`);
                if (await handleUnauthorizedApiResponse(response)) {
                    return;
                }

                const result = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(
                        normalizeCompositeErrorMessage(
                            result?.error,
                            "Failed to load composite subject settings"
                        )
                    );
                }

                const parentAssessmentTypes: AssessmentTypeOption[] =
                    result.parentAssessmentTypes || result.config?.parentAssessmentTypes || [];

                setCompositeAssessmentTypes(parentAssessmentTypes);

                if (result.config) {
                    setCompositeConfigId(result.config.id);
                    setCompositeRows(
                        result.config.components.map((component: any) => ({
                            id: component.id,
                            mode: "existing" as const,
                            componentSubjectId: component.componentSubjectId,
                            createName: "",
                            createCode: "",
                            createCategory: subject.category,
                            ca1Max: String(component.ca1Max ?? 0),
                            ca2Max: String(component.ca2Max ?? 0),
                            ca3Max: String(component.ca3Max ?? 0),
                            examMax: String(component.examMax ?? 0),
                        }))
                    );
                } else {
                    setCompositeConfigId(null);
                    setCompositeRows([createCompositeRow(subject.category)]);
                }
            } catch (err: any) {
                setCompositeConfigId(null);
                setCompositeAssessmentTypes([]);
                setCompositeRows([createCompositeRow(subject.category)]);
                setCompositeError(
                    normalizeCompositeErrorMessage(
                        err.message,
                        "Failed to load composite subject settings"
                    )
                );
            } finally {
                setCompositeLoading(false);
            }
        },
        []
    );

    useEffect(() => {
        if (!showCompositeModal || !compositeSubject) return;

        if (!compositeSessionId && sessions.length > 0) {
            const currentSession = sessions.find((session) => session.isCurrent) || sessions[0];
            setCompositeSessionId(currentSession.id);
        }

        if (!compositeClassId && schoolClasses.length > 0) {
            const assignedClassIds = getSubjectAssignedClassIds(compositeSubject);
            setCompositeClassId(assignedClassIds[0] || schoolClasses[0].id);
        }
    }, [
        compositeClassId,
        compositeSessionId,
        compositeSubject,
        getSubjectAssignedClassIds,
        schoolClasses,
        sessions,
        showCompositeModal,
    ]);

    useEffect(() => {
        if (!showCompositeModal || !compositeSubject || !compositeSessionId || !compositeClassId) {
            return;
        }

        void loadCompositeConfig(compositeSubject, compositeSessionId, compositeClassId);
    }, [showCompositeModal, compositeSubject, compositeSessionId, compositeClassId, loadCompositeConfig]);

    const resetSubjectModal = () => {
        setShowAddModal(false);
        setSelectedSubject(null);
        setSelectedClassIds([]);
        setClassLevelFilter("ALL");
    };

    const closeCompositeModal = () => {
        setShowCompositeModal(false);
        setCompositeSubject(null);
        setCompositeSessionId("");
        setCompositeClassId("");
        setCompositeConfigId(null);
        setCompositeAssessmentTypes([]);
        setCompositeRows([]);
        setCompositeLoading(false);
        setCompositeSubmitting(false);
        setCompositeDeleting(false);
        setCompositeError(null);
    };

    const openCompositeModal = (subject: Subject) => {
        setCompositeSubject(subject);
        setCompositeSessionId("");
        setCompositeClassId("");
        setCompositeConfigId(null);
        setCompositeAssessmentTypes([]);
        setCompositeRows([createCompositeRow(subject.category)]);
        setCompositeError(null);
        setShowCompositeModal(true);
    };

    const handleAddSubject = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const data: any = {
            name: formData.get("name"),
            code: formData.get("code"),
            category: formData.get("category"),
            classIds: selectedClassIds,
        };

        if (selectedSubject) {
            data.id = selectedSubject.id;
            data.isActive = selectedSubject.isActive;
        }

        try {
            const response = await fetch("/api/subjects", {
                method: selectedSubject ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (await handleUnauthorizedApiResponse(response)) {
                return;
            }

            if (!response.ok) {
                throw new Error(
                    await readApiError(
                        response,
                        `Failed to ${selectedSubject ? "update" : "add"} subject`
                    )
                );
            }

            toast.success(selectedSubject ? "Subject updated." : "Subject created.");
            resetSubjectModal();
            void fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (subject: Subject) => {
        setSelectedSubject(subject);
        setClassLevelFilter("ALL");
        setShowAddModal(true);
    };

    const handleDeleteSubject = (subject: Subject) => {
        setSubjectToDelete(subject);
    };

    const confirmDeleteSubject = async () => {
        if (!subjectToDelete) return;
        setDeletingSubject(true);

        try {
            const response = await fetch(`/api/subjects?id=${subjectToDelete.id}`, {
                method: "DELETE",
            });

            if (await handleUnauthorizedApiResponse(response)) {
                return;
            }

            if (!response.ok) {
                throw new Error(await readApiError(response, "Failed to delete subject"));
            }

            toast.success("Subject deleted.");
            setSubjectToDelete(null);
            void fetchData();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete subject");
        } finally {
            setDeletingSubject(false);
        }
    };

    const downloadCSVTemplate = () => {
        const headers = [
            "Subject Name",
            "Subject Code",
            "Category",
            "Class Names (semicolon-separated)",
        ];

        const sampleRow = ["Mathematics", "MTH", "CORE", "JSS 1;JSS 2;JSS 3"];
        const instructionRow = [
            "Required",
            "Optional (auto-generated if empty)",
            "Required: CORE, SCIENCE, ARTS, COMMERCIAL, VOCATIONAL, or LANGUAGE",
            "Optional: Use semicolons to separate multiple classes",
        ];

        const csvContent = [
            headers.join(","),
            instructionRow.join(","),
            sampleRow.join(","),
            new Array(headers.length).fill("").join(","),
            new Array(headers.length).fill("").join(","),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "subjects_import_template.csv");
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

            const response = await fetch("/api/subjects/import", {
                method: "POST",
                body: formData,
            });

            if (await handleUnauthorizedApiResponse(response)) {
                return;
            }

            const result = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(result?.error || "Failed to import subjects");
            }

            if (!result) {
                throw new Error("Failed to import subjects");
            }

            setImportResults(result);

            if (result.success > 0) {
                toast.success(`${result.success} subject${result.success === 1 ? "" : "s"} imported.`);
                void fetchData();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setImporting(false);
        }
    };

    const handleCompositeRowChange = (
        rowId: string,
        key: keyof CompositeComponentRow,
        value: string
    ) => {
        setCompositeRows((prev) =>
            prev.map((row) =>
                row.id === rowId
                    ? {
                        ...row,
                        [key]: value,
                    }
                    : row
            )
        );
    };

    const addCompositeRow = () => {
        setCompositeRows((prev) => [...prev, createCompositeRow(compositeSubject?.category || "CORE")]);
    };

    const removeCompositeRow = (rowId: string) => {
        setCompositeRows((prev) => prev.filter((row) => row.id !== rowId));
    };

    const handleSaveCompositeConfig = async () => {
        if (!compositeSubject) return;
        if (!compositeSessionId || !compositeClassId) {
            setCompositeError("Select the session and class before saving component settings.");
            return;
        }

        const populatedRows = compositeRows.filter((row) => !isCompositeRowBlank(row));
        if (populatedRows.length === 0) {
            setCompositeError("Add at least one component subject before saving.");
            return;
        }

        let components: any[] = [];

        try {
            components = populatedRows.map((row, index) => {
                if (row.mode === "existing") {
                    if (!row.componentSubjectId) {
                        throw new Error("Every component row using an existing subject must select a subject.");
                    }

                    return {
                        componentSubjectId: row.componentSubjectId,
                        orderIndex: index,
                        ca1Max: toNumber(row.ca1Max),
                        ca2Max: toNumber(row.ca2Max),
                        ca3Max: toNumber(row.ca3Max),
                        examMax: toNumber(row.examMax),
                    };
                }

                if (!row.createName.trim()) {
                    throw new Error("Every new component row must include a subject name.");
                }

                return {
                    createComponent: {
                        name: row.createName.trim(),
                        code: row.createCode.trim(),
                        category: row.createCategory || compositeSubject.category,
                    },
                    orderIndex: index,
                    ca1Max: toNumber(row.ca1Max),
                    ca2Max: toNumber(row.ca2Max),
                    ca3Max: toNumber(row.ca3Max),
                    examMax: toNumber(row.examMax),
                };
            });
        } catch (err: any) {
            setCompositeError(
                normalizeCompositeErrorMessage(err.message, "Invalid component rows.")
            );
            return;
        }

        setCompositeSubmitting(true);
        setCompositeError(null);

        try {
            const response = await fetch("/api/subjects/composites", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    parentSubjectId: compositeSubject.id,
                    sessionId: compositeSessionId,
                    classId: compositeClassId,
                    components,
                }),
            });

            if (await handleUnauthorizedApiResponse(response)) {
                return;
            }

            const result = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    normalizeCompositeErrorMessage(
                        result?.error,
                        "Failed to save composite subject settings"
                    )
                );
            }

            if (!result) {
                throw new Error("Failed to save composite subject settings");
            }

            setCompositeConfigId(result.config?.id || null);
            setCompositeAssessmentTypes(result.parentAssessmentTypes || result.config?.parentAssessmentTypes || []);
            setCompositeRows(
                (result.config?.components || []).map((component: any) => ({
                    id: component.id,
                    mode: "existing" as const,
                    componentSubjectId: component.componentSubjectId,
                    createName: "",
                    createCode: "",
                    createCategory: compositeSubject.category,
                    ca1Max: String(component.ca1Max ?? 0),
                    ca2Max: String(component.ca2Max ?? 0),
                    ca3Max: String(component.ca3Max ?? 0),
                    examMax: String(component.examMax ?? 0),
                }))
            );
            setCompositeSubject((prev) =>
                prev
                    ? {
                        ...prev,
                        subjectKind: "COMPOSITE_PARENT",
                        isCompositeConfigured: true,
                    }
                    : prev
            );

            toast.success("Composite subject settings saved.");
            void fetchData();
        } catch (err: any) {
            setCompositeError(
                normalizeCompositeErrorMessage(
                    err.message,
                    "Failed to save composite subject settings"
                )
            );
        } finally {
            setCompositeSubmitting(false);
        }
    };

    const handleDeleteCompositeConfig = async () => {
        if (!compositeSubject || !compositeSessionId || !compositeClassId) return;
        if (!window.confirm(`Remove the composite setup for ${compositeSubject.name} in this class and session?`)) {
            return;
        }

        setCompositeDeleting(true);
        setCompositeError(null);

        try {
            const searchParams = new URLSearchParams({
                parentSubjectId: compositeSubject.id,
                sessionId: compositeSessionId,
                classId: compositeClassId,
            });

            const response = await fetch(`/api/subjects/composites?${searchParams.toString()}`, {
                method: "DELETE",
            });
            if (await handleUnauthorizedApiResponse(response)) {
                return;
            }

            const result = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(
                    normalizeCompositeErrorMessage(
                        result?.error,
                        "Failed to remove composite subject settings"
                    )
                );
            }

            setCompositeConfigId(null);
            setCompositeRows([createCompositeRow(compositeSubject.category)]);
            setCompositeSubject((prev) =>
                prev
                    ? {
                        ...prev,
                        subjectKind: "STANDARD",
                        isCompositeConfigured: false,
                    }
                    : prev
            );

            toast.success("Composite subject settings removed.");
            void fetchData();
            await loadCompositeConfig(compositeSubject, compositeSessionId, compositeClassId);
        } catch (err: any) {
            setCompositeError(
                normalizeCompositeErrorMessage(
                    err.message,
                    "Failed to remove composite subject settings"
                )
            );
        } finally {
            setCompositeDeleting(false);
        }
    };

    const hiddenComponentNameSet = new Set(
        subjects
            .filter((subject) => subject.subjectKind === "COMPOSITE_COMPONENT" || Boolean(subject.parentSubjectId))
            .map((subject) => normalizeSubjectListingName(subject.name))
    );

    const visibleSubjects = subjects.filter((subject) => isStandaloneVisibleSubject(subject, hiddenComponentNameSet));

    const filteredSubjects = visibleSubjects.filter((subject) => {
        const matchesSearch =
            subject.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (subject.code && subject.code.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = selectedCategory === "All" || subject.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const unenrolledOfferings = filteredSubjects
        .flatMap((subject) =>
            (subject.offerings || [])
                .filter((offering) => offering.hasEnrolledStudents === false)
                .map((offering) => ({
                    subject,
                    offering,
                }))
        )
        .sort((left, right) => {
            const classCompare = formatOfferingLabel(left.offering).localeCompare(
                formatOfferingLabel(right.offering),
                undefined,
                { numeric: true, sensitivity: "base" }
            );

            if (classCompare !== 0) {
                return classCompare;
            }

            return left.subject.name.localeCompare(right.subject.name, undefined, {
                numeric: true,
                sensitivity: "base",
            });
        });

    const enrollmentPeriodLabel = enrollmentContext
        ? `${enrollmentContext.termName}, ${enrollmentContext.sessionName}`
        : "the current term";

    const categories = ["All", "CORE", "SCIENCE", "ARTS", "COMMERCIAL", "VOCATIONAL", "LANGUAGE"];

    const filteredClassArms = classArms.filter((cls) => {
        if (classLevelFilter === "ALL") return true;
        return cls.level === classLevelFilter;
    });

    const toggleClassSelection = (classId: string) => {
        setSelectedClassIds((prev) =>
            prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
        );
    };

    const selectAllInFilter = () => {
        const idsToAdd = filteredClassArms.map((cls) => cls.id);
        setSelectedClassIds((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    };

    const deselectAllInFilter = () => {
        const idsToRemove = new Set(filteredClassArms.map((cls) => cls.id));
        setSelectedClassIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
    };

    const isAllSelectedInFilter =
        filteredClassArms.length > 0 &&
        filteredClassArms.every((cls) => selectedClassIds.includes(cls.id));

    const compositeAssessmentFields = mapAssessmentTypesToScoreFields(compositeAssessmentTypes);
    const componentTotalsByField = compositeAssessmentFields.reduce<Record<ScoreFieldKey, number>>(
        (totals, assessmentType) => {
            totals[assessmentType.field] = compositeRows.reduce(
                (sum, row) => roundCompositeMax(sum + getCompositeFieldValue(row, assessmentType.field)),
                0
            );
            return totals;
        },
        { ca1: 0, ca2: 0, ca3: 0, exam: 0 }
    );

    const compositeCandidateSubjects = subjects
        .filter((subject) => subject.id !== compositeSubject?.id && subject.subjectKind !== "COMPOSITE_PARENT")
        .sort((left, right) => left.name.localeCompare(right.name));

    const assignedCompositeClassIds = getSubjectAssignedClassIds(compositeSubject);
    const selectedCompositeClass = schoolClasses.find((schoolClass) => schoolClass.id === compositeClassId) || null;
    const selectedCompositeClassArmCount = compositeSubject
        ? classArms.filter(
            (classArm) =>
                classArm.classId === compositeClassId &&
                (compositeSubject.classIds || compositeSubject.classArmIds || []).includes(classArm.id)
        ).length
        : 0;

    const pageContent = (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
                    <p className="text-gray-500 mt-1">
                        Manage subjects, class-arm assignments, and composite subject structures.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={downloadCSVTemplate}
                        className="btn-secondary flex items-center gap-2"
                        title="Download CSV template for bulk subject upload"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                        </svg>
                        Download Template
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            />
                        </svg>
                        Import CSV
                    </button>
                    <button
                        onClick={() => {
                            setSelectedSubject(null);
                            setSelectedClassIds([]);
                            setClassLevelFilter("ALL");
                            setShowAddModal(true);
                        }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Subject
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{visibleSubjects.length}</p>
                            <p className="text-sm text-gray-500">Total Subjects</p>
                        </div>
                    </div>
                </div>

                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {subjects.filter((subject) => subject.subjectKind === "COMPOSITE_PARENT").length}
                            </p>
                            <p className="text-sm text-gray-500">Composite Parents</p>
                        </div>
                    </div>
                </div>

                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {visibleSubjects.filter((subject) => subject.subjectKind === "STANDARD").length}
                            </p>
                            <p className="text-sm text-gray-500">Standard Subjects</p>
                        </div>
                    </div>
                </div>

                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">
                                {visibleSubjects.filter((subject) => subject.isActive).length}
                            </p>
                            <p className="text-sm text-gray-500">Active Subjects</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Search subjects..."
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
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>

                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="input w-full md:w-48"
                    >
                        {categories.map((category) => (
                            <option key={category} value={category}>
                                {category === "All" ? "All Categories" : category}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="card p-6">
                <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Pending Student Enrollment</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Subject offerings with no active student enrollment for {enrollmentPeriodLabel}.
                        </p>
                    </div>
                    <span
                        className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            unenrolledOfferings.length > 0
                                ? "bg-rose-50 text-rose-700"
                                : "bg-emerald-50 text-emerald-700"
                        }`}
                    >
                        {unenrolledOfferings.length} offering{unenrolledOfferings.length === 1 ? "" : "s"}
                    </span>
                </div>

                {unenrolledOfferings.length > 0 ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100">
                        <div className="grid grid-cols-1 gap-3 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
                            <p>Subject</p>
                            <p>Class Arm</p>
                            <p>Teacher</p>
                        </div>
                        <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                            {unenrolledOfferings.map(({ subject, offering }) => (
                                <div
                                    key={`${subject.id}:${offering.classArmId}`}
                                    className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]"
                                >
                                    <div className="min-w-0">
                                        <button
                                            type="button"
                                            onClick={() => setViewSubject(subject)}
                                            className="text-left font-medium text-gray-900 transition-colors hover:text-primary-700"
                                        >
                                            {subject.name}
                                        </button>
                                        <p className="mt-1 text-sm text-gray-500">
                                            {subject.code || "No code"} • {subjectKindStyles[subject.subjectKind].label}
                                        </p>
                                    </div>

                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900">{formatOfferingLabel(offering)}</p>
                                        <p className="mt-1 text-sm text-gray-500">{formatLevel(offering.level)}</p>
                                        {getOfferingEnrollmentLabel(offering) && (
                                            <span
                                                className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getOfferingEnrollmentBadgeClass(offering)}`}
                                            >
                                                {getOfferingEnrollmentLabel(offering)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <p className="font-medium text-gray-900">{getOfferingTeacherSummary(offering)}</p>
                                        {offering.teacher?.email && (
                                            <p className="mt-1 truncate text-sm text-gray-500">{offering.teacher.email}</p>
                                        )}
                                        {getOfferingAssignmentNote(offering) && (
                                            <p className="mt-1 text-xs text-gray-500">
                                                {getOfferingAssignmentNote(offering)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-6">
                        <p className="font-medium text-emerald-800">Every visible subject offering has student enrollment.</p>
                        <p className="mt-1 text-sm text-emerald-700">
                            No subject-class arm is waiting for student enrollment for {enrollmentPeriodLabel}.
                        </p>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            ) : filteredSubjects.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm border border-gray-100">
                    <p>No subjects matched your filters.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredSubjects.map((subject) => (
                        (() => {
                            const assignmentSummary = getSubjectAssignmentSummary(subject);
                            const previewOfferings = subject.offerings?.slice(0, 2) || [];

                            return (
                                <div
                                    key={subject.id}
                                    className="card p-5 hover:shadow-card-hover transition-shadow flex flex-col justify-between gap-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div className="h-11 w-11 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                                                <span className="text-primary-700 font-bold text-sm">
                                                    {(subject.code || subject.name.slice(0, 3)).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5">
                                                <div className="space-y-1">
                                                    <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                                                    <p className="text-sm text-gray-500 leading-5">{describeSubject(subject)}</p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${categoryColors[subject.category]?.bg || "bg-gray-100"} ${categoryColors[subject.category]?.text || "text-gray-800"}`}
                                                    >
                                                        {subject.category}
                                                    </span>
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${subjectKindStyles[subject.subjectKind].className}`}
                                                    >
                                                        {subjectKindStyles[subject.subjectKind].label}
                                                    </span>
                                                    {subject.parentSubjectName && subject.subjectKind === "COMPOSITE_COMPONENT" && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                                            Parent: {subject.parentSubjectName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDeleteSubject(subject)}
                                            className="text-gray-400 hover:text-red-500 p-1"
                                            title="Delete Subject"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                />
                                            </svg>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3 sm:grid-cols-4">
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-gray-500">Class Arms</p>
                                            <p className="mt-1 text-lg font-semibold text-gray-900">
                                                {assignmentSummary.totalOfferings}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-gray-500">Assigned Arms</p>
                                            <p className="mt-1 text-lg font-semibold text-emerald-700">
                                                {assignmentSummary.assignedOfferings}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-gray-500">Teachers</p>
                                            <p className="mt-1 text-lg font-semibold text-gray-900">
                                                {assignmentSummary.teachersCount}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-wide text-gray-500">Pending</p>
                                            <p className="mt-1 text-lg font-semibold text-amber-700">
                                                {assignmentSummary.unassignedOfferings}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-gray-100 bg-white px-3 py-3 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="font-medium text-gray-800">At a glance</p>
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    assignmentSummary.unassignedOfferings > 0
                                                        ? "bg-amber-50 text-amber-700"
                                                        : "bg-emerald-50 text-emerald-700"
                                                }`}
                                            >
                                                {assignmentSummary.unassignedOfferings > 0
                                                    ? `${assignmentSummary.unassignedOfferings} unassigned`
                                                    : "Fully assigned"}
                                            </span>
                                        </div>

                                        {previewOfferings.length > 0 ? (
                                            <div className="mt-3 space-y-2.5">
                                                {previewOfferings.map((offering) => {
                                                    const offeringMeta = getOfferingCardMeta(offering);

                                                    return (
                                                        <div
                                                            key={offering.classArmId}
                                                            className="rounded-lg border border-gray-100 px-3 py-2.5"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="font-medium text-gray-700">
                                                                        {formatOfferingLabel(offering)}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {formatLevel(offering.level)}
                                                                    </p>
                                                                    {getOfferingEnrollmentLabel(offering) && (
                                                                        <span
                                                                            className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getOfferingEnrollmentBadgeClass(offering)}`}
                                                                        >
                                                                            {getOfferingEnrollmentLabel(offering)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-right">
                                                                    <span
                                                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${offeringMeta.statusClass}`}
                                                                    >
                                                                        {offeringMeta.badge}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="mt-2 flex items-start justify-between gap-3">
                                                                <p className="text-sm text-gray-700">
                                                                    {offeringMeta.headline}
                                                                </p>
                                                                {offeringMeta.detail && (
                                                                    <p className="max-w-[55%] text-right text-xs text-gray-500">
                                                                        {offeringMeta.detail}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <button
                                                    onClick={() => setViewSubject(subject)}
                                                    className="text-sm font-medium text-primary-600 hover:text-primary-700"
                                                >
                                                    View all {subject.offerings?.length || 0} class-arm assignments
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="mt-3 text-sm text-gray-500 italic">
                                                No class arms are offering this subject yet.
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${subject.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                                        >
                                            {subject.isActive ? "Active" : "Inactive"}
                                        </span>

                                        <div className="flex items-center gap-2 flex-wrap justify-end">
                                            {subject.subjectKind !== "COMPOSITE_COMPONENT" && (
                                                <button
                                                    onClick={() => openCompositeModal(subject)}
                                                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                                                >
                                                    {subject.subjectKind === "COMPOSITE_PARENT" ? "Edit Components" : "Configure Components"}
                                                </button>
                                            )}
                                            <button
                                                onClick={() => setViewSubject(subject)}
                                                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                            >
                                                View Assignments
                                            </button>
                                            <button
                                                onClick={() => handleEdit(subject)}
                                                className="p-1 text-gray-400 hover:text-primary-600 rounded-full hover:bg-primary-50 transition-colors"
                                                title="Edit Subject"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()
                    ))}
                </div>
            )}
        </div>
    );

    const deleteConfirmationModal = subjectToDelete ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">Delete Subject?</h3>
                <p className="text-gray-500 text-center mb-6">
                    Are you sure you want to delete{" "}
                    <span className="font-semibold text-gray-700">{subjectToDelete.name}</span>? This action
                    cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => setSubjectToDelete(null)}
                        className="btn-secondary flex-1"
                        disabled={deletingSubject}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={confirmDeleteSubject}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={deletingSubject}
                    >
                        {deletingSubject ? "Deleting..." : "Delete Subject"}
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    const viewSubjectModal = viewSubject ? (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={() => setViewSubject(null)} />

                <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-xl">
                    <div className="flex max-h-[88vh] flex-col overflow-hidden">
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-semibold text-gray-900">{viewSubject.name}</h3>
                                    <p className="text-sm text-gray-500">
                                        Review every class arm offering this subject and the teacher assigned to it.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span
                                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${categoryColors[viewSubject.category]?.bg || "bg-gray-100"} ${categoryColors[viewSubject.category]?.text || "text-gray-800"}`}
                                    >
                                        {viewSubject.category}
                                    </span>
                                    <span
                                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${subjectKindStyles[viewSubject.subjectKind].className}`}
                                    >
                                        {subjectKindStyles[viewSubject.subjectKind].label}
                                    </span>
                                    <span
                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                            viewSubject.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700"
                                        }`}
                                    >
                                        {viewSubject.isActive ? "Active" : "Inactive"}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setViewSubject(null)} className="text-gray-400 hover:text-gray-500">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6 overflow-y-auto px-6 py-5">
                            {(() => {
                                const assignmentSummary = getSubjectAssignmentSummary(viewSubject);
                                const offerings = viewSubject.offerings || [];

                                return (
                                    <>
                                        <div className="grid gap-3 md:grid-cols-4">
                                            <div className="rounded-2xl border border-gray-100 bg-slate-50 px-4 py-4">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Class Arms Offering
                                                </p>
                                                <p className="mt-2 text-2xl font-semibold text-gray-900">
                                                    {assignmentSummary.totalOfferings}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-gray-100 bg-emerald-50 px-4 py-4">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                                                    Arms Assigned
                                                </p>
                                                <p className="mt-2 text-2xl font-semibold text-emerald-800">
                                                    {assignmentSummary.assignedOfferings}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-gray-100 bg-blue-50 px-4 py-4">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                                                    Teachers Covering Subject
                                                </p>
                                                <p className="mt-2 text-2xl font-semibold text-blue-800">
                                                    {assignmentSummary.teachersCount}
                                                </p>
                                            </div>
                                            <div className="rounded-2xl border border-gray-100 bg-amber-50 px-4 py-4">
                                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                                    Pending Arms
                                                </p>
                                                <p className="mt-2 text-2xl font-semibold text-amber-800">
                                                    {assignmentSummary.unassignedOfferings}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
                                            <div className="space-y-4 rounded-2xl border border-gray-100 bg-gray-50 p-5">
                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                        Code
                                                    </label>
                                                    <p className="mt-1 font-medium text-gray-900">{viewSubject.code || "N/A"}</p>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                        Visibility
                                                    </label>
                                                    <p className="mt-1 text-sm text-gray-700">
                                                        {viewSubject.isReportVisible === false
                                                            ? "Hidden from student-facing reports and broadsheets"
                                                            : "Visible to students and reports"}
                                                    </p>
                                                </div>

                                                {viewSubject.parentSubjectName && (
                                                    <div>
                                                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                            Linked Parent Subject
                                                        </label>
                                                        <p className="mt-1 font-medium text-gray-900">
                                                            {viewSubject.parentSubjectName}
                                                        </p>
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                        Classes Covered
                                                    </label>
                                                    <p className="mt-1 font-medium text-gray-900">
                                                        {assignmentSummary.classesCount}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-gray-100 bg-white p-5">
                                                <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
                                                    <div>
                                                        <h4 className="text-base font-semibold text-gray-900">
                                                            Class-arm assignments
                                                        </h4>
                                                        <p className="text-sm text-gray-500">
                                                            Each row shows the class arm offering this subject and the teacher currently responsible.
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                                                            assignmentSummary.unassignedOfferings > 0
                                                                ? "bg-amber-50 text-amber-700"
                                                                : "bg-emerald-50 text-emerald-700"
                                                        }`}
                                                    >
                                                        {assignmentSummary.unassignedOfferings > 0
                                                            ? `${assignmentSummary.unassignedOfferings} arm${assignmentSummary.unassignedOfferings === 1 ? "" : "s"} still need assignment`
                                                            : "Every offering arm has a teacher"}
                                                    </span>
                                                </div>

                                                {offerings.length > 0 ? (
                                                    <div className="mt-4 space-y-3">
                                                        {offerings.map((offering) => (
                                                            <div
                                                                key={offering.classArmId}
                                                                className="flex flex-col gap-3 rounded-xl border border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                                            >
                                                                <div>
                                                                    <p className="font-medium text-gray-900">
                                                                        {formatOfferingLabel(offering)}
                                                                    </p>
                                                                    <p className="text-sm text-gray-500">
                                                                        {formatLevel(offering.level)}
                                                                    </p>
                                                                    {getOfferingEnrollmentLabel(offering) && (
                                                                        <span
                                                                            className={`mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getOfferingEnrollmentBadgeClass(offering)}`}
                                                                        >
                                                                            {getOfferingEnrollmentLabel(offering)}
                                                                        </span>
                                                                    )}
                                                                    {offering.componentAssignments && offering.componentAssignments.length > 0 && (
                                                                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                                                                                Component coverage
                                                                            </p>
                                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                                {offering.componentAssignments.map((component) => (
                                                                                    <span
                                                                                        key={`${offering.classArmId}-${component.subjectId}`}
                                                                                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                                                            component.isAssigned
                                                                                                ? "bg-emerald-50 text-emerald-700"
                                                                                                : "bg-amber-50 text-amber-700"
                                                                                        }`}
                                                                                    >
                                                                                        {component.subjectName}:{" "}
                                                                                        {component.teacher
                                                                                            ? formatTeacherLabel(component.teacher)
                                                                                            : "Unassigned"}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                            {getMissingComponentLabel(offering) && (
                                                                                <p className="mt-2 text-xs text-amber-700">
                                                                                    Missing: {getMissingComponentLabel(offering)}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {offering.teacher ? (
                                                                    <div className="sm:text-right">
                                                                        <p className="font-medium text-gray-900">
                                                                            {getOfferingTeacherSummary(offering)}
                                                                        </p>
                                                                        {offering.teacher?.email && (
                                                                            <p className="text-sm text-gray-500">
                                                                                {offering.teacher.email}
                                                                            </p>
                                                                        )}
                                                                        {getOfferingAssignmentNote(offering) && (
                                                                            <p className="mt-1 text-xs text-gray-500">
                                                                                {getOfferingAssignmentNote(offering)}
                                                                            </p>
                                                                        )}
                                                                        {!offering.teacher.isActive && (
                                                                            <span className="mt-2 inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                                                                                Teacher inactive
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (offering.effectiveTeachers || []).length > 0 ? (
                                                                    <div className="sm:text-right">
                                                                        <p className="font-medium text-gray-900">
                                                                            {getOfferingTeacherSummary(offering)}
                                                                        </p>
                                                                        {getOfferingAssignmentNote(offering) && (
                                                                            <p className="mt-1 text-xs text-gray-500">
                                                                                {getOfferingAssignmentNote(offering)}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <div className="sm:text-right">
                                                                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                                                            No teacher assigned
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
                                                        <p className="text-sm font-medium text-gray-700">
                                                            No class arms are offering this subject yet.
                                                        </p>
                                                        <p className="mt-1 text-sm text-gray-500">
                                                            Assign the subject to one or more class arms to start teacher allocation.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
                            {viewSubject.subjectKind !== "COMPOSITE_COMPONENT" && (
                                <button
                                    onClick={() => {
                                        setViewSubject(null);
                                        openCompositeModal(viewSubject);
                                    }}
                                    className="btn-secondary"
                                >
                                    Configure Components
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    handleEdit(viewSubject);
                                    setViewSubject(null);
                                }}
                                className="btn-primary"
                            >
                                Edit Subject
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    const addSubjectModal = showAddModal ? (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={resetSubjectModal} />

                <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">
                            {selectedSubject ? "Edit Subject" : "Add New Subject"}
                        </h3>
                        <button onClick={resetSubjectModal} className="text-gray-400 hover:text-gray-500">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="sr-only">Close</span>
                        </button>
                    </div>

                    <form onSubmit={handleAddSubject} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
                            <input
                                name="name"
                                type="text"
                                defaultValue={selectedSubject?.name}
                                className="input w-full"
                                placeholder="e.g., Mathematics"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code</label>
                            <input
                                name="code"
                                type="text"
                                defaultValue={selectedSubject?.code}
                                className="input w-full"
                                placeholder="e.g., MTH"
                                maxLength={5}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                            <select
                                name="category"
                                className="input w-full"
                                required
                                defaultValue={selectedSubject?.category || ""}
                            >
                                <option value="">Select category</option>
                                <option value="CORE">Core</option>
                                <option value="SCIENCE">Science</option>
                                <option value="ARTS">Arts</option>
                                <option value="COMMERCIAL">Commercial</option>
                                <option value="VOCATIONAL">Vocational</option>
                                <option value="LANGUAGE">Language</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Assign to Class Arms
                            </label>

                            <div className="flex gap-2 mb-3 flex-wrap">
                                {classLevelTabs.map((level) => (
                                    <button
                                        key={level.value}
                                        type="button"
                                        onClick={() => setClassLevelFilter(level.value)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${classLevelFilter === level.value ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                                    >
                                        {level.label}
                                    </button>
                                ))}
                            </div>

                            {filteredClassArms.length > 0 && (
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-500">
                                        {selectedClassIds.length} class arm{selectedClassIds.length !== 1 ? "s" : ""} selected
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => (isAllSelectedInFilter ? deselectAllInFilter() : selectAllInFilter())}
                                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                                    >
                                        {isAllSelectedInFilter ? "Deselect All" : "Select All"}
                                    </button>
                                </div>
                            )}

                            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
                                {filteredClassArms.length > 0 ? (
                                    filteredClassArms.map((cls) => (
                                        <label
                                            key={cls.id}
                                            className="flex items-center gap-2 cursor-pointer hover:bg-white px-2 py-1 rounded transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedClassIds.includes(cls.id)}
                                                onChange={() => toggleClassSelection(cls.id)}
                                                className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                                            />
                                            <span className="text-sm text-gray-700">
                                                {cls.name}
                                                <span className="text-xs text-gray-500 ml-1">({formatLevel(cls.level)})</span>
                                            </span>
                                        </label>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-400 italic text-center py-4">
                                        No class arms available in this category
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                            <button type="button" onClick={resetSubjectModal} className="btn-secondary" disabled={submitting}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary" disabled={submitting}>
                                {submitting ? "Saving..." : selectedSubject ? "Update Subject" : "Add Subject"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    ) : null;

    const compositeConfigModal = showCompositeModal && compositeSubject ? (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={closeCompositeModal} />

                <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
                    <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200">
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Configure Components for {compositeSubject.name}
                                </h3>
                                <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${subjectKindStyles[compositeSubject.subjectKind].className}`}
                                >
                                    {subjectKindStyles[compositeSubject.subjectKind].label}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 max-w-3xl">
                                The main subject remains the only student-facing subject. Teachers enter scores on the
                                component subjects below, and the system sums those scores back into{" "}
                                {compositeSubject.name} for each configured assessment type.
                            </p>
                        </div>
                        <button onClick={closeCompositeModal} className="text-gray-400 hover:text-gray-500">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                        <div className="space-y-6">
                        {compositeError && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                                {compositeError}
                            </div>
                        )}

                        <div className="grid lg:grid-cols-2 gap-4">
                            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Academic Session</label>
                                <select
                                    value={compositeSessionId}
                                    onChange={(e) => setCompositeSessionId(e.target.value)}
                                    className="input w-full"
                                    disabled={compositeLoading || compositeSubmitting || compositeDeleting}
                                >
                                    <option value="">Select session</option>
                                    {sessions.map((session) => (
                                        <option key={session.id} value={session.id}>
                                            {session.name}
                                            {session.isCurrent ? " (Current)" : ""}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-2">
                                    Composite subject settings are saved per session so past sessions keep their own structure.
                                </p>
                            </div>

                            <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                                <select
                                    value={compositeClassId}
                                    onChange={(e) => setCompositeClassId(e.target.value)}
                                    className="input w-full"
                                    disabled={compositeLoading || compositeSubmitting || compositeDeleting}
                                >
                                    <option value="">Select class</option>
                                    {schoolClasses.map((schoolClass) => {
                                        const assigned = assignedCompositeClassIds.includes(schoolClass.id);
                                        return (
                                            <option key={schoolClass.id} value={schoolClass.id}>
                                                {schoolClass.name}
                                                {assigned ? " (assigned)" : ""}
                                            </option>
                                        );
                                    })}
                                </select>
                                <p className="text-xs text-gray-500 mt-2">
                                    The selected class should already have this parent subject assigned to at least one class arm.
                                </p>
                            </div>
                        </div>

                        {selectedCompositeClass && selectedCompositeClassArmCount === 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                                {compositeSubject.name} is not currently assigned to any class arm in{" "}
                                {selectedCompositeClass.name}. You can still save the composite setup, but score entry
                                will only work after the parent subject is assigned to class arms in that class.
                            </div>
                        )}

                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-4">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-indigo-900">Parent Assessment Settings</h4>
                                    <p className="text-sm text-indigo-700 mt-1">
                                        These maxima come from the grading settings for the selected class. Your component
                                        splits must add up exactly.
                                    </p>
                                </div>
                                {compositeConfigId && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white text-indigo-700 border border-indigo-200">
                                        Composite setup active
                                    </span>
                                )}
                            </div>

                            {compositeLoading ? (
                                <div className="flex justify-center py-6">
                                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600"></div>
                                </div>
                            ) : compositeAssessmentFields.length === 0 ? (
                                <p className="text-sm text-indigo-700">
                                    {compositeError
                                        ? "Assessment settings will appear here once the current loading error is resolved."
                                        : "No assessment types were resolved for the selected class yet. Configure assessment types first in Settings."}
                                </p>
                            ) : (
                                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                                    {compositeAssessmentFields.map((assessmentType) => {
                                        const componentTotal = componentTotalsByField[assessmentType.field];
                                        const parentMax = roundCompositeMax(Number(assessmentType.maxScore || 0));
                                        const matches = compositeMaxMatches(componentTotal, parentMax);

                                        return (
                                            <div
                                                key={assessmentType.id}
                                                className={`rounded-xl border px-4 py-3 ${matches ? "border-green-200 bg-white" : "border-red-200 bg-white"}`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {assessmentType.shortName || assessmentType.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {scoreFieldLabels[assessmentType.field]}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${assessmentType.includeInTotal === false ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-700"}`}
                                                    >
                                                        {assessmentType.includeInTotal === false ? "Recorded only" : "Counted"}
                                                    </span>
                                                </div>
                                                <div className="mt-3 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500">Main max</span>
                                                        <span className="font-semibold text-gray-900">{formatCompositeMax(parentMax)}</span>
                                                    </div>
                                                    <div className="flex justify-between mt-1">
                                                        <span className="text-gray-500">Component sum</span>
                                                        <span className={`font-semibold ${matches ? "text-green-700" : "text-red-700"}`}>
                                                            {formatCompositeMax(componentTotal)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div>
                                    <h4 className="text-base font-semibold text-gray-900">Component Subjects</h4>
                                    <p className="text-sm text-gray-500">
                                        Existing subjects can be reused, or you can create new component subjects inline during setup.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addCompositeRow}
                                    className="btn-secondary"
                                    disabled={compositeLoading || compositeSubmitting || compositeDeleting}
                                >
                                    Add Component
                                </button>
                            </div>

                            {compositeRows.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                                    No component subjects added yet.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {compositeRows.map((row, index) => (
                                        <div key={row.id} className="rounded-2xl border border-gray-200 p-4 space-y-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h5 className="text-sm font-semibold text-gray-900">Component {index + 1}</h5>
                                                    <p className="text-xs text-gray-500">
                                                        Set the teacher-entered subject and how much it contributes to each assessment type.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeCompositeRow(row.id)}
                                                    className="text-sm text-red-600 hover:text-red-700"
                                                    disabled={compositeSubmitting || compositeDeleting}
                                                >
                                                    Remove
                                                </button>
                                            </div>

                                            <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-4">
                                                <div className="space-y-2">
                                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                        Component Type
                                                    </label>
                                                    <select
                                                        value={row.mode}
                                                        onChange={(e) =>
                                                            handleCompositeRowChange(
                                                                row.id,
                                                                "mode",
                                                                e.target.value as "existing" | "new"
                                                            )
                                                        }
                                                        className="input w-full"
                                                        disabled={compositeSubmitting || compositeDeleting}
                                                    >
                                                        <option value="existing">Use existing subject</option>
                                                        <option value="new">Create new subject</option>
                                                    </select>
                                                </div>

                                                {row.mode === "existing" ? (
                                                    <div className="space-y-2">
                                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                            Subject
                                                        </label>
                                                        <select
                                                            value={row.componentSubjectId}
                                                            onChange={(e) => handleCompositeRowChange(row.id, "componentSubjectId", e.target.value)}
                                                            className="input w-full"
                                                            disabled={compositeSubmitting || compositeDeleting}
                                                        >
                                                            <option value="">Select subject</option>
                                                            {compositeCandidateSubjects.map((subject) => (
                                                                <option key={subject.id} value={subject.id}>
                                                                    {subject.name}
                                                                    {subject.parentSubjectName
                                                                        ? ` (Component of ${subject.parentSubjectName})`
                                                                        : ""}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ) : (
                                                    <div className="grid md:grid-cols-3 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                                New Subject Name
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={row.createName}
                                                                onChange={(e) => handleCompositeRowChange(row.id, "createName", e.target.value)}
                                                                className="input w-full"
                                                                placeholder="e.g. Music"
                                                                disabled={compositeSubmitting || compositeDeleting}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                                Code
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={row.createCode}
                                                                onChange={(e) => handleCompositeRowChange(row.id, "createCode", e.target.value)}
                                                                className="input w-full"
                                                                placeholder="e.g. MUS"
                                                                maxLength={5}
                                                                disabled={compositeSubmitting || compositeDeleting}
                                                            />
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                                Category
                                                            </label>
                                                            <select
                                                                value={row.createCategory}
                                                                onChange={(e) => handleCompositeRowChange(row.id, "createCategory", e.target.value)}
                                                                className="input w-full"
                                                                disabled={compositeSubmitting || compositeDeleting}
                                                            >
                                                                {categories
                                                                    .filter((category) => category !== "All")
                                                                    .map((category) => (
                                                                        <option key={category} value={category}>
                                                                            {category}
                                                                        </option>
                                                                    ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                                                {compositeAssessmentFields.map((assessmentType) => {
                                                    const fieldKey = scoreFieldRowKey[assessmentType.field];
                                                    return (
                                                        <div key={`${row.id}-${assessmentType.field}`} className="space-y-2">
                                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                                {assessmentType.shortName || assessmentType.name}
                                                            </label>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                step={0.01}
                                                                value={row[fieldKey]}
                                                                onChange={(e) => handleCompositeRowChange(row.id, fieldKey, e.target.value)}
                                                                className="input w-full"
                                                                placeholder={`Max ${formatCompositeMax(Number(assessmentType.maxScore || 0))}`}
                                                                disabled={compositeSubmitting || compositeDeleting}
                                                            />
                                                            <p className="text-xs text-gray-500">
                                                                Parent max: {formatCompositeMax(Number(assessmentType.maxScore || 0))}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        </div>
                    </div>

                    <div className="border-t border-gray-200 bg-white px-6 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-gray-500">
                                {compositeConfigId
                                    ? "Saving here updates the active composite setup for the selected session and class."
                                    : "Save to turn this subject into a composite parent for the selected session and class."}
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-3">
                                {compositeConfigId && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteCompositeConfig}
                                        className="px-4 py-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 transition-colors font-medium disabled:opacity-60"
                                        disabled={compositeDeleting || compositeSubmitting}
                                    >
                                        {compositeDeleting ? "Removing..." : "Remove Composite Setup"}
                                    </button>
                                )}
                                <button type="button" onClick={closeCompositeModal} className="btn-secondary">
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveCompositeConfig}
                                    className="btn-primary"
                                    disabled={compositeLoading || compositeSubmitting || compositeDeleting}
                                >
                                    {compositeSubmitting ? "Saving..." : "Save Component Setup"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    const importModal = showImportModal ? (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-gray-500/75 transition-opacity" onClick={() => !importing && setShowImportModal(false)} />

                <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Import Subjects from CSV</h3>
                        <button
                            onClick={() => {
                                if (!importing) {
                                    setShowImportModal(false);
                                    setImportFile(null);
                                    setImportResults(null);
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
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-blue-700">
                                        Download the CSV template first, fill it with your subjects data, then upload it here.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select CSV File</label>
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

                        {importResults && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-green-600">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-medium">
                                        {importResults.success} subjects imported successfully
                                    </span>
                                </div>

                                {importResults.failed > 0 && (
                                    <div>
                                        <div className="flex items-center gap-2 text-red-600 mb-2">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <span className="font-medium">{importResults.failed} subjects failed</span>
                                        </div>
                                        <div className="bg-red-50 rounded-md p-3 max-h-40 overflow-y-auto">
                                            <ul className="text-sm text-red-700 space-y-1">
                                                {importResults.errors.map((importError, idx) => (
                                                    <li key={idx}>- {importError}</li>
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
                                    setShowImportModal(false);
                                    setImportFile(null);
                                    setImportResults(null);
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
    ) : null;

    return (
        <>
            {pageContent}
            {deleteConfirmationModal}
            {viewSubjectModal}
            {addSubjectModal}
            {compositeConfigModal}
            {importModal}
        </>
    );
}
