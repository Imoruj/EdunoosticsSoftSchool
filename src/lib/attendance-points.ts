export const ATTENDANCE_POINT_MULTIPLIER = 2;

export interface AttendancePointSummary {
    daysPresent: number;
    daysAbsent: number;
    totalSchoolDays: number;
}

export function toAttendancePoints(value: number | null | undefined) {
    return (value ?? 0) * ATTENDANCE_POINT_MULTIPLIER;
}

export function scaleAttendanceSummaryToPoints<T extends AttendancePointSummary>(attendance: T): T {
    return {
        ...attendance,
        daysPresent: toAttendancePoints(attendance.daysPresent),
        daysAbsent: toAttendancePoints(attendance.daysAbsent),
        totalSchoolDays: toAttendancePoints(attendance.totalSchoolDays),
    };
}

export function formatAttendancePoints(daysPresent: number | null | undefined, totalSchoolDays: number | null | undefined) {
    return `${toAttendancePoints(daysPresent)}/${toAttendancePoints(totalSchoolDays)} points`;
}
