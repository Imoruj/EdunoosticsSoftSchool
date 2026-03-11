import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./styles";

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

const TraitsTable: React.FC<TraitsTableProps & { config?: any }> = ({ affective, psychomotor, config }) => {

    const renderTable = (title: string, data: Array<{ name: string; rating: number }>) => (
        <View style={customStyles.column}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.table}>
                {/* Header */}
                <View style={[styles.tableRow, { backgroundColor: "#f0f0f0" }]}>
                    <View style={[styles.tableCol, customStyles.nameCol]}>
                        <Text style={[styles.tableCell, styles.bold]}>Trait / Skill</Text>
                    </View>
                    {[1, 2, 3, 4, 5].map(n => (
                        <View key={n} style={[styles.tableCol, customStyles.ratingNumCol, n === 5 ? styles.borderRightNone : {}]}>
                            <Text style={[styles.tableCell, styles.bold]}>{n}</Text>
                        </View>
                    ))}
                </View>

                {/* Body */}
                {data.map((item, index) => (
                    <View style={styles.tableRow} key={index}>
                        <View style={[styles.tableCol, customStyles.nameCol]}>
                            <Text style={[styles.tableCell, { textAlign: "left" }]}>{item.name}</Text>
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
            <View style={customStyles.container}>
                {renderTable("AFFECTIVE TRAITS", affective)}
                {renderTable("PSYCHOMOTOR SKILLS", psychomotor)}
            </View>

            {/* Keys to Rating */}
            <View style={[styles.table, { height: 12, flexDirection: "row", alignItems: "center" }]}>
                <Text style={[styles.tableCell, { fontSize: 7, flex: 1, textAlign: "left", paddingLeft: 5 }]}>
                    KEY TO BEHAVIOUR/SKILLS: 5: EXCELLENT, 4: GOOD, 3: FAIR, 2: POOR, 1: VERY POOR
                </Text>
            </View>
        </View>
    );
};

export default TraitsTable;
