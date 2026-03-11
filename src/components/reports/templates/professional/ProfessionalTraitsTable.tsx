import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./ProfessionalStyles";

interface TraitsTableProps {
    affective: ReportCardData["affective"];
    psychomotor: ReportCardData["psychomotor"];
}

const customStyles = StyleSheet.create({
    container: {
        flexDirection: "row",
        gap: 5,
        marginTop: 5,
    },
    column: {
        flex: 1,
    },
    nameCol: { width: "60%" },
    ratingNumCol: { width: "8%" },
});

const ProfessionalTraitsTable: React.FC<TraitsTableProps & { config?: any }> = ({ affective, psychomotor, config }) => {

    const renderTable = (title: string, data: Array<{ name: string; rating: number }>) => (
        <View style={customStyles.column}>
            <Text style={styles.sectionHeader}>{title}</Text>
            <View style={styles.table}>
                {/* Header */}
                <View style={[styles.tableRow, { backgroundColor: "#f0f0f0", height: 15 }]}>
                    <View style={[styles.tableCol, customStyles.nameCol]}>
                        <Text style={[styles.tableCell, styles.bold, { textAlign: "left", paddingLeft: 5 }]}>Trait / Skill</Text>
                    </View>
                    {[1, 2, 3, 4, 5].map(n => (
                        <View key={n} style={[styles.tableCol, customStyles.ratingNumCol, n === 5 ? styles.borderRightNone : {}]}>
                            <Text style={[styles.tableCell, styles.bold]}>{n}</Text>
                        </View>
                    ))}
                </View>

                {/* Body */}
                {data.map((item, index) => (
                    <View style={[styles.tableRow, index === data.length - 1 ? { borderBottomWidth: 0 } : {}]} key={index}>
                        <View style={[styles.tableCol, customStyles.nameCol, { alignItems: "flex-start", paddingLeft: 5 }]}>
                            <Text style={styles.tableCell}>{item.name}</Text>
                        </View>
                        {[1, 2, 3, 4, 5].map(n => (
                            <View key={n} style={[styles.tableCol, customStyles.ratingNumCol, n === 5 ? styles.borderRightNone : {}]}>
                                <Text style={styles.tableCell}>{item.rating === n ? "X" : ""}</Text>
                            </View>
                        ))}
                    </View>
                ))}
            </View>
        </View>
    );

    return (
        <View style={{ gap: 5 }}>
            {/* Keys to Rating Banner (Academic) */}
            <View style={[styles.table, { height: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginBottom: 2, borderWidth: 1, borderColor: "#047857" }]}>
                <Text style={{ fontSize: 6, flex: 1, textAlign: "center", fontWeight: "bold", fontFamily: "Helvetica-Bold" }}>
                    KEYS TO RATING: 100-75 (EXCELLENT) | 74-70 (V. GOOD) | 69-65 (V. GOOD) | 64-60 (V. GOOD) | 59-55 (GOOD) | 54-50 (GOOD) | 49-45 (FAIR) | 44-40 (FAIR) | 39-0 (FAIL)
                </Text>
            </View>

            <View style={customStyles.container}>
                {renderTable("AFFECTIVE TRAITS", affective)}
                {renderTable("PSYCHOMOTOR SKILLS", psychomotor)}
            </View>

            <View style={{ flexDirection: "row", gap: 5 }}>
                {/* Keys to Grade Table (Traits) */}
                {config?.showBehaviourGradeKey !== false && (
                    <View style={[styles.table, { width: "40%", marginBottom: 0 }]}>
                        <View style={styles.gridBoxHeader}><Text style={styles.gridBoxHeaderText}>KEY TO BEHAVIOUR/SKILLS</Text></View>
                        {[
                            { k: "5", v: "Excellent" },
                            { k: "4", v: "Good" },
                            { k: "3", v: "Fair" },
                            { k: "2", v: "Poor" },
                            { k: "1", v: "Very Poor" }
                        ].map((item, i) => (
                            <View key={i} style={[styles.gridRow, i === 4 ? { borderBottomWidth: 0 } : {}]}>
                                <View style={[styles.gridLabel, { width: "20%" }]}><Text>{item.k}</Text></View>
                                <View style={[styles.gridValue, { width: "80%" }]}><Text style={{ textAlign: "left", paddingLeft: 5 }}>{item.v}</Text></View>
                            </View>
                        ))}
                    </View>
                )}
                <View style={{ flex: 1 }} />
            </View>
        </View>
    );
};

export default ProfessionalTraitsTable;
