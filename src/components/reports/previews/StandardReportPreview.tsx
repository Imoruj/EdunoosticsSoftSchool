import React from "react";
import { WebDynamicReportTemplate } from "../templates/WebDynamicReportTemplate";
import { ReportCardData } from "../types";
import { formatPublishedDate } from "../formatPublishedDate";
import { formatScore } from "../scoreFormatting";
import { formatStudentFullName } from "../formatStudentFullName";
// Props
interface StandardReportPreviewProps {
    config: {
        activeTemplate: string;
        colorScheme: string;
        showAttendance: boolean;
        showTraits: boolean;
        showSkills: boolean;
        showComments: boolean;
        showPhoto: boolean;
        showPosition: boolean;
        customTitles?: Record<string, string>;
        displayOptions?: {
            showName?: boolean;
            showDOB?: boolean;
            showSex?: boolean;
            showClass?: boolean;
            showAdmNo?: boolean;
            showPhoto?: boolean;
            showLogo?: boolean;
            showSchoolName?: boolean;
            showSchoolAddress?: boolean;
            showSchoolMotto?: boolean;
            showSchoolContact?: boolean;
            showAttOpened?: boolean;
            showAttPresent?: boolean;
            showAttAbsent?: boolean;
            showTermHistory?: boolean;
            showCA?: boolean;
            showCA1?: boolean;
            showCA2?: boolean;
            showCA3?: boolean;
            showExam?: boolean;
            showSubjectTotal?: boolean;
            showGrade?: boolean;
            showSubjectPosition?: boolean;
            showSubjectAverage?: boolean;
            showSubjectLowHigh?: boolean; // Added
            showRemarks?: boolean;
            showAcademicKey?: boolean; // Added
            showAffectiveKey?: boolean; // Added
            showTeacherSection?: boolean; // Added
            showPrincipalSection?: boolean; // Added
            showTeacherComment?: boolean;
            showPrincipalComment?: boolean;
            showTermHeader?: boolean;
            showPromotionStatus?: boolean;
            showTeacherSign?: boolean;
            showPrincipalSign?: boolean;
            showTeacherDate?: boolean;
            showPrincipalDate?: boolean;

            // Traits (Granular)
            showTraitPunctuality?: boolean;
            showTraitNeatness?: boolean;
            showTraitPoliteness?: boolean;
            showTraitHonesty?: boolean;
            showTraitCreativity?: boolean;
            // Skills (Granular)
            showSkillHandwriting?: boolean;
            showSkillSports?: boolean;
            showSkillDrawing?: boolean;
            showSkillPublicSpeaking?: boolean;
            // Advanced Styling
            globalUniformity?: boolean;
            globalStyle?: SectionStyle;
            sectionStyles?: Record<string, SectionStyle>;
            customLayout?: unknown;
        };
    };
    data?: ReportCardData;
}

interface SectionStyle {
    borderWidth: number;
    borderStyle: 'solid' | 'dashed' | 'dotted' | 'double';
    borderColor?: string;
    headerBg?: string;
    headerText?: string;
}

