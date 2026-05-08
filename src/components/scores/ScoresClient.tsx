"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";

import {
    StudentScore,
    EnrollmentStudent,
    AssessmentType,
    AssessmentTypeComponent,
    ClassLink,
    GradingRule,
    Subject,
    Session,
    Term,
    SchoolCategory,
    ScoreWorkflowState,
    ScoreSubjectMeta,
} from "./types";

interface ScoreColumn {
    kind: "assessment" | "component" | "ca-total";
    field: string;
    name: string;
    maxScore: number;
    isReadOnly?: boolean;
    parentField?: string;
    componentId?: string;
}

import { Card } from "@/components/ui/Card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";
import { calculateEndOfTermScoreTotals, getAssessmentTypeForField, mapAssessmentTypesToScoreFields } from "@/lib/assessment-types";

interface ScoresClientProps {
    initialClasses: ClassLink[];
    initialSubjects: Subject[];
    initialAssessmentTypes: AssessmentType[];
    initialGradingRules: GradingRule[];
    initialSessions: Session[];
}

interface ParentSubjectPreviewData {
    students: StudentScore[];
    assessmentTypes: AssessmentType[];
}

function areAssessmentTypesEqual(left: AssessmentType[], right: AssessmentType[]) {
    if (left.length !== right.length) return false;

    return left.every((item, index) => {
        const other = right[index];
        if (!other) return false;
        const basicEqual =
            item.id === other.id &&
            item.name === other.name &&
            item.shortName === other.shortName &&
            item.maxScore === other.maxScore &&
            item.order === other.order &&
            item.includeInTotal === other.includeInTotal;
        if (!basicEqual) return false;
        const lc = item.components || [];
        const rc = other.components || [];
        if (lc.length !== rc.length) return false;
        return lc.every((c, i) => c.id === rc[i]?.id);
    });
}

function shouldShowGradeAndRemark(exam: number, availableAssessmentTypes: AssessmentType[]) {
    return Boolean(getAssessmentTypeForField(availableAssessmentTypes, "exam")) && exam > 0;
}

