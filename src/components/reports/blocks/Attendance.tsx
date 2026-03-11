
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { Attendance as AttendanceType } from "../types";

const styles = StyleSheet.create({
    statsCol: {
        width: "100%",
        borderWidth: 2,
        borderColor: "#333",
        marginBottom: 10,
    },
    statsHeader: {
        backgroundColor: "#e0e0e0",
        padding: 4,
        fontWeight: "bold",
        textAlign: "center",
        borderBottomWidth: 2,
        borderBottomColor: "#333",
        fontSize: 9,
    },
    attendanceGrid: {
        flexDirection: "row",
        borderBottomWidth: 1, // Optional based on style
        borderBottomColor: "#333",
    },
    attendanceCell: {
        flex: 1,
        padding: 2,
        borderRightWidth: 1,
        borderRightColor: "#333",
        alignItems: "center",
        justifyContent: "center",
    },
    attendanceLabel: {
        fontSize: 7,
        textAlign: "center",
        marginBottom: 2,
    },
    attendanceValue: {
        fontSize: 10,
        fontWeight: "bold",
    },
});

interface AttendanceProps {
    attendance: AttendanceType;
    displayOptions?: any;
    sectionStyle?: any;
}

export const Attendance: React.FC<AttendanceProps> = ({ attendance, displayOptions = {}, sectionStyle = {} }) => {
    const showOption = (key: string) => displayOptions[key] !== false;
    const { container, header, borderOnly } = sectionStyle;

    return (
        <View style={[styles.statsCol, container]}>
            <Text style={[styles.statsHeader, header]}>ATTENDANCE</Text>
            <View style={[styles.attendanceGrid, borderOnly]}>
                {showOption('showAttOpened') && (
                    <View style={[styles.attendanceCell, borderOnly]}>
                        <Text style={styles.attendanceLabel}>No. of Times School Opened</Text>
                        <Text style={styles.attendanceValue}>{attendance.totalSchoolDays}</Text>
                    </View>
                )}
                {showOption('showAttPresent') && (
                    <View style={[styles.attendanceCell, borderOnly]}>
                        <Text style={styles.attendanceLabel}>No. of Times Present</Text>
                        <Text style={styles.attendanceValue}>{attendance.daysPresent}</Text>
                    </View>
                )}
                {showOption('showAttAbsent') && (
                    <View style={[styles.attendanceCell, { borderRightWidth: 0 }]}>
                        <Text style={styles.attendanceLabel}>No. of Times Absent</Text>
                        <Text style={styles.attendanceValue}>{attendance.daysAbsent}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};
