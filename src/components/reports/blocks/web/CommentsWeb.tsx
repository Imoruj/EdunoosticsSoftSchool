
import React from "react";
import { SchoolData, Comments as CommentsData } from "../../types";
import { formatPublishedDate } from "../../formatPublishedDate";

interface CommentsWebProps {
    comments: CommentsData;
    school: SchoolData;
    displayOptions?: any;
    sectionStyle?: any;
}

export const CommentsWeb: React.FC<CommentsWebProps> = ({ comments, school, displayOptions = {}, sectionStyle = {} }) => {
    const showOption = (key: string) => displayOptions[key] !== false;
    const publishedDateLabel = formatPublishedDate(comments.publishedAt);

    const containerStyle = {
        borderWidth: sectionStyle.borderWidth || '2px',
        borderStyle: sectionStyle.borderStyle || 'solid',
        borderColor: sectionStyle.borderColor || '#14532d',
    };

    const headerStyle = {
        backgroundColor: sectionStyle.headerBg || '#f3f4f6',
        color: sectionStyle.headerText || '#1f2937',
        borderRight: `${sectionStyle.borderWidth || '1px'} ${sectionStyle.borderStyle || 'solid'} ${sectionStyle.borderColor || '#14532d'}`
    };

    const borderStyle = {
        borderColor: sectionStyle.borderColor || '#14532d'
    };

    return (
        <div className="w-full">
            <div className="border-2 mb-4" style={containerStyle}>
                {showOption('showTeacherSection') && (
                    <div className="grid grid-cols-[120px_1fr_120px_120px] border-b last:border-b-0 min-h-[40px]" style={borderStyle}>
                        <div className="p-2 font-bold text-[10px] flex items-center bg-gray-50 border-r" style={headerStyle}>Class Teacher's Comment:</div>
                        <div className="p-2 text-[10px] border-r italic flex items-center" style={borderStyle}>
                            {showOption('showTeacherComment') ? (comments.classTeacher || "") : ""}
                        </div>
                        <div className="p-2 text-[10px] border-r flex items-center justify-center" style={borderStyle}>
                            {showOption('showTeacherSign') && "Sign: __________"}
                        </div>
                        <div className="p-2 text-[10px] flex items-center justify-center">
                            {showOption('showTeacherDate') && publishedDateLabel}
                        </div>
                    </div>
                )}
                {showOption('showPrincipalSection') && (
                    <div className="grid grid-cols-[120px_1fr_120px_120px] min-h-[40px]" style={borderStyle}>
                        <div className="p-2 font-bold text-[10px] flex items-center bg-gray-50 border-r" style={headerStyle}>Principal's Comment:</div>
                        <div className="p-2 text-[10px] border-r italic flex items-center" style={borderStyle}>
                            {showOption('showPrincipalComment') ? (comments.principal || "") : ""}
                        </div>
                        <div className="p-2 text-[10px] border-r flex items-center justify-center" style={borderStyle}>
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

            {showOption('showPromotionStatus') && (
                <div className="border-2 p-2 text-center font-bold text-xs" style={{ ...containerStyle, backgroundColor: sectionStyle.headerBg || '#f3f4f6', color: sectionStyle.headerText || '#1f2937' }}>
                    PROMOTION STATUS: {comments.promotionStatus || "PROMOTED TO NEXT CLASS"}
                </div>
            )}
        </div>
    );
};
