
import React from "react";
import { StudentData } from "../../types";

interface StudentPhotoWebProps {
    student: StudentData;
    displayOptions?: any;
    sectionStyle?: any;
}

export const StudentPhotoWeb: React.FC<StudentPhotoWebProps> = ({ student, displayOptions = {}, sectionStyle = {} }) => {
    const showOption = (key: string) => displayOptions[key] !== false;

    if (!showOption('showPhoto')) return null;

    const containerStyle = {
        borderWidth: sectionStyle.borderWidth || '2px',
        borderStyle: sectionStyle.borderStyle || 'solid',
        borderColor: sectionStyle.borderColor || '#14532d'
    };

    return (
        <div className="border-2 bg-gray-50 flex items-center justify-center min-h-[140px] w-full" style={containerStyle}>
            {student.photoUrl ? (
                <img src={student.photoUrl} alt="Student" className="w-full h-full object-cover" />
            ) : (
                <div className="text-gray-400 text-[10px]">PHOTO</div>
            )}
        </div>
    );
};
