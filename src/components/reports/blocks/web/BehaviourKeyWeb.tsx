
import React from "react";

interface BehaviourKeyWebProps {
    displayOptions?: any;
    sectionStyle?: any;
}

export const BehaviourKeyWeb: React.FC<BehaviourKeyWebProps> = ({ displayOptions = {}, sectionStyle = {} }) => {
    if (displayOptions.showAffectiveKey === false) return null;

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
            <div className="font-bold text-[10px] mb-1 text-center uppercase" style={headerStyle}>Key To Behaviour/Skills</div>
            <div className="text-[9px] text-center text-gray-600 font-medium">
                5 (Excellent) | 4 (Very Good) | 3 (Good) | 2 (Fair) | 1 (Poor)
            </div>
        </div>
    );
};
