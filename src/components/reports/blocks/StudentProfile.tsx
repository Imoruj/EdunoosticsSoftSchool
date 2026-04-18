
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { Student } from "@prisma/client";
import { formatStudentFullName } from "../formatStudentFullName";

const styles = StyleSheet.create({
    personalDataCol: {
        width: "100%", // Controlled by parent
        borderWidth: 2,
        borderColor: "#333",
    },
    personalDataHeader: {
        backgroundColor: "#e0e0e0",
        padding: 4,
        fontWeight: "bold",
        textAlign: "center",
        borderBottomWidth: 2,
        borderBottomColor: "#333",
        fontSize: 9,
    },
    dataRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#333",
    },
    dataLabel: {
        width: 70,
        padding: 4,
        fontWeight: "bold",
        backgroundColor: "#f5f5f5",
        borderRightWidth: 1,
        borderRightColor: "#333",
        fontSize: 8,
    },
    dataValue: {
        flex: 1,
        padding: 4,
        fontSize: 8,
        justifyContent: "center",
    },
    bold: { fontWeight: "bold" },
});

interface StudentProfileProps {
    student: Student & { className: string }; // Extend type to include className
    displayOptions?: any;
    sectionStyle?: any;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ student, displayOptions = {}, sectionStyle = {} }) => {
    const showOption = (key: string) => displayOptions[key] !== false;
    const { container, header, borderOnly } = sectionStyle;
    const studentFullName = formatStudentFullName(student);

    return (
        <View style={[styles.personalDataCol, container]}>
            <Text style={[styles.personalDataHeader, header]}>STUDENT'S PERSONAL DATA</Text>
            {showOption('showName') && (
                <View style={[styles.dataRow, borderOnly]}>
                    <Text style={[styles.dataLabel, borderOnly]}>Name</Text>
                    <Text style={[styles.dataValue, styles.bold]}>{studentFullName}</Text>
                </View>
            )}
            {showOption('showDOB') && (
                <View style={[styles.dataRow, borderOnly]}>
                    <Text style={[styles.dataLabel, borderOnly]}>Date of Birth</Text>
                    <Text style={styles.dataValue}>
                        {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : "N/A"}
                    </Text>
                </View>
            )}
            {showOption('showSex') && (
                <View style={[styles.dataRow, borderOnly]}>
                    <Text style={[styles.dataLabel, borderOnly]}>Sex</Text>
                    <Text style={styles.dataValue}>{student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1).toLowerCase() : "N/A"}</Text>
                </View>
            )}
            {showOption('showClass') && (
                <View style={[styles.dataRow, borderOnly]}>
                    <Text style={[styles.dataLabel, borderOnly]}>Class</Text>
                    <Text style={styles.dataValue}>{student.className}</Text>
                </View>
            )}
            {showOption('showAdmNo') && (
                <View style={[styles.dataRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.dataLabel, { borderRightColor: borderOnly?.borderColor || "#333" }]}>Admission No</Text>
                    <Text style={styles.dataValue}>{student.admissionNumber}</Text>
                </View>
            )}
        </View>
    );
};
