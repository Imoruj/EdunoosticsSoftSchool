import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./styles";
import { formatScore } from "./scoreFormatting";

interface AcademicTableProps {
    subjects: ReportCardData["academic"]["subjects"];
}

const widths = {
    subject: "18%",
    bf: "7%",
    ca: "6%",
    exam: "7%",
    total: "7%",
    percent: "7%",
    cum: "8%",
    pos: "10%",
    avg: "10%",
    remark: "12%",
    grade: "8%",
};

const customStyles = StyleSheet.create({
    catHeader: {
        backgroundColor: "#f0f0f0",
        textAlign: "center",
        fontSize: 8,
        fontWeight: "bold",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        padding: 2,
    },
});

const AcademicTable: React.FC<AcademicTableProps & { config?: any }> = ({ subjects, config }) => {
    // Group subjects by category
    const categories: Record<string, typeof subjects> = {};
    subjects.forEach(s => {
        const cat = s.category || "OTHER SUBJECTS";
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(s);
    });

    const renderHeader = () => (
        <View style={[styles.tableRow, { backgroundColor: "#f0f0f0" }]}>
            <View style={[styles.tableCol, { width: widths.subject }]}><Text style={[styles.tableCell, styles.bold]}>SUBJECT</Text></View>
            <View style={[styles.tableCol, { width: widths.bf }]}><Text style={[styles.tableCell, styles.bold]}>B/F 1st</Text></View>
            <View style={[styles.tableCol, { width: widths.bf }]}><Text style={[styles.tableCell, styles.bold]}>B/F 2nd</Text></View>
            <View style={[styles.tableCol, { width: widths.ca }]}><Text style={[styles.tableCell, styles.bold]}>CA</Text></View>
            <View style={[styles.tableCol, { width: widths.exam }]}><Text style={[styles.tableCell, styles.bold]}>EXAM</Text></View>
            <View style={[styles.tableCol, { width: widths.total }]}><Text style={[styles.tableCell, styles.bold]}>TOTAL</Text></View>
            <View style={[styles.tableCol, { width: widths.percent }]}><Text style={[styles.tableCell, styles.bold]}>%</Text></View>
            <View style={[styles.tableCol, { width: widths.cum }]}><Text style={[styles.tableCell, styles.bold]}>CUM</Text></View>
            <View style={[styles.tableCol, { width: widths.pos }]}><Text style={[styles.tableCell, styles.bold]}>POS</Text></View>
            <View style={[styles.tableCol, { width: widths.avg }]}><Text style={[styles.tableCell, styles.bold]}>AVG</Text></View>
            <View style={[styles.tableCol, { width: widths.remark }]}><Text style={[styles.tableCell, styles.bold]}>REMARK</Text></View>
            <View style={[styles.tableCol, { width: widths.grade, borderRightWidth: 0 }]}><Text style={[styles.tableCell, styles.bold]}>GRADE</Text></View>
        </View>
    );

    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACADEMIC PERFORMANCE</Text>
            <View style={styles.table}>
                {renderHeader()}
                {Object.entries(categories).map(([catName, catSubjects]) => (
                    <React.Fragment key={catName}>
                        <View style={customStyles.catHeader}>
                            <Text>{catName}</Text>
                        </View>
                        {catSubjects.map((s, idx) => (
                            <View style={styles.tableRow} key={s.id}>
                                <View style={[styles.tableCol, { width: widths.subject }]}>
                                    <Text style={[styles.tableCell, { textAlign: "left" }]}>{s.name}</Text>
                                </View>
                                <View style={[styles.tableCol, { width: widths.bf }]}><Text style={styles.tableCell}>{formatScore(s.cumulativeTotal1)}</Text></View>
                                <View style={[styles.tableCol, { width: widths.bf }]}><Text style={styles.tableCell}>{formatScore(s.cumulativeTotal2)}</Text></View>
                                <View style={[styles.tableCol, { width: widths.ca }]}><Text style={styles.tableCell}>{formatScore(s.ca)}</Text></View>
                                <View style={[styles.tableCol, { width: widths.exam }]}><Text style={styles.tableCell}>{formatScore(s.exam)}</Text></View>
                                <View style={[styles.tableCol, { width: widths.total }]}><Text style={[styles.tableCell, styles.bold]}>{formatScore(s.total)}</Text></View>
                                <View style={[styles.tableCol, { width: widths.percent }]}><Text style={styles.tableCell}>{formatScore(s.total)}%</Text></View>
                                <View style={[styles.tableCol, { width: widths.cum }]}><Text style={styles.tableCell}>{formatScore((s.cumulativeTotal1 || 0) + (s.cumulativeTotal2 || 0) + s.total)}</Text></View>
                                <View style={[styles.tableCol, { width: widths.pos }]}><Text style={styles.tableCell}>{s.subjectPosition}</Text></View>
                                <View style={[styles.tableCol, { width: widths.avg }]}><Text style={styles.tableCell}>{formatScore(s.subjectClassAverage)}</Text></View>
                                <View style={[styles.tableCol, { width: widths.remark }]}><Text style={styles.tableCell}>{s.remark}</Text></View>
                                <View style={[styles.tableCol, { width: widths.grade, borderRightWidth: 0 }]}><Text style={styles.tableCell}>{s.grade}</Text></View>
                            </View>
                        ))}
                    </React.Fragment>
                ))}
            </View>
        </View>
    );
};

export default AcademicTable;
