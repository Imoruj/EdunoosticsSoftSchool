export interface ReportCardData {
    student: {
        id: string;
        firstName: string;
        lastName: string;
        otherNames?: string;
        admissionNumber: string;
        className: string;
        photoUrl?: string; // Base64 or URL
        gender?: string;
        dateOfBirth?: string | Date;
    };
    school: {
        name: string;
        address: string;
        email: string;
        phone: string;
        logoUrl?: string; // Base64 or URL
        principalSignatureUrl?: string;
        motto?: string;
    };
    term: {
        name: string;
        sessionName: string;
        startDate: string;
        endDate: string;
        nextTermStartDate?: string;
    };
    attendance: {
        daysPresent: number;
        daysAbsent: number;
        totalSchoolDays: number;
    };
    academic: {
        subjects: Array<{
            id: string;
            name: string;
            category?: string;
            ca: number;
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
        }>;
        summary: {
            totalScore: number;
            totalObtainable: number;
            average: number;
            classPosition?: number;
            classSize?: number;
        };
    };
    affective: Array<{
        name: string;
        rating: number; // 1-5
    }>;
    psychomotor: Array<{
        name: string;
        rating: number; // 1-5
    }>;
    comments: {
        classTeacher?: string;
        principal?: string;
        promotionStatus?: string;
    };
    config?: {
        activeTemplate: string;
        colorScheme: string;
        showAttendance: boolean;
        showTraits: boolean;
        showSkills: boolean;
        showComments: boolean;
        showPhoto: boolean;
        showPosition: boolean;
        customTitles?: any;
    };
    reportType?: "halfTerm" | "endOfTerm";
}
