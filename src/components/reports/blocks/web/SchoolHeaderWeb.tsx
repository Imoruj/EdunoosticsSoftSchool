
import React from "react";
import { SchoolData } from "../../types";

interface SchoolHeaderWebProps {
    school: SchoolData;
    displayOptions?: any;
}

export const SchoolHeaderWeb: React.FC<SchoolHeaderWebProps> = ({ school, displayOptions = {} }) => {
    const showOption = (key: string) => displayOptions[key] !== false;

    return (
        <div className="flex-1 text-center font-bold text-[#14532d]">
            {showOption('showSchoolName') && <h1 className="text-2xl font-black mb-1 uppercase tracking-wider scale-y-110">{school.name}</h1>}
            {showOption('showSchoolAddress') && (
                <p className="text-[10px] mb-0.5 font-medium">{school.address}</p>
            )}
            {(showOption('showSchoolMotto') && school.motto) && <p className="text-[9px] italic font-serif mb-0.5" style={{ fontFamily: 'Georgia, serif' }}>Motto: {school.motto}</p>}
            {showOption('showSchoolContact') && <p className="text-[9px] font-medium">{school.email} | {school.phone}</p>}
        </div>
    );
};
