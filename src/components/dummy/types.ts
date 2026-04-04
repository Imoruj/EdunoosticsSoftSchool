export interface DummySheetStudentRow {
    id: string;
    serialNumber: number;
    admissionNumber: string;
    fullName: string;
    ca1: string;
    ca2: string;
    exam: string;
    total: string;
}

export interface DummySheetSubjectPage {
    subjectId: string;
    subjectName: string;
    subjectCode?: string;
    students: DummySheetStudentRow[];
}

export interface DummySheetData {
    school: {
        name: string;
        address?: string;
        logoUrl?: string;
    };
    session: {
        id: string;
        name: string;
    };
    term: {
        id: string;
        name: string;
    };
    classArm: {
        id: string;
        classId: string;
        className: string;
        armName: string;
        classTeacherName?: string;
    };
    subjects: DummySheetSubjectPage[];
    generatedAt: string;
}
