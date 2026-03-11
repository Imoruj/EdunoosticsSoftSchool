export interface TranscriptStudentData {
    id: string;
    firstName: string;
    lastName: string;
    otherNames?: string;
    admissionNumber: string;
    gender: string;
    dateOfBirth?: string;
    photoUrl?: string;
    admissionDate?: string;
    stateOfOrigin?: string;
    currentClassName?: string;
}

export interface TranscriptSchoolData {
    name: string;
    address: string;
    email: string;
    phone: string;
    logoUrl?: string;
    motto?: string;
    principalSignatureUrl?: string;
    stampUrl?: string;
}

// Used in end-of-session table (when 3rd term exists)
export interface TranscriptSubjectScore {
    subjectId: string;
    subjectName: string;
    category: string;
    cumulativeTotal1?: number; // 1st Term Total
    cumulativeTotal2?: number; // 2nd Term Total
    ca: number;               // Total CA from 3rd term (ca1+ca2+ca3)
    exam: number;
    total: number;
    grade: string;
    remark: string;
}

// Used for individual term display (when 3rd term doesn't exist)
export interface TranscriptTermSubject {
    subjectName: string;
    ca: number;
    exam: number;
    total: number;
    grade: string;
    remark: string;
}

export interface TranscriptTermResult {
    termName: string;       // "First Term", "Second Term"
    termNumber: number;
    subjects: TranscriptTermSubject[];
    summary: TranscriptSessionSummary;
}

export interface TranscriptSessionSummary {
    totalScore: number;
    totalObtainable: number;
    average: number;
    subjectsCount: number;
}

export interface TranscriptAttendance {
    daysPresent: number;
    daysAbsent: number;
    totalSchoolDays: number;
}

export interface TranscriptSession {
    id: string;
    name: string;
    className: string;
    hasEndOfSession: boolean;
    // Populated when hasEndOfSession is true (3rd term exists)
    subjects: TranscriptSubjectScore[];
    summary: TranscriptSessionSummary;
    attendance: TranscriptAttendance;
    // Populated when hasEndOfSession is false (only 1st/2nd term)
    termResults?: TranscriptTermResult[];
}

export interface CumulativeStats {
    totalSessions: number;
    overallAverage: number;
    highestSessionAverage: number;
    lowestSessionAverage: number;
    highestSessionLabel: string;
    lowestSessionLabel: string;
    totalSubjectEntries: number;
}

export interface TranscriptGradingRule {
    grade: string;
    minScore: number;
    maxScore: number;
    remark: string;
}

export interface TranscriptData {
    student: TranscriptStudentData;
    school: TranscriptSchoolData;
    sessions: TranscriptSession[];
    cumulativeStats: CumulativeStats;
    gradingRules: TranscriptGradingRule[];
    generatedAt: string;
}
