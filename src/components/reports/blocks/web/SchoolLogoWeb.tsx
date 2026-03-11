
import React from "react";
import { SchoolData } from "../../types";

interface SchoolLogoWebProps {
    school: SchoolData;
    borderColor?: string;
    show?: boolean;
}

export const SchoolLogoWeb: React.FC<SchoolLogoWebProps> = ({ school, borderColor = "#14532d", show = true }) => {
    if (!show) return null;

    return (
        <div className="w-24 h-24 rounded-lg flex items-center justify-center mr-5 shrink-0" style={{ backgroundColor: borderColor }}>
            <div className="w-20 h-20 border-2 border-white rounded-full flex items-center justify-center relative bg-opacity-20 bg-white overflow-hidden">
                {school.logoUrl ? (
                    <img src={school.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-white text-4xl font-bold">L</span>
                )}
            </div>
        </div>
    );
};
