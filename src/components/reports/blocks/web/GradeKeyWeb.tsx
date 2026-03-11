
import React from "react";

interface GradeKeyWebProps {
    displayOptions?: any;
    sectionStyle?: any;
}

export const GradeKeyWeb: React.FC<GradeKeyWebProps> = ({ displayOptions = {}, sectionStyle = {} }) => {
    if (displayOptions.showAcademicKey === false) return null;

    const containerStyle = {
        borderWidth: sectionStyle.borderWidth || '2px',
        borderStyle: sectionStyle.borderStyle || 'solid',
        borderColor: sectionStyle.borderColor || '#14532d',
    };

    const headerStyle = {
        backgroundColor: sectionStyle.headerBg || '#f3f4f6',
        color: sectionStyle.headerText || '#1f2937',
    };

    return (
        <div className="border-2 p-2 bg-white w-full" style={containerStyle}>
            <div className="font-bold text-[10px] mb-1 text-center uppercase" style={headerStyle}>KEY TO ACADEMIC GRADES</div>
            <div className="text-[9px] text-center text-gray-600 font-medium">
                A (75-100) | B (65-74) | C (50-64) | D (45-49) | E (40-44) | F (0-39)
            </div>
        </div>
    );
};
