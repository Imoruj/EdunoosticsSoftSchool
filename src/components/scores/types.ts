export type SchoolCategory = "PRIMARY" | "JUNIOR_SECONDARY" | "SENIOR_SECONDARY";
export type ClassLevel = "NURSERY" | "PRIMARY" | "JUNIOR_SECONDARY" | "SENIOR_SECONDARY";

export interface StudentScore {
    id: string; // Student ID
    firstName: string;
    lastName: string;
    admissionNumber: string;
    ca1: number;
    ca2: number;
    ca3: number;
    exam: number;
    total: number;
    adjustedTotal?: number;
    isAdjusted?: boolean;
    grade: string;
    remark: string;
}

export interface EnrollmentStudent {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    isEnrolled: boolean;
}

export interface AssessmentType {
    id: string;
    name: string;
    shortName: string | null;
    maxScore: number;
    order: number;
    includeInTotal: boolean;
}

export interface ClassLink {
    id: string;
    name: string;
    arms: { id: string; armName: string; level: ClassLevel }[];
}

export interface GradingRule {
    id: string;
    minScore: number;
    maxScore: number;
    grade: string;
    remark: string;
    schoolCategory: SchoolCategory | null;
}

export interface Subject {
    id: string;
    name: string;
    code: string;
    classArmIds?: string[];
    subjectKind?: "STANDARD" | "COMPOSITE_PARENT" | "COMPOSITE_COMPONENT";
    parentSubjectId?: string | null;
    parentSubjectName?: string | null;
    isCompositeConfigured?: boolean;
    isReportVisible?: boolean;
    isScoreEntryEditable?: boolean;
}

export interface Term {
    id: string;
    name: string;
    isCurrent: boolean;
}

export interface Session {
    id: string;
    name: string;
    isCurrent: boolean;
    terms: Term[];
}

export type ScoreWorkflowStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "BROADCASTED";

export interface ScoreWorkflowState {
    id: string | null;
    status: ScoreWorkflowStatus;
    rejectionReason: string | null;
    reviewedAt: string | null;
    broadcastedAt: string | null;
    canReview: boolean;
    canBroadcast: boolean;
}

export interface CompositeComponentSubject {
    componentSubjectId: string;
    componentSubjectName: string;
    orderIndex: number;
    ca1Max: number;
    ca2Max: number;
    ca3Max: number;
    examMax: number;
}

export interface ScoreSubjectMeta {
    subjectKind: "STANDARD" | "COMPOSITE_PARENT" | "COMPOSITE_COMPONENT";
    parentSubjectId: string | null;
    parentSubjectName: string | null;
    isReadOnly: boolean;
    derivedFromComponents: boolean;
    componentSubjects: CompositeComponentSubject[];
}
