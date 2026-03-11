
import React from "react";
import { AcademicSummary } from "../../types";

interface ScoreSummaryWebProps {
    academic: { summary: AcademicSummary };
    displayOptions?: any;
    sectionStyle?: any;
}

export const ScoreSummaryWeb: React.FC<ScoreSummaryWebProps> = ({ academic, displayOptions = {}, sectionStyle = {} }) => {
    const { summary } = academic;

    const containerStyle = {
        borderWidth: sectionStyle.borderWidth || '2px',
        borderStyle: sectionStyle.borderStyle || 'solid',
        borderColor: sectionStyle.borderColor || '#14532d',
    };

    const borderStyle = {
        borderColor: sectionStyle.borderColor || '#14532d'
    };

    return (
        <div className="border-2 h-fit w-full" style={containerStyle}>
            <div className="grid grid-cols-[2fr_1fr] border-b text-[10px]" style={borderStyle}>
                <div className="p-1.5 font-bold bg-gray-50 border-r" style={borderStyle}>TOTAL SCORE POSSIBLE</div>
                <div className="p-1.5 text-center font-bold">{summary.totalObtainable}</div>
            </div>
            <div className="grid grid-cols-[2fr_1fr] border-b text-[10px]" style={borderStyle}>
                <div className="p-1.5 font-bold bg-gray-50 border-r" style={borderStyle}>TOTAL SCORE OBTAINED</div>
                <div className="p-1.5 text-center font-bold">{summary.totalScore}</div>
            </div>
            <div className="grid grid-cols-[2fr_1fr] text-[10px]">
                <div className="p-1.5 font-bold bg-gray-50 border-r" style={borderStyle}>AVERAGE %</div>
                <div className="p-1.5 text-center font-bold">{summary.average}</div>
            </div>
        </div>
    );
};
