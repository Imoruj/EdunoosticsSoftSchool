export interface SectionStyle {
    borderWidth: number;
    borderStyle: 'solid' | 'dashed' | 'dotted' | 'double';
    borderColor?: string;
    headerBg?: string;
    headerText?: string;
}

export interface BroadsheetDisplayOptions {
    showLogo?: boolean;
    showSchoolName?: boolean;
    showSchoolAddress?: boolean;
    showSchoolMotto?: boolean;
    showSchoolContact?: boolean;
    showSessionInfo?: boolean;
    showTermInfo?: boolean;
    showClassInfo?: boolean;
    show1stTerm?: boolean;
    show2ndTerm?: boolean;
    showCA1?: boolean;
    showCA2?: boolean;
    showDMAT?: boolean;
    showExam?: boolean;
    showSubjectTotal?: boolean;
    showGrade?: boolean;
    showSubjectPosition?: boolean;
    showHighestScore?: boolean;
    showLowestScore?: boolean;
    showStudentCount?: boolean;
    showGrandTotal?: boolean;
    showAverage?: boolean;
    showArmPosition?: boolean;
    showOverallPosition?: boolean;
    showSubjectCount?: boolean;
    globalUniformity?: boolean;
    globalStyle?: SectionStyle;
    sectionStyles?: Record<string, SectionStyle>;
}

export interface BroadsheetSubject {
    id: string;
    name: string;
    code?: string;
}

export interface BroadsheetStudentScore {
    subjectId: string;
    ca1: number;
    ca2: number;
    ca3: number;
    caTotal: number;
    exam: number;
    total: number;
    grade: string;
    position: number;
    term1Total?: number;
    term2Total?: number;
}

export interface BroadsheetStudent {
    id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    scores: BroadsheetStudentScore[];
    grandTotal: number;
    average: number;
    overallPosition: number;
    subjectCount: number;
}

export interface BroadsheetSummary {
    highest: Record<string, number>;
    lowest: Record<string, number>;
    studentCount: number;
    studentCountBySubject: Record<string, number>;
}

export interface BroadsheetConfig {
    activeTemplate: string;
    colorScheme: string;
    showCA1: boolean;
    showCA2: boolean;
    showExam: boolean;
    showSubjectTotal: boolean;
    showGrade: boolean;
    showPosition: boolean;
    customTitles?: Record<string, string>;
    displayOptions?: BroadsheetDisplayOptions;
}

export interface BroadsheetData {
    school: {
        name: string;
        address: string;
        motto?: string;
        logoUrl?: string;
        phone?: string;
        email?: string;
    };
    session: {
        name: string;
    };
    term: {
        name: string;
        termNumber: number;
    };
    classArm: {
        className: string;
        armName: string;
        level?: string;
    };
    reportType: "halfTerm" | "endOfTerm";
    assessmentTypes: {
        name: string;
        shortName?: string;
        maxScore: number;
    }[];
    subjects: BroadsheetSubject[];
    students: BroadsheetStudent[];
    summary: BroadsheetSummary;
    config: BroadsheetConfig;
    gradingRules?: { grade: string; minScore: number; maxScore: number; remark: string }[];
}
