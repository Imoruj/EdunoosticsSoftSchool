import React from "react";
import { Text, View } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./ClassicStyles";

interface TraitsTableProps {
    affective: ReportCardData["affective"];
    psychomotor: ReportCardData["psychomotor"];
}

const TraitsTable: React.FC<TraitsTableProps & { config?: any }> = ({ affective, psychomotor, config }) => {
    return (
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 15 }}>
            <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Affective Domain</Text>
                <View style={styles.table}>
                    {affective.map((item, id) => (
                        <View style={styles.tableRow} key={id}>
                            <View style={[styles.tableCol, { width: "70%" }]}><Text style={[styles.tableCell, { textAlign: "left", fontSize: 7 }]}>{item.name}</Text></View>
                            <View style={[styles.tableCol, { width: "30%", borderRightWidth: 0 }]}><Text style={styles.tableCell}>{item.rating}</Text></View>
                        </View>
                    ))}
                </View>
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Psychomotor Domain</Text>
                <View style={styles.table}>
                    {psychomotor.map((item, id) => (
                        <View style={styles.tableRow} key={id}>
                            <View style={[styles.tableCol, { width: "70%" }]}><Text style={[styles.tableCell, { textAlign: "left", fontSize: 7 }]}>{item.name}</Text></View>
                            <View style={[styles.tableCol, { width: "30%", borderRightWidth: 0 }]}><Text style={styles.tableCell}>{item.rating}</Text></View>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
};

export default TraitsTable;
