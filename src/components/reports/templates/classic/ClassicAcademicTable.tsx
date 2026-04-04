import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./ClassicStyles";
import { formatScore } from "../../scoreFormatting";

interface AcademicTableProps {
    subjects: ReportCardData["academic"]["subjects"];
}

const AcademicTable: React.FC<AcademicTableProps & { config?: any, reportType?: string }> = ({ subjects, config, reportType }) => {
    const isHalfTerm = reportType === "halfTerm";

    return (
        <View style={styles.table}>
            <View style={[styles.tableRow, { backgroundColor: "#f0f0f0" }]}>
                <View style={[styles.tableCol, { width: isHalfTerm ? "50%" : "34%" }]}><Text style={styles.tableCell}>Subject</Text></View>
                <View style={[styles.tableCol, { width: isHalfTerm ? "25%" : "12%" }]}><Text style={styles.tableCell}>CA</Text></View>
                {!isHalfTerm && <View style={[styles.tableCol, { width: "12%" }]}><Text style={styles.tableCell}>Exam</Text></View>}
                <View style={[styles.tableCol, { width: isHalfTerm ? "25%" : "12%", borderRightWidth: isHalfTerm ? 0 : 1 }]}><Text style={styles.tableCell}>Total</Text></View>
                {!isHalfTerm && (
                    <>
                        <View style={[styles.tableCol, { width: "10%" }]}><Text style={styles.tableCell}>Low</Text></View>
                        <View style={[styles.tableCol, { width: "10%" }]}><Text style={styles.tableCell}>High</Text></View>
                        <View style={[styles.tableCol, { width: "10%", borderRightWidth: 0 }]}><Text style={styles.tableCell}>Grade</Text></View>
                    </>
                )}
            </View>
            {subjects.map((sub) => (
                <View style={styles.tableRow} key={sub.id}>
                    <View style={[styles.tableCol, { width: isHalfTerm ? "50%" : "34%" }]}><Text style={[styles.tableCell, { textAlign: "left", paddingLeft: 5 }]}>{sub.name}</Text></View>
                    <View style={[styles.tableCol, { width: isHalfTerm ? "25%" : "12%" }]}><Text style={styles.tableCell}>{formatScore(sub.ca)}</Text></View>
                    {!isHalfTerm && <View style={[styles.tableCol, { width: "12%" }]}><Text style={styles.tableCell}>{formatScore(sub.exam)}</Text></View>}
                    <View style={[styles.tableCol, { width: isHalfTerm ? "25%" : "12%", borderRightWidth: isHalfTerm ? 0 : 1 }]}><Text style={styles.tableCell}>{formatScore(sub.total)}</Text></View>
                    {!isHalfTerm && (
                        <>
                            <View style={[styles.tableCol, { width: "10%" }]}><Text style={styles.tableCell}>{formatScore(sub.subjectLowestScore)}</Text></View>
                            <View style={[styles.tableCol, { width: "10%" }]}><Text style={styles.tableCell}>{formatScore(sub.subjectHighestScore)}</Text></View>
                            <View style={[styles.tableCol, { width: "10%", borderRightWidth: 0 }]}><Text style={styles.tableCell}>{sub.grade}</Text></View>
                        </>
                    )}
                </View>
            ))}
        </View>
    );
};

export default AcademicTable;