const StandardReportPreview: React.FC<StandardReportPreviewProps> = ({ config, data: liveData }) => {
    const [fetchedSchool, setFetchedSchool] = React.useState<any>(null);

    React.useEffect(() => {
        if (!liveData?.school) {
            fetch("/api/school")
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data) setFetchedSchool(data);
                })
                .catch(err => console.error("Failed to fetch school for preview:", err));
        }
    }, [liveData]);

    // Mock Data for Preview
    const school = liveData?.school || fetchedSchool || {
        name: "Edunostics",
        address: "Williams Street, Victoria Island, Lagos",
        motto: "His Grace is Sufficient",
        email: "info@edunostics.com",
        phone: "08012345678",
        logoUrl: undefined,
        principalSignatureUrl: undefined
    };

    const comments = liveData?.comments || (liveData ? { classTeacher: "", principal: "", promotionStatus: "" } : {
        classTeacher: "A diligent student with great potential.",
        principal: "Satisfactory performance."
    });
    const isHalfTerm = liveData?.reportType === "halfTerm";

    // Helper to check if an option is enabled
    const showOption = (key: keyof NonNullable<typeof config.displayOptions>) => {
        // Half-term reports hide full-term-only columns regardless of config
        if (isHalfTerm) {
            const halfTermHidden: string[] = [
                'showTermHistory', 'showExam', 'showGrade', 'showRemarks', 'showPromotionStatus'
            ];
            if (halfTermHidden.includes(key as string)) return false;
        }
        if (!config.displayOptions) return true;
        return (config.displayOptions as any)[key] !== false;
    };

    // Dynamic assessment type labels from school settings
    const atNames = (config as any)?.assessmentTypeNames;
    const colLabels = {
        ca1: atNames?.ca1 || "CA1",
        ca2: atNames?.ca2 || "CA2",
        ca3: atNames?.ca3 || "CA3",
        exam: atNames?.exam || "EXAM",
    };

    // Style resolver
    const getSectionStyle = (sectionKey: string) => {
        const { displayOptions } = config;
        const globalStyle = displayOptions?.globalStyle || {
            borderWidth: 2, borderStyle: 'solid' as const, borderColor: '#14532d', headerBg: '#f3f4f6', headerText: '#1f2937'
        };
        const sectionStyle = (displayOptions?.sectionStyles as any)?.[sectionKey];

        const style = (displayOptions?.globalUniformity !== false || !sectionStyle) ? globalStyle : sectionStyle;

        return {
            container: {
                borderWidth: `${style.borderWidth}px`,
                borderStyle: style.borderStyle,
                borderColor: style.borderColor || '#14532d'
            },
            header: {
                backgroundColor: style.headerBg || '#f3f4f6',
                color: style.headerText || '#1f2937',
                borderBottomWidth: '1px',
                borderBottomStyle: style.borderStyle,
                borderBottomColor: style.borderColor || '#14532d'
            },
            borderOnly: {
                borderColor: style.borderColor || '#14532d'
            }
        };
    };

    const headerStyles = getSectionStyle('global'); // Fallback for header/overall
    const personalStyles = getSectionStyle('personalData');
    const attStyles = getSectionStyle('attendance');
    const academicStyles = getSectionStyle('academic');
    const traitStyles = getSectionStyle('traits');
    const skillStyles = getSectionStyle('skills');
    const footerStyles = getSectionStyle('comments');

    // Create a data object for the dynamic template
    const reportData: ReportCardData = liveData || {
        school: school as any,
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
        comments: comments as any,
        config: config as any
    };
    const publishedDateLabel = formatPublishedDate(reportData.comments.publishedAt);
    const studentFullName = formatStudentFullName(reportData.student);

    if (config.displayOptions?.customLayout) {
        return <WebDynamicReportTemplate data={reportData} />;
    }

    return (
        <div className="w-full bg-white p-6 min-h-[1000px] text-xs font-sans text-black">
            {/* Header */}
            <div className="border-2 p-4 mb-4 flex items-center" style={headerStyles.container}>
                {showOption('showLogo') && (
                    <div className="w-20 h-20 shrink-0 mr-4">
                        {school.logoUrl ? (
                            <img src={school.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full rounded-full flex items-center justify-center text-2xl font-black text-white" style={{ backgroundColor: headerStyles.borderOnly.borderColor }}>
                                {school.name.charAt(0)}
                            </div>
                        )}
                    </div>
                )}
                <div className="flex-1 text-center">
                    {showOption('showSchoolName') && <h1 className="text-xl font-black uppercase tracking-wide mb-0.5" style={{ color: headerStyles.borderOnly.borderColor }}>{school.name}</h1>}
                    {showOption('showSchoolAddress') && (
                        <p className="text-[10px] text-gray-600">{school.address}</p>
                    )}
                    {showOption('showSchoolMotto') && school.motto && <p className="text-[9px] italic text-gray-500 mt-0.5" style={{ fontFamily: 'Georgia, serif' }}>Motto: {school.motto}</p>}
                    {showOption('showSchoolContact') && <p className="text-[9px] text-gray-500 mt-0.5">{school.email}</p>}
                </div>
                {showOption('showLogo') && <div className="w-20 shrink-0" />}
            </div>

            {/* Term Header */}
            {showOption('showTermHeader') && (
                <div className="text-center p-2 font-bold text-sm border-2 mb-4 uppercase" style={headerStyles.header}>
                    {reportData.term.sessionName} {reportData.term.name.toUpperCase()} {isHalfTerm ? "HALF TERM REPORT" : "REPORT SHEET"}
                </div>
            )}

            {/* Main Grid: Data, Photo, Attendance */}
            <div className={`grid ${showOption('showPhoto') ? 'grid-cols-[2.5fr_1.15fr_2.5fr]' : 'grid-cols-2'} gap-3 mb-5`}>
                {/* Personal Data */}
                <div className="border h-fit" style={personalStyles.container}>
                    <div className="p-1.5 font-bold text-center text-[10px] uppercase tracking-wide" style={personalStyles.header}>Student&apos;s Personal Data</div>
                    {showOption('showName') && (
                        <div className="grid grid-cols-[80px_1fr] border-b text-[10px]" style={personalStyles.borderOnly}>
                            <div className="p-1.5 font-bold bg-gray-50 border-r" style={personalStyles.borderOnly}>Name</div>
                            <div className="p-1.5 font-bold">{studentFullName}</div>
                        </div>
                    )}
                    {showOption('showDOB') && (
                        <div className="grid grid-cols-[80px_1fr] border-b text-[10px]" style={personalStyles.borderOnly}>
                            <div className="p-1.5 font-bold bg-gray-50 border-r" style={personalStyles.borderOnly}>DOB</div>
                            <div className="p-1.5">{reportData.student.dateOfBirth ? new Date(reportData.student.dateOfBirth).toLocaleDateString() : "N/A"}</div>
                        </div>
                    )}
                    {showOption('showSex') && (
                        <div className="grid grid-cols-[80px_1fr] border-b text-[10px]" style={personalStyles.borderOnly}>
                            <div className="p-1.5 font-bold bg-gray-50 border-r" style={personalStyles.borderOnly}>Sex</div>
                            <div className="p-1.5">{reportData.student.gender || "N/A"}</div>
                        </div>
                    )}
                    {showOption('showClass') && (
                        <div className="grid grid-cols-[80px_1fr] border-b text-[10px]" style={personalStyles.borderOnly}>
                            <div className="p-1.5 font-bold bg-gray-50 border-r" style={personalStyles.borderOnly}>Class</div>
                            <div className="p-1.5">{reportData.student.className}</div>
                        </div>
                    )}
                    {showOption('showAdmNo') && (
                        <div className="grid grid-cols-[80px_1fr] text-[10px]">
                            <div className="p-1.5 font-bold bg-gray-50 border-r" style={personalStyles.borderOnly}>Adm No.</div>
                            <div className="p-1.5">{reportData.student.admissionNumber}</div>
                        </div>
                    )}
                </div>

                {/* Photo */}
                {showOption('showPhoto') && (
                    <div className="border bg-gray-50 flex items-center justify-center overflow-hidden" style={{ ...personalStyles.container, maxHeight: '180px' }}>
                        {reportData.student.photoUrl ? (
                            <img src={reportData.student.photoUrl} alt="Student" className="w-full h-full object-cover" style={{ maxHeight: '180px' }} />
                        ) : (
                            <div className="text-gray-300 text-[10px] uppercase tracking-widest py-12">Photo</div>
                        )}
                    </div>
                )}

                {/* Attendance & Summary Column */}
                <div className="flex flex-col gap-3 h-fit">
                    {/* Attendance */}
                    {config.showAttendance && (
                        <div className="border h-fit" style={attStyles.container}>
                            <div className="p-1.5 font-bold text-center text-[10px] uppercase tracking-wide" style={attStyles.header}>Attendance</div>
                            <div className="grid grid-cols-3 border-b text-[8px] text-center font-medium text-gray-500" style={attStyles.borderOnly}>
                                {showOption('showAttOpened') && <div className="p-1 border-r" style={attStyles.borderOnly}>Opened</div>}
                                {showOption('showAttPresent') && <div className="p-1 border-r" style={attStyles.borderOnly}>Present</div>}
                                {showOption('showAttAbsent') && <div className="p-1">Absent</div>}
                            </div>
                            <div className="grid grid-cols-3 text-sm font-bold text-center" style={attStyles.borderOnly}>
                                {showOption('showAttOpened') && <div className="p-1.5 border-r" style={attStyles.borderOnly}>{reportData.attendance.totalSchoolDays || "-"}</div>}
                                {showOption('showAttPresent') && <div className="p-1.5 border-r" style={attStyles.borderOnly}>{reportData.attendance.daysPresent || "-"}</div>}
                                {showOption('showAttAbsent') && <div className="p-1.5">{reportData.attendance.daysAbsent || "-"}</div>}
                            </div>
                        </div>
                    )}

                    {/* Summary Stats */}
                    <div className="border h-fit" style={attStyles.container}>
                        <div className="p-1.5 font-bold text-center text-[10px] uppercase tracking-wide" style={attStyles.header}>Summary</div>
                        <div className="grid grid-cols-[2fr_1fr] border-b text-[10px]" style={attStyles.borderOnly}>
                            <div className="p-1.5 font-bold bg-gray-50 border-r" style={attStyles.borderOnly}>Total Score Possible</div>
                            <div className="p-1.5 text-center font-bold">{formatScore(reportData.academic.summary.totalObtainable || (reportData.academic.subjects.length * 100))}</div>
                        </div>
                        <div className="grid grid-cols-[2fr_1fr] border-b text-[10px]" style={attStyles.borderOnly}>
                            <div className="p-1.5 font-bold bg-gray-50 border-r" style={attStyles.borderOnly}>Total Score Obtained</div>
                            <div className="p-1.5 text-center font-bold">{formatScore(reportData.academic.summary.totalScore)}</div>
                        </div>
                        <div className="grid grid-cols-[2fr_1fr] text-[10px]">
                            <div className="p-1.5 font-bold bg-gray-50 border-r" style={attStyles.borderOnly}>Average %</div>
                            <div className="p-1.5 text-center font-bold">{formatScore(reportData.academic.summary.average)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Academic Table */}
            <div className="mb-5">
                <div className="text-center p-1.5 font-bold text-[10px] uppercase tracking-wide border border-b-0" style={academicStyles.header}>Academic Performance</div>
                <table className="w-full border border-collapse text-[10px]" style={academicStyles.container}>
                    <thead>
                        <tr>
                            <th rowSpan={2} className="border p-2 text-left" style={academicStyles.header}>SUBJECT</th>
                            {showOption('showTermHistory') && <th colSpan={2} className="border p-1 text-center font-bold whitespace-nowrap" style={academicStyles.header}>TERM HISTORY</th>}
                            {showOption('showCA1') && <th rowSpan={2} className="border p-1 text-center text-[10px] whitespace-nowrap" style={academicStyles.header}>{colLabels.ca1.toUpperCase()}</th>}
                            {showOption('showCA2') && <th rowSpan={2} className="border p-1 text-center text-[10px] whitespace-nowrap" style={academicStyles.header}>{colLabels.ca2.toUpperCase()}</th>}
                            {showOption('showCA3') && <th rowSpan={2} className="border p-1 text-center text-[10px] whitespace-nowrap" style={academicStyles.header}>{colLabels.ca3.toUpperCase()}</th>}
                            {showOption('showCA') && <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={academicStyles.header}>CA</th>}
                            {showOption('showExam') && <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={academicStyles.header}>{colLabels.exam.toUpperCase()}</th>}
                            {showOption('showSubjectTotal') && <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={academicStyles.header}>TOTAL</th>}
                            {showOption('showGrade') && <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={academicStyles.header}>GRADE</th>}
                            {showOption('showSubjectPosition') && <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={academicStyles.header}>POS</th>}
                            {showOption('showSubjectAverage') && <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={academicStyles.header}>AVG</th>}
                            {showOption('showSubjectLowHigh') && (
                                <>
                                    <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={academicStyles.header}>LOW</th>
                                    <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={academicStyles.header}>HIGH</th>
                                </>
                            )}
                            {showOption('showRemarks') && <th rowSpan={2} className="border p-2 text-center" style={academicStyles.header}>REMARK</th>}
                        </tr>
                        <tr>
                            {showOption('showTermHistory') && (
                                <>
                                    <th className="border p-1 text-center text-[9px] whitespace-nowrap" style={academicStyles.header}>1ST</th>
                                    <th className="border p-1 text-center text-[9px] whitespace-nowrap" style={academicStyles.header}>2ND</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {reportData.academic.subjects.map((sub, i) => (
                            <tr key={i}>
                                <td className="border p-2 font-bold bg-gray-50 text-left whitespace-nowrap" style={academicStyles.borderOnly}>{sub.name}</td>
                                {showOption('showTermHistory') && (
                                    <>
                                        <td className="border p-1 text-center" style={academicStyles.borderOnly}>{formatScore(sub.cumulativeTotal1)}</td>
                                        <td className="border p-1 text-center" style={academicStyles.borderOnly}>{formatScore(sub.cumulativeTotal2)}</td>
                                    </>
                                )}
                                {showOption('showCA1') && <td className="border p-1 text-center" style={academicStyles.borderOnly}>{formatScore(sub.ca1)}</td>}
                                {showOption('showCA2') && <td className="border p-1 text-center" style={academicStyles.borderOnly}>{formatScore(sub.ca2)}</td>}
                                {showOption('showCA3') && <td className="border p-1 text-center" style={academicStyles.borderOnly}>{formatScore(sub.ca3)}</td>}
                                {showOption('showCA') && <td className="border p-1 text-center" style={academicStyles.borderOnly}>{formatScore(sub.ca)}</td>}
                                {showOption('showExam') && <td className="border p-1 text-center" style={academicStyles.borderOnly}>{formatScore(sub.exam)}</td>}
                                {showOption('showSubjectTotal') && <td className="border p-1 text-center font-bold" style={academicStyles.borderOnly}>{formatScore(sub.total)}</td>}
                                {showOption('showGrade') && <td className="border p-1 text-center font-bold" style={academicStyles.borderOnly}>{sub.grade || "-"}</td>}
                                {showOption('showSubjectPosition') && <td className="border p-1 text-center text-[9px]" style={academicStyles.borderOnly}>{sub.subjectPosition || "-"}</td>}
                                {showOption('showSubjectAverage') && <td className="border p-1 text-center text-[9px]" style={academicStyles.borderOnly}>{formatScore(sub.subjectClassAverage)}</td>}
                                {showOption('showSubjectLowHigh') && (
                                    <>
                                        <td className="border p-1 text-center text-[9px]" style={academicStyles.borderOnly}>{formatScore(sub.subjectLowestScore)}</td>
                                        <td className="border p-1 text-center text-[9px]" style={academicStyles.borderOnly}>{formatScore(sub.subjectHighestScore)}</td>
                                    </>
                                )}
                                {showOption('showRemarks') && <td className="border p-2 text-center text-[9px] whitespace-nowrap" style={academicStyles.borderOnly}>{sub.remark}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Traits */}
            {(config.showTraits || config.showSkills) && (
                <div className="mb-5">
                    <div className="grid grid-cols-2 gap-3 mb-2">
                        {/* Affective */}
                        {config.showTraits && (
                            <div className="border h-fit" style={traitStyles.container}>
                                <div className="p-1 text-center font-bold text-[10px] uppercase tracking-wide border-b" style={traitStyles.header}>Affective Traits</div>
                                <div className="grid grid-cols-[2fr_repeat(5,1fr)] bg-gray-50 border-b text-[9px] text-center font-bold" style={traitStyles.borderOnly}>
                                    <div className="p-1 border-r text-left" style={traitStyles.borderOnly}>TRAIT</div>
                                    <div className="p-1 border-r" style={traitStyles.borderOnly}>1</div>
                                    <div className="p-1 border-r" style={traitStyles.borderOnly}>2</div>
                                    <div className="p-1 border-r" style={traitStyles.borderOnly}>3</div>
                                    <div className="p-1 border-r" style={traitStyles.borderOnly}>4</div>
                                    <div className="p-1">5</div>
                                </div>
                                {reportData.affective.map((trait, i) => {
                                    if (showOption(`showTrait${trait.name}` as any) === false) return null;
                                    return (
                                        <div key={i} className="grid grid-cols-[2fr_repeat(5,1fr)] border-b last:border-b-0 text-[9px] items-center" style={traitStyles.borderOnly}>
                                            <div className="p-1 border-r bg-gray-50 font-medium" style={traitStyles.borderOnly}>{trait.name}</div>
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <div key={n} className="p-1 border-r text-center h-full flex items-center justify-center font-bold" style={{ ...traitStyles.borderOnly, color: traitStyles.borderOnly.borderColor }}>
                                                    {Math.round(trait.rating) === n ? '✓' : ''}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Psychomotor */}
                        {config.showSkills && (
                            <div className="border-2 h-fit" style={skillStyles.container}>
                                <div className="p-1 text-center font-bold text-[10px] border-b" style={skillStyles.header}>PSYCHOMOTOR SKILLS</div>
                                <div className="grid grid-cols-[2fr_repeat(5,1fr)] bg-gray-50 border-b text-[9px] text-center font-bold" style={skillStyles.borderOnly}>
                                    <div className="p-1 border-r text-left" style={skillStyles.borderOnly}>SKILL</div>
                                    <div className="p-1 border-r" style={skillStyles.borderOnly}>1</div>
                                    <div className="p-1 border-r" style={skillStyles.borderOnly}>2</div>
                                    <div className="p-1 border-r" style={skillStyles.borderOnly}>3</div>
                                    <div className="p-1 border-r" style={skillStyles.borderOnly}>4</div>
                                    <div className="p-1">5</div>
                                </div>
                                {reportData.psychomotor.map((skill, i) => {
                                    const skillKey = skill.name.replace(/\s+/g, ''); // Remove spaces for key (PublicSpeaking)
                                    if (showOption(`showSkill${skillKey}` as any) === false) return null;
                                    return (
                                        <div key={i} className="grid grid-cols-[2fr_repeat(5,1fr)] border-b last:border-b-0 text-[9px] items-center" style={skillStyles.borderOnly}>
                                            <div className="p-1 border-r bg-gray-50 font-medium" style={skillStyles.borderOnly}>{skill.name}</div>
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <div key={n} className="p-1 border-r text-center h-full flex items-center justify-center font-bold" style={{ ...skillStyles.borderOnly, color: skillStyles.borderOnly.borderColor }}>
                                                    {Math.round(skill.rating) === n ? '✓' : ''}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Grade Key */}
                    {showOption('showAffectiveKey') && (
                        <div className="border-2 p-2 bg-white" style={skillStyles.container}>
                            <div className="font-bold text-[10px] mb-1 text-center uppercase" style={skillStyles.header}>Key To Behaviour/Skills</div>
                            <div className="text-[9px] text-center text-gray-600 font-medium">
                                5 (Excellent) | 4 (Very Good) | 3 (Good) | 2 (Fair) | 1 (Poor)
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Footer Comments */}{/* Grade Key for Academic */}
            {showOption('showAcademicKey') && (
                <div className="mb-4">
                    <div className="border-2 p-2 bg-white" style={skillStyles.container}>
                        <div className="font-bold text-[10px] mb-1 text-center uppercase" style={skillStyles.header}>KEY TO ACADEMIC GRADES</div>
                        <div className="text-[9px] text-center text-gray-600 font-medium">
                            {reportData.gradingRules && reportData.gradingRules.length > 0
                                ? reportData.gradingRules.map(r => `${r.grade} (${r.minScore}-${r.maxScore})`).join(" | ")
                                : "A (75-100) | B (65-74) | C (50-64) | D (45-49) | E (40-44) | F (0-39)"}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Comments */}
            {config.showComments && (
                <div className="border-2 mb-4" style={footerStyles.container}>
                    {showOption('showTeacherSection') && (
                        <div className="grid grid-cols-[120px_1fr_120px_120px] border-b last:border-b-0 min-h-[40px]" style={footerStyles.borderOnly}>
                            <div className="p-2 font-bold text-[10px] flex items-center bg-gray-50 border-r" style={footerStyles.header}>Class Teacher's Comment:</div>
                            <div className="p-2 text-[10px] border-r italic flex items-center" style={footerStyles.borderOnly}>
                                {showOption('showTeacherComment') ? (reportData.comments.classTeacher || "") : "" /* Removed dummy fallback */}
                            </div>
                            <div className="p-2 text-[10px] border-r flex items-center justify-center" style={footerStyles.borderOnly}>
                                {showOption('showTeacherSign') && (
                                    reportData.classTeacherSignatureUrl ? <img src={reportData.classTeacherSignatureUrl} alt="Sign" className="h-8 max-w-full object-contain" /> : "Sign: __________"
                                )}
                            </div>
                            <div className="p-2 text-[10px] flex items-center justify-center">
                                {showOption('showTeacherDate') && publishedDateLabel}
                            </div>
                        </div>
                    )}
                    {showOption('showPrincipalSection') && (
                        <div className="grid grid-cols-[120px_1fr_120px_120px] min-h-[40px]" style={footerStyles.borderOnly}>
                            <div className="p-2 font-bold text-[10px] flex items-center bg-gray-50 border-r" style={footerStyles.header}>Principal&apos;s Comment:</div>
                            <div className="p-2 text-[10px] border-r italic flex items-center" style={footerStyles.borderOnly}>
                                {showOption('showPrincipalComment') ? (reportData.comments.principal || "") : ""}
                            </div>
                            <div className="p-2 text-[10px] border-r flex items-center justify-center" style={footerStyles.borderOnly}>
                                {showOption('showPrincipalSign') && (
                                    school.principalSignatureUrl ? <img src={school.principalSignatureUrl} alt="Sign" className="h-8 max-w-full object-contain" /> : "Sign: __________"
                                )}
                            </div>
                            <div className="p-2 text-[10px] flex items-center justify-center">
                                {showOption('showPrincipalDate') && publishedDateLabel}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {showOption('showPromotionStatus') && (
                <div className="border-2 p-2 text-center font-bold text-xs" style={footerStyles.header}>
                    PROMOTION STATUS: {reportData.comments.promotionStatus || ""}
                </div>
            )}

        </div>
    );
};

export default StandardReportPreview;
