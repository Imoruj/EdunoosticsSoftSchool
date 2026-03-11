
import React from "react";
import { Attendance as AttendanceData } from "../../types";

interface AttendanceWebProps {
    attendance: AttendanceData;
    displayOptions?: any;
    sectionStyle?: any;
    showAttendance?: boolean;
}

export const AttendanceWeb: React.FC<AttendanceWebProps> = ({ attendance, displayOptions = {}, sectionStyle = {}, showAttendance = true }) => {
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

    if (!showAttendance) return null;

    return (
        <div className="border-2 h-fit w-full" style={containerStyle}>
            <div className="p-2 font-bold text-center text-xs" style={headerStyle}>ATTENDANCE</div>
            <>
                <div className="grid grid-cols-3 border-b text-[9px] text-center" style={borderStyle}>
                    {showOption('showAttOpened') && <div className="p-1 border-r" style={borderStyle}>School Opened</div>}
                    {showOption('showAttPresent') && <div className="p-1 border-r" style={borderStyle}>Present</div>}
                    {showOption('showAttAbsent') && <div className="p-1">Absent</div>}
                </div>
                <div className="grid grid-cols-3 text-sm font-bold text-center" style={borderStyle}>
                    {showOption('showAttOpened') && <div className="p-1 border-r" style={borderStyle}>{attendance.totalSchoolDays}</div>}
                    {showOption('showAttPresent') && <div className="p-1 border-r" style={borderStyle}>{attendance.daysPresent}</div>}
                    {showOption('showAttAbsent') && <div className="p-1">{attendance.daysAbsent}</div>}
                </div>
            </>
        </div>
    );
};
