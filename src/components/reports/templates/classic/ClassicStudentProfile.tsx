import React from "react";
import { Text, View, Image } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./ClassicStyles";
import { formatStudentFullName } from "../../formatStudentFullName";

interface StudentProfileProps {
    student: ReportCardData["student"];
    term: ReportCardData["term"];
    attendance: ReportCardData["attendance"];
    summary: ReportCardData["academic"]["summary"];
}

const StudentProfile: React.FC<StudentProfileProps & { config?: any }> = ({ student, term, attendance, summary, config }) => {
    const studentFullName = formatStudentFullName(student);

    return (
        <View style={{ marginBottom: 15, flexDirection: "row", justifyContent: "space-between" }}>
            <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", marginBottom: 2 }}>
                    <Text style={[styles.bold, { width: 100, fontSize: 10 }]}>Name:</Text>
                    <Text style={{ fontSize: 10 }}>{studentFullName}</Text>
                </View>
                <View style={{ flexDirection: "row", marginBottom: 2 }}>
                    <Text style={[styles.bold, { width: 100, fontSize: 10 }]}>Admission No:</Text>
                    <Text style={{ fontSize: 10 }}>{student.admissionNumber}</Text>
                </View>
                <View style={{ flexDirection: "row", marginBottom: 2 }}>
                    <Text style={[styles.bold, { width: 100, fontSize: 10 }]}>Class:</Text>
                    <Text style={{ fontSize: 10 }}>{student.className}</Text>
                </View>
            </View>
            {student.photoUrl && (
                <View style={{ width: 80, height: 80, borderWidth: 1, borderColor: "#ccc" }}>
                    <Image style={{ width: "100%", height: "100%" }} src={student.photoUrl} />
                </View>
            )}
        </View>
    );
};

export default StudentProfile;
