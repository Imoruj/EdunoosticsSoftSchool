
import React from "react";
import { TermData } from "../../types";

interface TermInfoWebProps {
    term: TermData;
    displayOptions?: any;
    headerStyle?: any;
    reportType?: "halfTerm" | "endOfTerm";
}

export const TermInfoWeb: React.FC<TermInfoWebProps> = ({ term, displayOptions = {}, headerStyle = {}, reportType }) => {
    const showOption = (key: string) => displayOptions[key] !== false;

    if (!showOption('showTermHeader')) return null;

    return (
        <div
            className="text-center p-2 font-bold text-sm border-2 mb-4 uppercase w-full"
            style={{
                backgroundColor: headerStyle.backgroundColor || '#f3f4f6',
                color: headerStyle.color || '#1f2937',
                borderColor: headerStyle.borderColor || '#14532d'
            }}
        >
            {term.sessionName} {term.name} {reportType === "halfTerm" ? "HALF TERM REPORT" : "REPORT SHEET"}
        </div>
    );
};
