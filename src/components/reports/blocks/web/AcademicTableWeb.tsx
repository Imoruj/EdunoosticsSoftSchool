
import React from "react";
import { Academic } from "../../types";
import { formatScore } from "../../scoreFormatting";

interface AcademicTableWebProps {
    academic: Academic;
    displayOptions?: any;
    sectionStyle?: any;
    assessmentTypes?: { field: string; name: string; maxScore: number }[];
}

export const AcademicTableWeb: React.FC<AcademicTableWebProps> = ({ academic, displayOptions = {}, sectionStyle = {}, assessmentTypes = [] }) => {
    const showOption = (key: string) => displayOptions[key] !== false;
    const caAssessmentTypes = assessmentTypes.filter(at => at.field !== "exam");

    const containerStyle = {
        borderWidth: sectionStyle.borderWidth || '2px',
        borderStyle: sectionStyle.borderStyle || 'solid',
        borderColor: sectionStyle.borderColor || '#14532d'
    };

    const headerStyle = {
        backgroundColor: sectionStyle.headerBg || '#f3f4f6',
        color: sectionStyle.headerText || '#1f2937',
        borderColor: sectionStyle.borderColor || '#14532d'
    };

    const borderStyle = {
        borderColor: sectionStyle.borderColor || '#14532d'
    };

    return (
        <div className="w-full">
            <div className="text-center p-1.5 font-bold text-xs border-2 border-b-0" style={headerStyle}>ACADEMIC PERFORMANCE</div>
            <table className="w-full border-2 border-collapse text-[10px]" style={containerStyle}>
                <thead>
                    <tr style={headerStyle}>
                        <th rowSpan={2} className="border p-2 text-left" style={borderStyle}>SUBJECT</th>
                        {showOption('showTermHistory') && <th colSpan={2} className="border p-1 text-center font-bold whitespace-nowrap" style={borderStyle}>TERM HISTORY</th>}
                        {showOption('showCA1') && caAssessmentTypes.map(at => (
                            <th key={at.field} rowSpan={2} className="border p-1 text-center text-[10px] whitespace-nowrap" style={borderStyle}>{at.name.toUpperCase()}</th>
                        ))}
                        {showOption('showCA') && <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={borderStyle}>CA</th>}
                        {showOption('showExam') && <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={borderStyle}>EXAM</th>}
                        {showOption('showSubjectTotal') && <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={borderStyle}>TOTAL</th>}
                        {showOption('showGrade') && <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={borderStyle}>GRADE</th>}
                        {showOption('showSubjectPosition') && <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={borderStyle}>POS</th>}
                        {showOption('showSubjectAverage') && <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={borderStyle}>AVG</th>}
                        {showOption('showSubjectLowHigh') && (
                            <>
                                <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={borderStyle}>LOW</th>
                                <th rowSpan={2} className="border p-1 text-center whitespace-nowrap" style={borderStyle}>HIGH</th>
                            </>
                        )}
                        {showOption('showRemarks') && <th rowSpan={2} className="border p-2 text-center" style={borderStyle}>REMARK</th>}
                    </tr>
                    <tr style={headerStyle}>
                        {showOption('showTermHistory') && (
                            <>
                                <th className="border p-1 text-center text-[9px] whitespace-nowrap" style={borderStyle}>1ST</th>
                                <th className="border p-1 text-center text-[9px] whitespace-nowrap" style={borderStyle}>2ND</th>
                            </>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {academic.subjects.map((sub, i) => (
                        <tr key={i}>
                            <td className="border p-2 font-bold bg-gray-50 text-left whitespace-nowrap" style={borderStyle}>{sub.name}</td>
                            {showOption('showTermHistory') && (
                                <>
                                    <td className="border p-1 text-center" style={borderStyle}>{formatScore(sub.cumulativeTotal1)}</td>
                                    <td className="border p-1 text-center" style={borderStyle}>{formatScore(sub.cumulativeTotal2)}</td>
                                </>
                            )}
                            {showOption('showCA1') && caAssessmentTypes.map(at => (
                                <td key={at.field} className="border p-1 text-center" style={borderStyle}>{formatScore(sub[at.field] as number | undefined)}</td>
                            ))}
                            {showOption('showCA') && <td className="border p-1 text-center" style={borderStyle}>{formatScore(sub.ca)}</td>}
                            {showOption('showExam') && <td className="border p-1 text-center" style={borderStyle}>{formatScore(sub.exam)}</td>}
                            {showOption('showSubjectTotal') && <td className="border p-1 text-center font-bold" style={borderStyle}>{formatScore(sub.total)}</td>}
                            {showOption('showGrade') && <td className="border p-1 text-center font-bold" style={borderStyle}>{sub.grade}</td>}
                            {showOption('showSubjectPosition') && <td className="border p-1 text-center text-[9px]" style={borderStyle}>{sub.subjectPosition}</td>}
                            {showOption('showSubjectAverage') && <td className="border p-1 text-center text-[9px]" style={borderStyle}>{formatScore(sub.subjectClassAverage)}</td>}
                            {showOption('showSubjectLowHigh') && (
                                <>
                                    <td className="border p-1 text-center text-[9px]" style={borderStyle}>{formatScore(sub.subjectLowestScore)}</td>
                                    <td className="border p-1 text-center text-[9px]" style={borderStyle}>{formatScore(sub.subjectHighestScore)}</td>
                                </>
                            )}
                            {showOption('showRemarks') && <td className="border p-2 text-center text-[9px] whitespace-nowrap" style={borderStyle}>{sub.remark}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
