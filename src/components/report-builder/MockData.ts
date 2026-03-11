
import { ReportCardData } from "../reports/types";

export const MOCK_REPORT_DATA: ReportCardData = {
    school: {
        name: "HISGRACE INTERNATIONAL SCHOOL",
        address: "Williams Street, Victoria Island, Lagos",
        motto: "His Grace is Sufficient",
        email: "info@hisgrace.com",
        phone: "08012345678",
        logoUrl: undefined,
        principalSignatureUrl: undefined
    },
    student: {
        id: "1",
        firstName: "NNENA GRACE",
        lastName: "ADEWOLE",
        admissionNumber: "1767",
        className: "SS 1 Gold",
        gender: "FEMALE",
        dateOfBirth: "2012-06-02"
    },
    term: {
        name: "THIRD TERM",
        sessionName: "2024/2025",
        startDate: "2025-05-01",
        endDate: "2025-07-20"
    },
    attendance: {
        daysPresent: 98,
        daysAbsent: 2,
        totalSchoolDays: 100
    },
    academic: {
        summary: {
            totalScore: 850,
            totalObtainable: 1200,
            average: 70.8
        },
        subjects: [
            { id: "1", name: "Mathematics", ca: 28, ca1: 10, ca2: 10, ca3: 8, exam: 45, total: 73, grade: "B2", remark: "Very Good", subjectClassAverage: 62, subjectPosition: "5th", subjectLowestScore: 45, subjectHighestScore: 88, cumulativeTotal1: 65, cumulativeTotal2: 70 },
            { id: "2", name: "English Language", ca: 25, ca1: 8, ca2: 9, ca3: 8, exam: 40, total: 65, grade: "C4", remark: "Good", subjectClassAverage: 58, subjectPosition: "12th", subjectLowestScore: 40, subjectHighestScore: 92 },
            { id: "3", name: "Physics", ca: 22, ca1: 7, ca2: 8, ca3: 7, exam: 38, total: 60, grade: "C6", remark: "Credit", subjectClassAverage: 55, subjectPosition: "8th", subjectLowestScore: 35, subjectHighestScore: 85 },
        ]
    },
    affective: [
        { name: "Punctuality", rating: 5 },
        { name: "Neatness", rating: 4 },
        { name: "Politeness", rating: 4 },
        { name: "Honesty", rating: 4 },
        { name: "Creativity", rating: 3 }
    ],
    psychomotor: [
        { name: "Handwriting", rating: 4 },
        { name: "Sports", rating: 5 },
        { name: "Drawing", rating: 3 },
        { name: "Public Speaking", rating: 4 }
    ],
    comments: {
        classTeacher: "A diligent student with great potential.",
        principal: "Satisfactory performance.",
        promotionStatus: "PROMOTED TO NEXT CLASS"
    },
    config: {
        activeTemplate: "standard",
        colorScheme: "blue",
        showAttendance: true,
        showTraits: true,
        showSkills: true,
        showComments: true,
        showPhoto: true,
        showPosition: true,
        showBehaviourGradeKey: true,
        displayOptions: {
            showTermHeader: true,
            showTeacherSection: true,
            showPrincipalSection: true,
            showAcademicKey: true,
            showAffectiveKey: true,
            showPromotionStatus: true,
            showLogo: true,
            showSchoolName: true,
            showSchoolAddress: true,
        }
    }
};
