
import React from "react";
import { View, Image, Text, StyleSheet } from "@react-pdf/renderer";
import { Student } from "@prisma/client";

const styles = StyleSheet.create({
    photoCol: {
        width: "100%", // Parent controls width
        borderWidth: 2,
        borderColor: "#333",
        backgroundColor: "#f9f9f9",
        alignItems: "center",
        justifyContent: "center",
        height: 120,
    },
    studentPhoto: {
        width: "90%",
        height: "90%",
        objectFit: "cover",
    },
});

interface StudentPhotoProps {
    student: Student;
    show?: boolean;
    sectionStyle?: any;
}

export const StudentPhoto: React.FC<StudentPhotoProps> = ({ student, show = true, sectionStyle = {} }) => {
    if (!show) return null;
    const { container } = sectionStyle;

    return (
        <View style={[styles.photoCol, container]}>
            {student.photoUrl ? (
                <Image style={styles.studentPhoto} src={student.photoUrl} />
            ) : (
                <Text style={{ color: "#999", fontSize: 8 }}>PHOTO</Text>
            )}
        </View>
    );
};
