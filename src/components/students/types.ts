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