export default function ScoresClient({
    initialClasses,
    initialSubjects,
    initialAssessmentTypes,
    initialGradingRules,
    initialSessions
}: ScoresClientProps) {
    const { data: sessionData } = useSession();
    const userRoles: string[] = Array.isArray((sessionData?.user as any)?.roles) ? (sessionData?.user as any).roles : [];
    const isAdmin = userRoles.includes("SUPER_ADMIN") || userRoles.includes("SCHOOL_ADMIN");

    // State for dropdowns
    const [classes, setClasses] = useState<ClassLink[]>(initialClasses);
    const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
    const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>(initialAssessmentTypes);
    const [gradingRules, setGradingRules] = useState<GradingRule[]>(initialGradingRules);
    const [sessions, setSessions] = useState<Session[]>(initialSessions);
    const assessmentColumns = useMemo(
        () => mapAssessmentTypesToScoreFields(assessmentTypes),
        [assessmentTypes]
    );

    const [scoreType, setScoreType] = useState<"end-of-term" | "half-term">("end-of-term");

    // Expand assessment columns based on score type selection
    const scoreColumns = useMemo((): ScoreColumn[] => {
        const cols: ScoreColumn[] = [];

        if (scoreType === "half-term") {
            // Half-term: show only the first CA type expanded into its sub-components
            const firstCA = assessmentColumns.find(at => at.field !== "exam");
            if (firstCA) {
                const comps: AssessmentTypeComponent[] = assessmentTypes.find(t => t.id === firstCA.id)?.components || [];
                if (comps.length > 0) {
                    for (const comp of comps) {
                        cols.push({ kind: "component", field: `comp_${comp.id}`, name: comp.name, maxScore: comp.maxScore, parentField: firstCA.field, componentId: comp.id });
                    }
                    cols.push({ kind: "ca-total", field: firstCA.field, name: firstCA.shortName || firstCA.name, maxScore: firstCA.maxScore, isReadOnly: true, parentField: firstCA.field });
                } else {
                    cols.push({ kind: "assessment", field: firstCA.field, name: firstCA.shortName || firstCA.name, maxScore: firstCA.maxScore });
                }
            }
        } else {
            // End of term: all assessment types as flat direct-entry columns (no component expansion)
            for (const at of assessmentColumns) {
                cols.push({ kind: "assessment", field: at.field, name: at.shortName || at.name, maxScore: at.maxScore });
            }
        }

        return cols;
    }, [assessmentColumns, assessmentTypes, scoreType]);

    // Hide grade/remark columns when sub-component columns are visible
    const hasComponentCols = scoreColumns.some(c => c.kind === "component");

    // Selection state
    const [selectedArmId, setSelectedArmId] = useState("");
    const [selectedSubjectId, setSelectedSubjectId] = useState("");
    const [selectedSessionId, setSelectedSessionId] = useState("");
    const [selectedTermId, setSelectedTermId] = useState("");
    const selectedSubject = useMemo(
        () => subjects.find((subject) => subject.id === selectedSubjectId) || null,
        [subjects, selectedSubjectId]
    );
    const selectionReady = Boolean(selectedArmId && selectedSubjectId && selectedTermId);

    // Data state
    const [students, setStudents] = useState<StudentScore[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [scoreWorkflow, setScoreWorkflow] = useState<ScoreWorkflowState | null>(null);
    const [subjectMeta, setSubjectMeta] = useState<ScoreSubjectMeta | null>(null);
    const effectiveSubjectMeta: ScoreSubjectMeta = subjectMeta || {
        subjectKind: selectedSubject?.subjectKind || "STANDARD",
        parentSubjectId: selectedSubject?.parentSubjectId || null,
        parentSubjectName: selectedSubject?.parentSubjectName || null,
        isReadOnly: selectedSubject?.isScoreEntryEditable === false,
        derivedFromComponents: selectedSubject?.subjectKind === "COMPOSITE_PARENT",
        componentSubjects: [],
    };
    const parentPreviewSubjectId =
        effectiveSubjectMeta.subjectKind === "COMPOSITE_COMPONENT"
            ? effectiveSubjectMeta.parentSubjectId
            : null;
    const [workflowActionLoading, setWorkflowActionLoading] = useState<null | "approve" | "reject" | "broadcast">(null);
    const [showRejectPrompt, setShowRejectPrompt] = useState(false);
    const [rejectionNote, setRejectionNote] = useState("");
    const [showParentPreview, setShowParentPreview] = useState(false);
    const [parentPreviewLoading, setParentPreviewLoading] = useState(false);
    const [parentPreviewError, setParentPreviewError] = useState<string | null>(null);
    const [parentPreviewData, setParentPreviewData] = useState<ParentSubjectPreviewData | null>(null);

    // Enrollment state
    const [hasEnrollments, setHasEnrollments] = useState(false);
    const [enrolledCount, setEnrolledCount] = useState(0);
    const [totalClassStudents, setTotalClassStudents] = useState(0);
    const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
    const [enrollmentStudents, setEnrollmentStudents] = useState<EnrollmentStudent[]>([]);

    // Template download state
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

    // Upload state
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<any>(null);
    const [showOverrideConfirm, setShowOverrideConfirm] = useState(false);
    const [overrideData, setOverrideData] = useState<any>(null);
    const [enrollmentLoading, setEnrollmentLoading] = useState(false);
    const [enrollmentSaving, setEnrollmentSaving] = useState(false);
    const [enrollmentSearch, setEnrollmentSearch] = useState("");

    // Initial Data Setup (from props)
    useEffect(() => {
        const currentSession = initialSessions.find((s: Session) => s.isCurrent) || initialSessions[0];
        if (currentSession) {
            setSelectedSessionId(currentSession.id);
            const currentTerm = currentSession.terms.find((t: Term) => t.isCurrent) || currentSession.terms[0];
            if (currentTerm) {
                setSelectedTermId(currentTerm.id);
            }
        }
    }, [initialSessions]);

    const classLevelToCategory = (level: string | undefined): SchoolCategory | null => {
        if (!level) return null;
        if (level === "PRIMARY" || level === "NURSERY") return "PRIMARY";
        if (level === "JUNIOR_SECONDARY") return "JUNIOR_SECONDARY";
        if (level === "SENIOR_SECONDARY") return "SENIOR_SECONDARY";
        return null;
    };

    const selectedCategory = useMemo<SchoolCategory | null>(() => {
        if (!selectedArmId) return null;

        for (const cls of classes) {
            const arm = cls.arms.find((item) => item.id === selectedArmId);
            if (arm) {
                return classLevelToCategory(arm.level);
            }
        }

        return null;
    }, [classes, selectedArmId]);

    const activeGradingRules = useMemo(() => {
        const categoryRules = selectedCategory
            ? gradingRules.filter((rule) => rule.schoolCategory === selectedCategory)
            : [];
        const selectedRules = categoryRules.length > 0 
            ? categoryRules 
            : gradingRules.filter((rule) => rule.schoolCategory === null);
        // Sort by minScore in descending order to ensure correct rule matching
        return [...selectedRules].sort((a, b) => b.minScore - a.minScore);
    }, [gradingRules, selectedCategory]);

    const normalizeScoreForRuleScale = (total: number, rules: GradingRule[]) => {
        const maxRuleScore = rules.reduce((max, rule) => Math.max(max, rule.maxScore), 0);
        if (maxRuleScore <= 50 && total > 50) {
            return Math.round(total / 2);
        }
        return total;
    };

    // Fetch scores when selection changes
    const fetchScores = useCallback(async () => {
        if (!selectedArmId || !selectedSubjectId || !selectedTermId) return;

        setLoadingData(true);
        setError(null);
        setStudents([]); // Clear previous
        setSubjectMeta(null);

        try {
            const params = new URLSearchParams({
                classArmId: selectedArmId,
                subjectId: selectedSubjectId,
                termId: selectedTermId,
            });

            const response = await fetch(`/api/scores?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch students/scores");

            const data = await response.json();
            const resolvedAssessmentTypes: AssessmentType[] = Array.isArray(data.assessmentTypes)
                ? data.assessmentTypes
                : initialAssessmentTypes;
            setSubjectMeta({
                subjectKind: data.subjectKind || selectedSubject?.subjectKind || "STANDARD",
                parentSubjectId: data.parentSubjectId ?? selectedSubject?.parentSubjectId ?? null,
                parentSubjectName: data.parentSubjectName ?? selectedSubject?.parentSubjectName ?? null,
                isReadOnly: Boolean(data.isReadOnly),
                derivedFromComponents: Boolean(data.derivedFromComponents),
                componentSubjects: Array.isArray(data.componentSubjects) ? data.componentSubjects : [],
            });
            const resolvedAssessmentColumns = mapAssessmentTypesToScoreFields(resolvedAssessmentTypes);

            setAssessmentTypes((previous) =>
                areAssessmentTypesEqual(previous, resolvedAssessmentTypes) ? previous : resolvedAssessmentTypes
            );

            // Update enrollment info
            setHasEnrollments(data.hasEnrollments || false);
            setEnrolledCount(data.enrolledCount || 0);
            setTotalClassStudents(data.totalClassStudents || 0);
            setScoreWorkflow(data.workflow || null);

            // Determine active fields based on assessmentTypes
            const activeFields = new Set<string>();
            resolvedAssessmentColumns.forEach((type) => {
                activeFields.add(type.field);
            });

            // Expand columns with sub-components
            const resolvedScoreColumns: ScoreColumn[] = [];
            for (const at of resolvedAssessmentColumns) {
                const comps: AssessmentTypeComponent[] = resolvedAssessmentTypes.find((t: any) => t.id === at.id)?.components || [];
                if (comps.length > 0 && at.field !== "exam") {
                    for (const comp of comps) {
                        resolvedScoreColumns.push({ kind: "component", field: `comp_${comp.id}`, name: comp.name, maxScore: comp.maxScore, parentField: at.field, componentId: comp.id });
                    }
                    resolvedScoreColumns.push({ kind: "ca-total", field: at.field, name: at.shortName || at.name, maxScore: at.maxScore, isReadOnly: true, parentField: at.field });
                } else {
                    resolvedScoreColumns.push({ kind: "assessment", field: at.field, name: at.name, maxScore: at.maxScore });
                }
            }

            // Flatten scoreValues + componentScores onto student and recalculate totals
            const dynamicStudents = (data.students || []).map((s: any) => {
                const sv: Record<string, number> = typeof s.scoreValues === "object" && s.scoreValues !== null ? s.scoreValues as Record<string, number> : {};
                const cs: Record<string, number> = typeof s.componentScores === "object" && s.componentScores !== null ? s.componentScores as Record<string, number> : {};
                const fieldValues: Record<string, number> = {};

                // Load component fields first
                for (const col of resolvedScoreColumns) {
                    if (col.kind === "component" && col.componentId) {
                        fieldValues[col.field] = Number(cs[col.componentId] ?? 0);
                    }
                }
                // Derive CA totals from components; fall back to scoreValues for types without components
                for (const col of resolvedScoreColumns) {
                    if (col.kind === "ca-total" && col.parentField) {
                        const compCols = resolvedScoreColumns.filter(c => c.parentField === col.parentField && c.kind === "component");
                        fieldValues[col.field] = compCols.reduce((sum, c) => sum + (fieldValues[c.field] || 0), 0);
                    } else if (col.kind === "assessment") {
                        fieldValues[col.field] = activeFields.has(col.field) ? (sv[col.field] ?? 0) : 0;
                    }
                }

                const totals = calculateEndOfTermScoreTotals(fieldValues, resolvedAssessmentTypes);
                const examVal = fieldValues["exam"] ?? 0;
                const { grade, remark } = shouldShowGradeAndRemark(examVal, resolvedAssessmentTypes)
                    ? calculateGrade(totals.adjustedTotal)
                    : { grade: "", remark: "" };
                return { ...s, ...fieldValues, total: totals.rawTotal, adjustedTotal: totals.adjustedTotal, isAdjusted: totals.isAdjusted, grade, remark };
            });

            setStudents(dynamicStudents);
        } catch (err: any) {
            setError(err.message || "Failed to load scores");
            setScoreWorkflow(null);
        } finally {
            setLoadingData(false);
        }
    }, [selectedArmId, selectedSubjectId, selectedTermId, activeGradingRules, initialAssessmentTypes, selectedSubject]);

    useEffect(() => {
        if (selectedArmId && selectedSubjectId) {
            fetchScores();
        } else {
            setScoreWorkflow(null);
        }
    }, [fetchScores, selectedArmId, selectedSubjectId]);

    useEffect(() => {
        const allowedFields = new Set<string>(scoreColumns.map((col) => col.field));
        setSelectedColumns((previous) => previous.filter((field) => allowedFields.has(field)));
    }, [scoreColumns]);

    const fetchParentPreview = useCallback(async () => {
        if (!selectedArmId || !selectedTermId || !selectedSubjectId || !parentPreviewSubjectId) {
            return;
        }

        setParentPreviewLoading(true);
        setParentPreviewError(null);

        try {
            const params = new URLSearchParams({
                classArmId: selectedArmId,
                subjectId: parentPreviewSubjectId,
                termId: selectedTermId,
                viewerSubjectId: selectedSubjectId,
            });

            const response = await fetch(`/api/scores?${params.toString()}`);
            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(data?.error || "Failed to load parent subject preview");
            }

            setParentPreviewData({
                students: Array.isArray(data?.students) ? data.students : [],
                assessmentTypes: Array.isArray(data?.assessmentTypes) ? data.assessmentTypes : [],
            });
        } catch (err: any) {
            setParentPreviewError(err.message || "Failed to load parent subject preview");
            setParentPreviewData(null);
        } finally {
            setParentPreviewLoading(false);
        }
    }, [selectedArmId, selectedTermId, selectedSubjectId, parentPreviewSubjectId]);

    useEffect(() => {
        if (!showParentPreview) {
            return;
        }

        if (!parentPreviewSubjectId) {
            setShowParentPreview(false);
            setParentPreviewData(null);
            setParentPreviewError(null);
            return;
        }

        fetchParentPreview();
    }, [fetchParentPreview, parentPreviewSubjectId, showParentPreview]);

    useEffect(() => {
        if (!parentPreviewSubjectId) {
            setShowParentPreview(false);
            setParentPreviewData(null);
            setParentPreviewError(null);
        }
    }, [parentPreviewSubjectId]);

    // Helper to calculate grade locally for immediate feedback
    const calculateGrade = (total: number) => {
        const score = Math.round(normalizeScoreForRuleScale(Number(total), activeGradingRules) * 10) / 10;
        const rule = activeGradingRules.find(r => score >= Number(r.minScore) && score <= Number(r.maxScore));

        if (rule) {
            let color = "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
            if (rule.grade.startsWith("A")) color = "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-300";
            else if (rule.grade.startsWith("B")) color = "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300";
            else if (rule.grade.startsWith("C")) color = "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-300";
            else if (rule.grade.startsWith("D")) color = "bg-orange-100 text-orange-800 dark:bg-orange-950/30 dark:text-orange-300";
            else if (rule.grade.startsWith("E")) color = "bg-orange-50 text-orange-800 dark:bg-orange-950/30 dark:text-orange-300";
            else if (rule.grade.startsWith("F")) color = "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-300";

            return { grade: rule.grade, remark: rule.remark, color };
        }
        return { grade: "-", remark: "-", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" };
    };

    const handleScoreChange = (studentId: string, field: string, value: string) => {
        let numValue = value === "" ? 0 : parseFloat(value);
        if (isNaN(numValue)) numValue = 0;

        // Find column definition for validation
        const col = scoreColumns.find(c => c.field === field);
        const max = col?.maxScore ?? getAssessmentTypeForField(assessmentTypes, field)?.maxScore ?? 100;

        if (numValue > max) numValue = max;
        if (numValue < 0) numValue = 0;
        numValue = Math.round(numValue * 10) / 10;

        setStudents(prev => prev.map(s => {
            if (s.id !== studentId) return s;
            const updated: Record<string, unknown> = { ...s, [field]: numValue };

            // If this is a component field, recompute the parent CA total
            if (col?.kind === "component" && col.parentField) {
                const siblingComponents = scoreColumns.filter(c => c.parentField === col.parentField && c.kind === "component");
                const caTotal = siblingComponents.reduce((sum, c) => sum + (c.field === field ? numValue : Number(updated[c.field]) || 0), 0);
                const parentAt = assessmentTypes.find(at => at.id === assessmentColumns.find(a => a.field === col.parentField)?.id);
                updated[col.parentField] = Math.min(caTotal, parentAt?.maxScore ?? 9999);
            }

            const mappedCols = mapAssessmentTypesToScoreFields(assessmentTypes);
            const fieldValues: Record<string, number> = {};
            for (const mc of mappedCols) { fieldValues[mc.field] = Number(updated[mc.field]) || 0; }
            const totals = calculateEndOfTermScoreTotals(fieldValues, assessmentTypes);
            const examVal = fieldValues["exam"] ?? 0;
            const { grade, remark } = shouldShowGradeAndRemark(examVal, assessmentTypes)
                ? calculateGrade(totals.adjustedTotal)
                : { grade: "", remark: "" };
            return { ...(updated as any), total: totals.rawTotal, adjustedTotal: totals.adjustedTotal, isAdjusted: totals.isAdjusted, grade, remark };
        }));
    };

    const handleSave = async () => {
        if (!selectedArmId || !selectedSubjectId || students.length === 0) return;

        setIsSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const payload = {
                scores: students.map(s => {
                    const scoreFields: Record<string, unknown> = { studentId: s.id };
                    for (const col of assessmentColumns) { scoreFields[col.field] = s[col.field] ?? 0; }
                    // Include component scores keyed by component ID
                    const componentScores: Record<string, number> = {};
                    for (const col of scoreColumns) {
                        if (col.kind === "component" && col.componentId) {
                            componentScores[col.componentId] = Number((s as any)[col.field]) || 0;
                        }
                    }
                    scoreFields.componentScores = componentScores;
                    return scoreFields;
                }),
                subjectId: selectedSubjectId,
                termId: selectedTermId,
                classArmId: selectedArmId
            };

            const response = await fetch("/api/scores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const res = await response.json();
                throw new Error(res.error || "Failed to save scores");
            }

            const data = await response.json();
            if (data.workflow) {
                setScoreWorkflow((prev) => ({
                    id: data.workflow.id ?? prev?.id ?? null,
                    status: data.workflow.status ?? prev?.status ?? "PENDING_REVIEW",
                    rejectionReason: data.workflow.rejectionReason ?? null,
                    reviewedAt: data.workflow.reviewedAt ?? null,
                    broadcastedAt: data.workflow.broadcastedAt ?? null,
                    canReview: prev?.canReview ?? false,
                    canBroadcast: prev?.canBroadcast ?? false,
                }));
            }

            await fetchScores();
            if (showParentPreview) {
                await fetchParentPreview();
            }
            setSuccessMessage(data.message || "Scores saved successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const submitWorkflowAction = async (action: "approve" | "reject" | "broadcast", note?: string) => {
        if (!selectedArmId || !selectedSubjectId || !selectedTermId) return;

        setWorkflowActionLoading(action);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await fetch("/api/scores/workflow", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    classArmId: selectedArmId,
                    subjectId: selectedSubjectId,
                    termId: selectedTermId,
                    action,
                    note,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to update score workflow");
            }

            setSuccessMessage(data.message || "Workflow updated.");
            setShowRejectPrompt(false);
            setRejectionNote("");
            await fetchScores();
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to update score workflow");
        } finally {
            setWorkflowActionLoading(null);
        }
    };

    // --- Enrollment Modal Logic ---
    const openEnrollmentModal = async () => {
        if (!selectedArmId || !selectedSubjectId || !selectedTermId) return;

        setShowEnrollmentModal(true);
        setEnrollmentLoading(true);
        setEnrollmentSearch("");

        try {
            const params = new URLSearchParams({
                classArmId: selectedArmId,
                subjectId: selectedSubjectId,
                termId: selectedTermId,
            });

            const response = await fetch(`/api/scores/enrollment?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch enrollment data");

            const data = await response.json();
            setEnrollmentStudents(data.students || []);
        } catch (err: any) {
            setError(err.message);
            setShowEnrollmentModal(false);
        } finally {
            setEnrollmentLoading(false);
        }
    };

    const toggleEnrollment = (studentId: string) => {
        setEnrollmentStudents(prev =>
            prev.map(s =>
                s.id === studentId ? { ...s, isEnrolled: !s.isEnrolled } : s
            )
        );
    };

    const enrollAll = () => {
        setEnrollmentStudents(prev => prev.map(s => ({ ...s, isEnrolled: true })));
    };

    const unenrollAll = () => {
        setEnrollmentStudents(prev => prev.map(s => ({ ...s, isEnrolled: false })));
    };

    const saveEnrollment = async () => {
        setEnrollmentSaving(true);

        try {
            const enrolledIds = enrollmentStudents.filter(s => s.isEnrolled).map(s => s.id);
            const unenrolledIds = enrollmentStudents.filter(s => !s.isEnrolled).map(s => s.id);

            // Enroll selected students
            if (enrolledIds.length > 0) {
                await fetch("/api/scores/enrollment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        studentIds: enrolledIds,
                        subjectId: selectedSubjectId,
                        classArmId: selectedArmId,
                        termId: selectedTermId,
                        action: "enroll",
                    }),
                });
            }

            // Unenroll deselected students
            if (unenrolledIds.length > 0) {
                await fetch("/api/scores/enrollment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        studentIds: unenrolledIds,
                        subjectId: selectedSubjectId,
                        classArmId: selectedArmId,
                        termId: selectedTermId,
                        action: "unenroll",
                    }),
                });
            }

            setShowEnrollmentModal(false);
            setSuccessMessage("Enrollment updated successfully!");
            setTimeout(() => setSuccessMessage(null), 3000);

            // Refresh scores to reflect enrollment changes
            fetchScores();
        } catch (err: any) {
            setError(err.message || "Failed to save enrollment");
        } finally {
            setEnrollmentSaving(false);
        }
    };

    const filteredEnrollmentStudents = enrollmentStudents.filter(s => {
        if (!enrollmentSearch) return true;
        const search = enrollmentSearch.toLowerCase();
        return (
            s.firstName.toLowerCase().includes(search) ||
            s.lastName.toLowerCase().includes(search) ||
            s.admissionNumber.toLowerCase().includes(search)
        );
    });

    // Helper: map score columns for the column picker (skip read-only CA totals when components exist)
    const getColumnOptions = () => {
        return scoreColumns
            .filter(col => col.kind !== "ca-total")
            .map((col) => ({
                key: col.field,
                label: col.name,
            }));
    };

    const handleDownloadTemplate = () => {
        if (selectedColumns.length === 0) return;
        const columnsParam = selectedColumns.join(",");
        const url = `/api/scores/template?classArmId=${selectedArmId}&subjectId=${selectedSubjectId}&termId=${selectedTermId}&columns=${columnsParam}`;
        window.open(url, "_blank");
        setShowTemplateModal(false);
    };

    const handleExportScores = () => {
        const url = `/api/scores/template?classArmId=${selectedArmId}&subjectId=${selectedSubjectId}&termId=${selectedTermId}&columns=all&includeScores=true`;
        window.open(url, "_blank");
    };

    const handleUploadScores = async (forceOverwrite = false) => {
        if (!uploadFile) return;
        setUploading(true);
        setUploadResult(null);

        try {
            const formData = new FormData();
            formData.append("file", uploadFile);
            formData.append("subjectId", selectedSubjectId);
            formData.append("termId", selectedTermId);
            formData.append("classArmId", selectedArmId);
            if (forceOverwrite) formData.append("forceOverwrite", "true");

            const res = await fetch("/api/scores/upload", { method: "POST", body: formData });
            const data = await res.json();

            if (data.status === "conflict_admin") {
                setOverrideData(data);
                setShowOverrideConfirm(true);
                setShowUploadModal(false);
            } else if (data.status === "pending_approval") {
                setUploadResult(data);
                setShowOverrideConfirm(false);
            } else if (data.status === "saved") {
                setUploadResult(data);
                setShowOverrideConfirm(false);
                await fetchScores();
            } else if (data.error) {
                setUploadResult({ status: "error", message: data.error, errors: data.errors || [] });
            }
        } catch (err) {
            setUploadResult({ status: "error", message: "Failed to upload scores" });
        } finally {
            setUploading(false);
        }
    };

    const handleForceOverride = async () => {
        setShowOverrideConfirm(false);
        setShowUploadModal(true);
        await handleUploadScores(true);
    };

    // Derived stats - use adjustedTotal for average/pass rate
    const classAverage = students.length > 0
        ? (students.reduce((acc, s) => acc + (s.adjustedTotal ?? s.total), 0) / students.length).toFixed(1)
        : "0.0";
    const passRate = students.length > 0
        ? ((students.filter(s => (s.adjustedTotal ?? s.total) >= 40).length / students.length) * 100).toFixed(0)
        : "0";

    const canViewParentPreview = Boolean(selectionReady && parentPreviewSubjectId);
    const parentPreviewColumns = useMemo(
        () => mapAssessmentTypesToScoreFields(parentPreviewData?.assessmentTypes || []),
        [parentPreviewData?.assessmentTypes]
    );
    const parentPreviewAverage = parentPreviewData && parentPreviewData.students.length > 0
        ? (parentPreviewData.students.reduce((acc, student) => acc + (student.adjustedTotal ?? student.total), 0) / parentPreviewData.students.length).toFixed(1)
        : "0.0";
    const parentPreviewPassRate = parentPreviewData && parentPreviewData.students.length > 0
        ? ((parentPreviewData.students.filter((student) => (student.adjustedTotal ?? student.total) >= 40).length / parentPreviewData.students.length) * 100).toFixed(0)
        : "0";
    const selectedArmLabel = useMemo(() => {
        for (const cls of classes) {
            const arm = cls.arms.find((item) => item.id === selectedArmId);
            if (arm) {
                return `${cls.name} ${arm.armName}`;
            }
        }

        return "Selected arm";
    }, [classes, selectedArmId]);
    const canManageEnrollment = selectionReady && effectiveSubjectMeta.subjectKind !== "COMPOSITE_COMPONENT";
    const canEditScores = !effectiveSubjectMeta.isReadOnly;
    const selectedSubjectDisplayName = selectedSubject?.name || "Selected subject";
    const workflowStatusMeta = useMemo(() => {
        switch (scoreWorkflow?.status) {
            case "APPROVED":
                return {
                    label: "Approved",
                    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
                    help: "Class teacher has approved these scores.",
                };
            case "REJECTED":
                return {
                    label: "Rejected",
                    color: "bg-red-100 text-red-700 border-red-200",
                    help: "Update the scores using the note, then save again.",
                };
            case "BROADCASTED":
                return {
                    label: "Broadcasted",
                    color: "bg-blue-100 text-blue-700 border-blue-200",
                    help: "Scores are broadcasted and ready for report workflow.",
                };
            default:
                return {
                    label: "Pending Review",
                    color: "bg-amber-100 text-amber-700 border-amber-200",
                    help: "Awaiting class teacher review.",
                };
        }
    }, [scoreWorkflow?.status]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Score Entry</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Record and manage assessment scores</p>
                </div>
                <div className="flex items-center gap-3">
                    {canManageEnrollment && (
                        <button
                            onClick={openEnrollmentModal}
                            className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Manage Students
                        </button>
                    )}
                    {selectionReady && students.length > 0 && canEditScores && (
                        <button
                            onClick={() => { setSelectedColumns([]); setShowTemplateModal(true); }}
                            className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download Template
                        </button>
                    )}
                    {selectionReady && students.length > 0 && canEditScores && (
                        <button
                            onClick={handleExportScores}
                            className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export Scores
                        </button>
                    )}
                    {selectionReady && students.length > 0 && canEditScores && (
                        <button
                            onClick={() => { setUploadFile(null); setUploadResult(null); setShowUploadModal(true); }}
                            className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            Upload Scores
                        </button>
                    )}
                    {students.length > 0 && canEditScores && (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`btn-primary flex items-center gap-2 ${isSaving ? "opacity-75 cursor-not-allowed" : ""}`}
                        >
                            {isSaving ? "Saving..." : "Save Scores"}
                        </button>
                    )}
                </div>
            </div>

            {/* Error / Success Messages */}
            {error && (
                <div className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-4 rounded-lg border border-red-200 dark:border-red-800/50">
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 p-4 rounded-lg border border-green-200 dark:border-green-800/50">
                    {successMessage}
                </div>
            )}

            {/* Selection Controls */}
            <div className="card p-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div>
                        <label htmlFor="scores-session" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Academic Session</label>
                        <select
                            id="scores-session"
                            aria-label="Select academic session"
                            className="input w-full"
                            value={selectedSessionId}
                            onChange={(e) => {
                                const sid = e.target.value;
                                setSelectedSessionId(sid);
                                const session = sessions.find(s => s.id === sid);
                                if (session) {
                                    const currentTerm = session.terms.find(t => t.isCurrent) || session.terms[0];
                                    if (currentTerm) setSelectedTermId(currentTerm.id);
                                }
                            }}
                            disabled={!isAdmin}
                        >
                            <option value="">Select Session</option>
                            {sessions.map(session => (
                                <option key={session.id} value={session.id}>
                                    {session.name} {session.isCurrent ? "(Current)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="scores-term" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Term</label>
                        <select
                            id="scores-term"
                            aria-label="Select term"
                            className="input w-full"
                            value={selectedTermId}
                            onChange={(e) => setSelectedTermId(e.target.value)}
                            disabled={!isAdmin}
                        >
                            <option value="">Select Term</option>
                            {sessions.find(s => s.id === selectedSessionId)?.terms.map(term => (
                                <option key={term.id} value={term.id}>
                                    {term.name} {term.isCurrent ? "(Active)" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="scores-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Score Type</label>
                        <select
                            id="scores-type"
                            aria-label="Select score type"
                            className="input w-full"
                            value={scoreType}
                            onChange={(e) => setScoreType(e.target.value as "end-of-term" | "half-term")}
                        >
                            <option value="end-of-term">End of Term</option>
                            <option value="half-term">Half Term</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="scores-class" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Class Arm</label>
                        <select
                            id="scores-class"
                            aria-label="Select class arm"
                            className="input w-full"
                            value={selectedArmId}
                            onChange={(e) => setSelectedArmId(e.target.value)}
                        >
                            <option value="">Select Class</option>
                            {classes.map(cls => (
                                <optgroup key={cls.id} label={cls.name}>
                                    {cls.arms.map(arm => (
                                        <option key={arm.id} value={arm.id}>
                                            {cls.name} {arm.armName}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="scores-subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                        <select
                            id="scores-subject"
                            aria-label="Select subject"
                            className="input w-full"
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                        >
                            <option value="">Select Subject</option>
                            {subjects
                                .filter((subj: any) => {
                                    // If no class arm selected, show all subjects
                                    if (!selectedArmId) return true;
                                    // If class arm is selected, only show subjects assigned to this class arm
                                    return subj.classArmIds?.includes(selectedArmId);
                                })
                                .map(subj => (
                                    <option key={subj.id} value={subj.id}>
                                        {subj.name} ({subj.code}){subj.subjectKind === "COMPOSITE_PARENT" ? " [Read-only]" : ""}
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>
            </div>

            {selectionReady && effectiveSubjectMeta.isReadOnly && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/30 p-4 space-y-3">
                    <div>
                        <p className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                            {selectedSubjectDisplayName} is computed from component subjects
                        </p>
                        <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                            This parent subject is read-only here. Teachers enter scores on the component subjects, and this total is derived automatically.
                        </p>
                    </div>
                    {effectiveSubjectMeta.componentSubjects.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {effectiveSubjectMeta.componentSubjects.map((component) => (
                                <span
                                    key={component.componentSubjectId}
                                    className="inline-flex items-center rounded-full bg-white dark:bg-gray-700 px-3 py-1 text-xs font-medium text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                                >
                                    {component.componentSubjectName}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Score Workflow Status */}
            {selectionReady && scoreWorkflow && (
                <div className="rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-4 space-y-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${workflowStatusMeta.color}`}>
                                    {workflowStatusMeta.label}
                                </span>
                                <span className="text-sm text-slate-600 dark:text-gray-400">{workflowStatusMeta.help}</span>
                            </div>
                            {scoreWorkflow.rejectionReason && (
                                <p className="mt-2 text-sm text-red-600">
                                    <span className="font-semibold">Rejection note:</span> {scoreWorkflow.rejectionReason}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {scoreWorkflow.canReview && scoreWorkflow.status !== "BROADCASTED" && (
                                <button
                                    onClick={() => submitWorkflowAction("approve")}
                                    disabled={workflowActionLoading !== null}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 ${workflowActionLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                                >
                                    {workflowActionLoading === "approve" ? "Approving..." : "Approve"}
                                </button>
                            )}

                            {scoreWorkflow.canReview && scoreWorkflow.status !== "BROADCASTED" && (
                                <button
                                    onClick={() => setShowRejectPrompt((prev) => !prev)}
                                    disabled={workflowActionLoading !== null}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 ${workflowActionLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                                >
                                    Reject
                                </button>
                            )}

                            {scoreWorkflow.canBroadcast && scoreWorkflow.status === "APPROVED" && (
                                <button
                                    onClick={() => submitWorkflowAction("broadcast")}
                                    disabled={workflowActionLoading !== null}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 ${workflowActionLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                                >
                                    {workflowActionLoading === "broadcast" ? "Broadcasting..." : "Broadcast"}
                                </button>
                            )}
                        </div>
                    </div>

                    {showRejectPrompt && scoreWorkflow.canReview && scoreWorkflow.status !== "BROADCASTED" && (
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                            <Input
                                value={rejectionNote}
                                onChange={(e) => setRejectionNote(e.target.value)}
                                placeholder="Enter rejection note"
                                className="flex-1"
                            />
                            <button
                                onClick={() => submitWorkflowAction("reject", rejectionNote)}
                                disabled={!rejectionNote.trim() || workflowActionLoading !== null}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 ${!rejectionNote.trim() || workflowActionLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                            >
                                {workflowActionLoading === "reject" ? "Rejecting..." : "Submit Rejection"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Enrollment Info Banner */}
            {selectionReady && !loadingData && canManageEnrollment && (
                <div className={`flex items-center justify-between p-3 rounded-lg border ${hasEnrollments
                        ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50"
                        : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50"
                    }`}>
                    <div className="flex items-center gap-2 text-sm">
                        <svg className={`w-4 h-4 ${hasEnrollments ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {hasEnrollments ? (
                            <span className="text-blue-800 dark:text-blue-300">
                                <span className="font-semibold">{enrolledCount}</span> of{" "}
                                <span className="font-semibold">{totalClassStudents}</span> students enrolled in this subject
                            </span>
                        ) : (
                            <span className="text-amber-800 dark:text-amber-300">
                                Showing all <span className="font-semibold">{totalClassStudents}</span> students.
                                Click <strong>Manage Students</strong> to enroll specific students for this subject.
                            </span>
                        )}
                    </div>
                    <button
                        onClick={openEnrollmentModal}
                        className="text-sm font-medium text-blue-700 hover:text-blue-900 underline"
                    >
                        Manage
                    </button>
                </div>
            )}

            {/* Score Table */}
            {loadingData ? (
                <div className="card overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                                {[40, 120, 80, 60, 60, 60, 80].map((w, i) => (
                                    <th key={i} className="px-3 py-3 text-left">
                                        <div className="h-3 animate-pulse rounded bg-slate-200 dark:bg-gray-600" style={{ width: w }} />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: 10 }).map((_, i) => (
                                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                                    {[40, 120, 80, 60, 60, 60, 80].map((w, j) => (
                                        <td key={j} className="px-3 py-3">
                                            <div className="h-3 animate-pulse rounded bg-slate-100 dark:bg-gray-600" style={{ width: w }} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : students.length > 0 ? (
                <div className="card overflow-hidden">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">Student Scores</h3>
                            {canViewParentPreview && (
                                <button
                                    onClick={() => setShowParentPreview(true)}
                                    className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14m-6 4h5a2 2 0 002-2V8a2 2 0 00-2-2H9m-4 12h.01M5 8h.01M5 12h.01M5 16h.01" />
                                    </svg>
                                    View {effectiveSubjectMeta.parentSubjectName || "Parent Subject"}
                                </button>
                            )}
                        </div>
                        <div className="text-sm space-x-4">
                            <span className="text-gray-500 dark:text-gray-400">Avg: <span className="font-bold text-gray-900 dark:text-gray-100">{classAverage}</span></span>
                            <span className="text-gray-500 dark:text-gray-400">Pass Rate: <span className="font-bold text-green-600 dark:text-green-400">{passRate}%</span></span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">S/N</TableHead>
                                    <TableHead className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Student</TableHead>
                                    {scoreColumns.map((col) => (
                                        <TableHead key={col.field} className={`px-2 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-24 ${col.kind === "ca-total" ? "bg-gray-50 dark:bg-gray-700" : ""}`}>
                                            {col.name} ({col.maxScore})
                                        </TableHead>
                                    ))}
                                    <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-20">Total</TableHead>
                                    {!hasComponentCols && <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-20">Grade</TableHead>}
                                    {!hasComponentCols && <TableHead className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Remark</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student, index) => {
                                    const displayTotal = student.adjustedTotal ?? student.total;
                                    const showGradeAndRemark = shouldShowGradeAndRemark(Number(student.exam) || 0, assessmentTypes);
                                    const { color } = showGradeAndRemark
                                        ? calculateGrade(displayTotal)
                                        : { color: "bg-gray-100 text-gray-400" };
                                    return (
                                        <TableRow key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{index + 1}</TableCell>
                                            <TableCell className="px-4 py-3">
                                                <div className="font-medium text-gray-900 dark:text-gray-100">{student.lastName} {student.firstName}</div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500">{student.admissionNumber}</div>
                                            </TableCell>
                                            {scoreColumns.map((col) => {
                                                const rawVal = Number((student as any)[col.field]) || 0;
                                                const displayVal = rawVal === 0 ? "" : rawVal.toFixed(1).replace(/\.0$/, "");
                                                if (col.isReadOnly) {
                                                    return (
                                                        <TableCell key={col.field} className="px-2 py-3 bg-gray-50 dark:bg-gray-700 text-center">
                                                            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                                                                {rawVal > 0 ? displayVal : "—"}
                                                            </span>
                                                        </TableCell>
                                                    );
                                                }
                                                return (
                                                    <TableCell key={col.field} className="px-2 py-3">
                                                        <input
                                                            type="number"
                                                            step="0.1"
                                                            className={`w-full h-8 text-center border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500 focus:border-primary-500 text-sm dark:bg-gray-700 dark:text-gray-100 ${canEditScores ? "" : "bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"}`}
                                                            value={displayVal}
                                                            placeholder="0"
                                                            max={col.maxScore}
                                                            disabled={!canEditScores}
                                                            onChange={(e) => handleScoreChange(student.id, col.field, e.target.value)}
                                                        />
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className="px-4 py-3 text-center">
                                                <div className="font-bold text-gray-900 dark:text-gray-100">
                                                    {Number(displayTotal) % 1 === 0 ? Number(displayTotal).toString() : Number(displayTotal).toFixed(1)}
                                                </div>
                                                {student.isAdjusted && (
                                                    <div className="text-xs text-amber-600" title={`Raw: ${student.total}, Adjusted: ${student.adjustedTotal}`}>
                                                        *adj ({Number(student.total) % 1 === 0 ? Number(student.total).toString() : Number(student.total).toFixed(1)})
                                                    </div>
                                                )}
                                            </TableCell>
                                            {!hasComponentCols && (
                                                <TableCell className="px-4 py-3 text-center">
                                                    {showGradeAndRemark ? (
                                                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
                                                            {student.grade}
                                                        </span>
                                                    ) : null}
                                                </TableCell>
                                            )}
                                            {!hasComponentCols && (
                                                <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                    {showGradeAndRemark ? student.remark : ""}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            ) : (
                selectedArmId && selectedSubjectId ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-500 dark:text-gray-400">
                            {hasEnrollments
                                ? "No students are currently enrolled in this subject. Click \"Manage Students\" to enroll students."
                                : "No students found in this class."
                            }
                        </p>
                        {hasEnrollments && canManageEnrollment && (
                            <button
                                onClick={openEnrollmentModal}
                                className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-800 underline"
                            >
                                Manage Students
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="card p-12 text-center">
                        <div className="flex flex-col items-center">
                            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Select Class and Subject</h3>
                            <p className="text-gray-500 dark:text-gray-400 max-w-md">
                                Please select a Class Arm and a Subject to start entering scores.
                            </p>
                        </div>
                    </div>
                )
            )}

            {showParentPreview && canViewParentPreview && (
                <div className="fixed inset-x-3 bottom-3 top-24 z-40 sm:inset-x-auto sm:right-6 sm:w-[min(44rem,calc(100vw-2rem))]">
                    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[0px_24px_80px_-32px_rgba(15,23,42,0.45)]">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 px-5 py-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                                        Parent Subject Preview
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-gray-400">{selectedArmLabel}</span>
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-gray-100">
                                    {effectiveSubjectMeta.parentSubjectName || "Parent Subject"}
                                </h3>
                                <p className="text-sm text-slate-600 dark:text-gray-400">
                                    Read-only totals for this arm. Save component scores to refresh the parent subject automatically.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => void fetchParentPreview()}
                                    disabled={parentPreviewLoading}
                                    className={`rounded-lg border border-slate-200 dark:border-gray-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-600 ${parentPreviewLoading ? "cursor-not-allowed opacity-60" : ""}`}
                                >
                                    {parentPreviewLoading ? "Refreshing..." : "Refresh"}
                                </button>
                                <button
                                    onClick={() => setShowParentPreview(false)}
                                    className="rounded-lg border border-slate-200 dark:border-gray-600 p-2 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-600 hover:text-slate-700 dark:hover:text-gray-200"
                                    aria-label="Close parent subject preview"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-600 px-5 py-3 text-sm">
                            <div className="text-slate-500 dark:text-gray-400">
                                Viewing <span className="font-semibold text-slate-800 dark:text-gray-200">{effectiveSubjectMeta.parentSubjectName || "parent subject"}</span> for <span className="font-semibold text-slate-800 dark:text-gray-200">{selectedArmLabel}</span>
                            </div>
                            <div className="space-x-4">
                                <span className="text-slate-500 dark:text-gray-400">Avg: <span className="font-bold text-slate-900 dark:text-gray-100">{parentPreviewAverage}</span></span>
                                <span className="text-slate-500 dark:text-gray-400">Pass Rate: <span className="font-bold text-emerald-600 dark:text-emerald-400">{parentPreviewPassRate}%</span></span>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-auto bg-white dark:bg-gray-800 p-5">
                            {parentPreviewError ? (
                                <div className="rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-700 dark:text-red-300">
                                    {parentPreviewError}
                                </div>
                            ) : parentPreviewLoading && !parentPreviewData ? (
                                <div className="flex h-full items-center justify-center">
                                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
                                </div>
                            ) : parentPreviewData ? (
                                <div className="space-y-4">
                                    <div className="rounded-xl border border-blue-100 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
                                        This preview is read-only. It mirrors the computed parent subject scores for students in this arm.
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">S/N</TableHead>
                                                <TableHead className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Student</TableHead>
                                                {parentPreviewColumns.map((type) => (
                                                    <TableHead key={type.id} className="px-2 py-3 text-center text-xs font-semibold text-gray-500 uppercase w-24">
                                                        {type.name} ({type.maxScore})
                                                    </TableHead>
                                                ))}
                                                <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-20">Total</TableHead>
                                                <TableHead className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-20">Grade</TableHead>
                                                <TableHead className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Remark</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {parentPreviewData.students.map((student, index) => {
                                                const displayTotal = student.adjustedTotal ?? student.total;
                                                const showGradeAndRemark = shouldShowGradeAndRemark(Number(student.exam) || 0, parentPreviewData.assessmentTypes);
                                                const { color } = showGradeAndRemark
                                                    ? calculateGrade(displayTotal)
                                                    : { color: "bg-gray-100 text-gray-400" };

                                                return (
                                                    <TableRow key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                                        <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{index + 1}</TableCell>
                                                        <TableCell className="px-4 py-3">
                                                            <div className="font-medium text-gray-900 dark:text-gray-100">{student.lastName} {student.firstName}</div>
                                                            <div className="text-xs text-gray-400 dark:text-gray-500">{student.admissionNumber}</div>
                                                        </TableCell>
                                                        {parentPreviewColumns.map((type) => (
                                                            <TableCell key={type.id} className="px-2 py-3 text-center text-sm font-medium text-slate-700 dark:text-gray-300">
                                                                {String(student[type.field] ?? "")}
                                                            </TableCell>
                                                        ))}
                                                        <TableCell className="px-4 py-3 text-center">
                                                            <div className="font-bold text-gray-900 dark:text-gray-100">{Number(displayTotal) % 1 === 0 ? Number(displayTotal).toString() : Number(displayTotal).toFixed(1)}</div>
                                                            {student.isAdjusted && (
                                                                <div className="text-xs text-amber-600 dark:text-amber-400" title={`Raw: ${student.total}, Adjusted: ${student.adjustedTotal}`}>
                                                                    *adj ({Number(student.total) % 1 === 0 ? Number(student.total).toString() : Number(student.total).toFixed(1)})
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 text-center">
                                                            {showGradeAndRemark ? (
                                                                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
                                                                    {student.grade}
                                                                </span>
                                                            ) : null}
                                                        </TableCell>
                                                        <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                            {showGradeAndRemark ? student.remark : ""}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 p-6 text-sm text-slate-500 dark:text-gray-400">
                                    Parent subject preview is not available for this selection yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Download Template Modal */}
            {showTemplateModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => setShowTemplateModal(false)} />
                        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Download Score Template</h2>
                                    <button onClick={() => setShowTemplateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select which assessment columns to include in the CSV template</p>
                            </div>
                            <div className="p-6 space-y-3">
                                {/* All Columns option */}
                                <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600">
                                    <input
                                        type="checkbox"
                                        checked={selectedColumns.length === getColumnOptions().length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedColumns(getColumnOptions().map(o => o.key));
                                            } else {
                                                setSelectedColumns([]);
                                            }
                                        }}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">All Columns</span>
                                </label>
                                {/* Individual column options */}
                                {getColumnOptions().map(option => (
                                    <label key={option.key} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600">
                                        <input
                                            type="checkbox"
                                            checked={selectedColumns.includes(option.key)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedColumns(prev => [...prev, option.key]);
                                                } else {
                                                    setSelectedColumns(prev => prev.filter(k => k !== option.key));
                                                }
                                            }}
                                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{option.label}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowTemplateModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDownloadTemplate}
                                    disabled={selectedColumns.length === 0}
                                    className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 ${selectedColumns.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                    Download CSV
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Upload Scores Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={() => !uploading && setShowUploadModal(false)} />
                        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full">
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Upload Scores</h2>
                                    <button onClick={() => !uploading && setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                {/* Instructions */}
                                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
                                    <div className="flex gap-3">
                                        <svg className="mt-0.5 h-5 w-5 shrink-0 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="text-sm text-blue-700 dark:text-blue-300">
                                            <p className="font-medium mb-1">Instructions:</p>
                                            <ul className="list-disc list-inside space-y-1">
                                                <li>Use the &quot;Download Template&quot; to get a pre-filled CSV</li>
                                                <li>Fill in the scores and upload the completed file</li>
                                                <li>Students are matched by Admission Number</li>
                                                <li>Empty cells will keep existing scores unchanged</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* File Input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select CSV File</label>
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => { setUploadFile(e.target.files?.[0] || null); setUploadResult(null); }}
                                        className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 dark:file:bg-blue-900/50 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900"
                                    />
                                </div>

                                {/* Upload Result */}
                                {uploadResult && (
                                    <div className={`rounded-lg p-4 border ${uploadResult.status === "saved" ? "bg-green-50 border-green-200" :
                                            uploadResult.status === "pending_approval" ? "bg-amber-50 border-amber-200" :
                                                "bg-red-50 border-red-200"
                                        }`}>
                                        <p className={`text-sm font-medium ${uploadResult.status === "saved" ? "text-green-700" :
                                                uploadResult.status === "pending_approval" ? "text-amber-700" :
                                                    "text-red-700"
                                            }`}>
                                            {uploadResult.message}
                                        </p>
                                        {uploadResult.status === "saved" && uploadResult.failed > 0 && (
                                            <p className="text-sm text-green-600 mt-1">{uploadResult.success} saved, {uploadResult.failed} failed</p>
                                        )}
                                        {uploadResult.errors && uploadResult.errors.length > 0 && (
                                            <div className="mt-2 max-h-32 overflow-y-auto">
                                                {uploadResult.errors.map((err: string, i: number) => (
                                                    <p key={i} className="text-xs text-red-600">{err}</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowUploadModal(false)}
                                    disabled={uploading}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                    {uploadResult?.status === "saved" ? "Close" : "Cancel"}
                                </button>
                                {uploadResult?.status !== "saved" && uploadResult?.status !== "pending_approval" && (
                                    <button
                                        onClick={() => handleUploadScores(false)}
                                        disabled={!uploadFile || uploading}
                                        className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 ${!uploadFile || uploading ? "opacity-50 cursor-not-allowed" : ""
                                            }`}
                                    >
                                        {uploading ? "Uploading..." : "Upload Scores"}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Admin Override Confirmation Modal */}
            {showOverrideConfirm && overrideData && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
                        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Existing Scores Detected</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{overrideData.conflictCount} student(s) already have scores</p>
                                    </div>
                                </div>
                                <div className="mb-4 max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Affected students:</p>
                                    {overrideData.affectedStudents?.map((s: any, i: number) => (
                                        <p key={i} className="text-sm text-gray-700 dark:text-gray-300">{s.name} ({s.admissionNumber})</p>
                                    ))}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                    Uploading will override the existing scores for these students. This action cannot be undone.
                                </p>
                            </div>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                                <button
                                    onClick={() => { setShowOverrideConfirm(false); setOverrideData(null); }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleForceOverride}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                                >
                                    Override Scores
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enrollment Modal */}
            {showEnrollmentModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                            onClick={() => !enrollmentSaving && setShowEnrollmentModal(false)}
                        />

                        {/* Modal */}
                        <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
                            {/* Header */}
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Manage Student Enrollment</h2>
                                    <button
                                        onClick={() => !enrollmentSaving && setShowEnrollmentModal(false)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Select which students are offering this subject. Unenrolled students&apos; scores are preserved.
                                </p>

                                {/* Search */}
                                <div className="mt-4">
                                    <input
                                        type="text"
                                        placeholder="Search students..."
                                        className="input w-full text-sm"
                                        value={enrollmentSearch}
                                        onChange={(e) => setEnrollmentSearch(e.target.value)}
                                    />
                                </div>

                                {/* Quick actions */}
                                <div className="flex items-center gap-3 mt-3">
                                    <button
                                        onClick={enrollAll}
                                        className="text-xs font-medium text-blue-600 hover:text-blue-800"
                                    >
                                        Enroll All
                                    </button>
                                    <span className="text-gray-300">|</span>
                                    <button
                                        onClick={unenrollAll}
                                        className="text-xs font-medium text-red-600 hover:text-red-800"
                                    >
                                        Unenroll All
                                    </button>
                                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                                        {enrollmentStudents.filter(s => s.isEnrolled).length} / {enrollmentStudents.length} selected
                                    </span>
                                </div>
                            </div>

                            {/* Student List */}
                            <div className="flex-1 overflow-y-auto p-4">
                                {enrollmentLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {filteredEnrollmentStudents.map(student => (
                                            <label
                                                key={student.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${student.isEnrolled
                                                        ? "bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                                        : "hover:bg-gray-50 dark:hover:bg-gray-700"
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={student.isEnrolled}
                                                    onChange={() => toggleEnrollment(student.id)}
                                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {student.lastName} {student.firstName}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {student.admissionNumber}
                                                    </div>
                                                </div>
                                                {student.isEnrolled && (
                                                    <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                                        Enrolled
                                                    </span>
                                                )}
                                            </label>
                                        ))}
                                        {filteredEnrollmentStudents.length === 0 && (
                                            <p className="text-center text-gray-500 dark:text-gray-400 py-4 text-sm">
                                                No students found
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowEnrollmentModal(false)}
                                    disabled={enrollmentSaving}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={saveEnrollment}
                                    disabled={enrollmentSaving}
                                    className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 ${enrollmentSaving ? "opacity-75 cursor-not-allowed" : ""
                                        }`}
                                >
                                    {enrollmentSaving ? "Saving..." : "Save Enrollment"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
