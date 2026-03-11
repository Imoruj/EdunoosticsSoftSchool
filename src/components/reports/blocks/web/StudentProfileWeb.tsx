
import React from "react";
import { StudentData } from "../../types";

interface StudentProfileWebProps {
    student: StudentData;
    displayOptions?: any;
    sectionStyle?: any;
}

export const StudentProfileWeb: React.FC<StudentProfileWebProps> = ({ student, displayOptions = {}, sectionStyle = {} }) => {
    const showOption = (key: string) => displayOptions[key] !== false;

    const containerStyle = {
        borderWidth: sectionStyle.borderWidth || '2px',
        borderStyle: sectionStyle.borderStyle || 'solid',
        borderColor: sectionStyle.borderColor || '#14532d'
    };

    const headerStyle = {
        backgroundColor: sectionStyle.headerBg || '#f3f4f6',
        color: sectionStyle.headerText || '#1f2937',
        borderBottom: `${sectionStyle.borderWidth || '1px'} ${sectionStyle.borderStyle || 'solid'} ${sectionStyle.borderColor || '#14532d'}`
    };

    const borderStyle = {
        borderColor: sectionStyle.borderColor || '#14532d'
    };

    return (
        <div className="border-2 h-fit w-full" style={containerStyle}>
            <div className="p-2 font-bold text-center text-xs" style={headerStyle}>STUDENT'S PERSONAL DATA</div>
            {showOption('showName') && (
                <div className="grid grid-cols-[80px_1fr] border-b text-[10px]" style={borderStyle}>
                    <div className="p-1.5 font-bold bg-gray-50 border-r" style={borderStyle}>Name</div>
                    <div className="p-1.5 font-bold uppercase">{student.lastName} {student.firstName} {student.otherNames || ""}</div>
                </div>
            )}
            {showOption('showDOB') && (
                <div className="grid grid-cols-[80px_1fr] border-b text-[10px]" style={borderStyle}>
                    <div className="p-1.5 font-bold bg-gray-50 border-r" style={borderStyle}>DOB</div>
                    <div className="p-1.5">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "N/A"}</div>
                </div>
            )}
            {showOption('showSex') && (
                <div className="grid grid-cols-[80px_1fr] border-b text-[10px]" style={borderStyle}>
                    <div className="p-1.5 font-bold bg-gray-50 border-r" style={borderStyle}>Sex</div>
                    <div className="p-1.5 uppercase">{student.gender || "N/A"}</div>
                </div>
            )}
            {showOption('showClass') && (
                <div className="grid grid-cols-[80px_1fr] border-b text-[10px]" style={borderStyle}>
                    <div className="p-1.5 font-bold bg-gray-50 border-r" style={borderStyle}>Class</div>
                    <div className="p-1.5">{student.className}</div>
                </div>
            )}
            {showOption('showAdmNo') && (
                <div className="grid grid-cols-[80px_1fr] text-[10px]">
                    <div className="p-1.5 font-bold bg-gray-50 border-r" style={borderStyle}>Adm No.</div>
                    <div className="p-1.5">{student.admissionNumber}</div>
                </div>
            )}
        </div>
    );
};
