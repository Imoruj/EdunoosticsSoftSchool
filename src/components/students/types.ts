export interface ClassArm {
    id: string;
    armName: string;
    class: {
        id: string;
        name: string;
    };
}

export interface Student {
    id: string;
    userId?: string | null;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    otherNames?: string;
    gender: string;
    dateOfBirth?: string;
    classArm: ClassArm;
    parentPhone?: string;
    parentEmail?: string;
    parentName?: string;
    stateOfOrigin?: string;
    address?: string;
    photoUrl?: string; // Added field
    isActive: boolean;
}

export interface StudentChangeRequest {
    id: string;
    action: "EDIT" | "DELETE";
    status: "PENDING" | "APPROVED" | "REJECTED";
    studentId?: string | null;
    studentName: string;
    admissionNumber: string;
    classLabel?: string | null;
    currentData?: Record<string, unknown> | null;
    requestedData?: Record<string, unknown> | null;
    summary?: string | null;
    reviewNote?: string | null;
    createdAt: string;
    reviewedAt?: string | null;
    requester: {
        id: string;
        firstName: string;
        lastName: string;
    };
    reviewer?: {
        id: string;
        firstName: string;
        lastName: string;
    } | null;
}

export interface ClassOption {
    id: string;
    name: string;
    arms: { id: string; armName: string }[];
}

export interface SubjectOption {
    id: string;
    name: string;
    code?: string;
}

export interface TermOption {
    id: string;
    name: string;
    isCurrent: boolean;
}

export interface SessionOption {
    id: string;
    name: string;
    isCurrent: boolean;
    terms: TermOption[];
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    femaleCount?: number;
    maleCount?: number;
    activeCount?: number;
}
