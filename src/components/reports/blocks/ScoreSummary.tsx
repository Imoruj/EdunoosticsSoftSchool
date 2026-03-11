
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { Academic } from "../types";

const styles = StyleSheet.create({
    statsCol: {
        width: "100%",
        borderWidth: 2,
        borderColor: "#333",
    },
    scoreSummaryRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#333",
    },
    scoreLabel: {
        flex: 2,
        padding: 3,
        fontSize: 8,
        fontWeight: "bold",
        backgroundColor: "#f5f5f5",
        borderRightWidth: 1,
        borderRightColor: "#333",
    },
    scoreValueBox: {
        flex: 1,
        padding: 3,
        fontSize: 8,
        textAlign: "center",
        fontWeight: "bold",
    },
});

interface ScoreSummaryProps {
    academic: Academic;
    sectionStyle?: any;
}

export const ScoreSummary: React.FC<ScoreSummaryProps> = ({ academic, sectionStyle = {} }) => {
    const { container, borderOnly } = sectionStyle;

    return (
        <View style={[styles.statsCol, container]}>
            <View style={[styles.scoreSummaryRow, borderOnly]}>
                <Text style={[styles.scoreLabel, borderOnly]}>TOTAL SCORE OBTAINABLE</Text>
                <Text style={styles.scoreValueBox}>{academic.summary.totalObtainable || (academic.subjects.length * 100)}</Text>
            </View>
            <View style={[styles.scoreSummaryRow, borderOnly]}>
                <Text style={[styles.scoreLabel, borderOnly]}>TOTAL SCORE OBTAINED</Text>
                <Text style={styles.scoreValueBox}>{academic.summary.totalScore}</Text>
            </View>
            <View style={[styles.scoreSummaryRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.scoreLabel, borderOnly]}>AVERAGE PERCENTAGE</Text>
                <Text style={styles.scoreValueBox}>{academic.summary.average.toFixed(1)}%</Text>
            </View>
        </View>
    );
};
