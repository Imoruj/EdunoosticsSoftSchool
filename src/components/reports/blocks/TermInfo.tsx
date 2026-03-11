
import React from "react";
import { Text, StyleSheet } from "@react-pdf/renderer";
import { TermData } from "../types";

const styles = StyleSheet.create({
    termHeader: {
        backgroundColor: "#e0e0e0",
        textAlign: "center",
        padding: 6,
        fontSize: 12,
        fontWeight: "bold",
        marginBottom: 10,
        borderWidth: 2,
        borderColor: "#333",
    },
});

interface TermInfoProps {
    term: TermData;
    show?: boolean;
    style?: any;
}

export const TermInfo: React.FC<TermInfoProps> = ({ term, show = true, style = {} }) => {
    if (!show) return null;

    return (
        <Text style={[styles.termHeader, style]}>
            {term.sessionName} {term.name.toUpperCase()} REPORT SHEET
        </Text>
    );
};
