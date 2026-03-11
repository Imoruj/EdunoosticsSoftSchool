export interface ClassArm {
    id: string;
    armName: string;
    class: {
        id: string;
        name: string;
    };
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

// Layout Engine Types
export interface LayoutColumn {
    id: string;
    width: number; // Percentage 1-100
    componentId: string | null;
    props?: Record<string, any>;
}

export interface LayoutRow {
    id: string;
    height?: number;
    columns: LayoutColumn[];
}

export interface LayoutConfig {
    rows: LayoutRow[];
}

export interface SchoolData {
    name: string;
    address: string;
    email: string;
    phone: string;
    logoUrl?: string; // Base64 or URL
    principalSignatureUrl?: string;
    motto?: string;
}

export interface StudentData {
    id: string;
    firstName: string;
    lastName: string;
    otherNames?: string;
    admissionNumber: string;
    className: string;
    photoUrl?: string; // Base64 or URL
    gender?: string;
    dateOfBirth?: string | Date;
}

export interface TermData {
    name: string;
    sessionName: string;
    startDate: string;
    endDate: string;
    nextTermStartDate?: string;
}

export interface Attendance {
    daysPresent: number;
    daysAbsent: number;
    totalSchoolDays: number;
}

export interface SubjectData {
    id: string;
    name: string;
    category?: string;
    ca: number;
    ca1?: number;
    ca2?: number;
    ca3?: number;
    exam?: number;
    total: number;
    cumulativeTotal1?: number; // Term 1 Total
    cumulativeTotal2?: number; // Term 2 Total
    subjectClassAverage?: number;
    subjectPosition?: string;
    grade?: string;
    remark?: string;
    subjectLowestScore?: number;
    subjectHighestScore?: number;
}

export interface AcademicSummary {
    totalScore: number;
    totalObtainable: number;
    average: number;
    classPosition?: number;
    classSize?: number;
}

export interface Academic {
    subjects: SubjectData[];
    summary: AcademicSummary;
}

export interface Trait {
    name: string;
    rating: number; // 1-5
}

export interface Comments {
    classTeacher?: string;
    principal?: string;
    promotionStatus?: string;
    publishedAt?: string | Date;
}

export interface SectionStyle {
    global?: any;
}

export interface ReportConfig {
    activeTemplate: string;
    colorScheme: string;
    showAttendance: boolean;
    showTraits: boolean;
    showSkills: boolean;
    showComments: boolean;
    showPhoto: boolean;
    showPosition: boolean;
    showBehaviourGradeKey?: boolean;
    customTitles?: any;
    customLayout?: LayoutConfig;
    displayOptions?: any;
    assessmentTypeNames?: Record<string, string | undefined>;
}

export interface ReportCardData {
    student: StudentData;
    school: SchoolData;
    term: TermData;
    attendance: Attendance;
    academic: Academic;
    affective: Trait[];
    psychomotor: Trait[];
    comments: Comments;
    config?: ReportConfig;
    reportType?: "halfTerm" | "endOfTerm";
    gradingRules?: any[];
    classTeacherSignatureUrl?: string;
}
