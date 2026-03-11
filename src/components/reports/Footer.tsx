import React from "react";
import { Text, View, StyleSheet } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./styles";

interface FooterProps {
    comments: ReportCardData["comments"];
    term: ReportCardData["term"];
}

const customStyles = StyleSheet.create({
    container: {
        marginTop: 10,
    },
    commentRow: {
        flexDirection: "row",
        borderWidth: 1,
        borderColor: "#000",
        minHeight: 30,
        marginBottom: 5,
    },
    commentLabel: {
        width: "25%",
        fontSize: 8,
        fontWeight: "bold",
        backgroundColor: "#f0f0f0",
        padding: 5,
        borderRightWidth: 1,
        borderRightColor: "#000",
        justifyContent: "center",
    },
    commentValue: {
        width: "75%",
        fontSize: 8,
        padding: 5,
        justifyContent: "center",
    },
    signatureGrid: {
        flexDirection: "row",
        gap: 5,
        marginTop: 5,
    },
    sigBox: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#000",
        padding: 5,
        height: 80,
    },
    sigTitle: {
        fontSize: 7,
        fontWeight: "bold",
        textTransform: "uppercase",
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        textAlign: "center",
        paddingBottom: 2,
        marginBottom: 5,
    },
    promotionBox: {
        flex: 1.5,
        borderWidth: 1,
        borderColor: "#000",
        padding: 5,
    },
    checkboxRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 3,
    },
    checkbox: {
        width: 10,
        height: 10,
        borderWidth: 1,
        borderColor: "#000",
        marginRight: 5,
        justifyContent: "center",
        alignItems: "center",
    },
    checkboxText: {
        fontSize: 6,
    },
    promoLabel: {
        fontSize: 7,
        fontWeight: "bold",
    },
    badgeBox: {
        flex: 1,
        borderWidth: 2,
        borderColor: "#059669",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ecfdf5",
    },
    badgeText: {
        fontSize: 12,
        fontWeight: "bold",
        color: "#059669",
        textAlign: "center",
    },
});

const Footer: React.FC<FooterProps & { config?: any }> = ({ comments, term, config }) => {
    // Determine promotion status (this would usually be in the data)
    const promotionStatus = "PROMOTED TO"; // Placeholder
    const nextClass = "JS 2"; // Placeholder

    return (
        <View style={customStyles.container}>
            {/* Class Teacher's Comment */}
            <View style={customStyles.commentRow}>
                <View style={customStyles.commentLabel}><Text>Class Teacher's Comment</Text></View>
                <View style={customStyles.commentValue}><Text>{comments.classTeacher || "An excellent performance. Keep it up!"}</Text></View>
            </View>

            {/* Principal's Comment */}
            <View style={customStyles.commentRow}>
                <View style={customStyles.commentLabel}><Text>Principal's Comment</Text></View>
                <View style={customStyles.commentValue}><Text>{comments.principal || "A very good result. Congratulations!"}</Text></View>
            </View>

            {/* Signature & Promotion Grid */}
            <View style={customStyles.signatureGrid}>
                {/* Teacher Signature */}
                <View style={customStyles.sigBox}>
                    <Text style={customStyles.sigTitle}>Class Teacher</Text>
                    <View style={{ flex: 1 }} />
                    <View style={{ borderTopWidth: 1, borderTopColor: "#000", paddingTop: 2 }}>
                        <Text style={{ fontSize: 6, textAlign: "center" }}>Name & Signature / Date</Text>
                    </View>
                </View>

                {/* Principal Signature */}
                <View style={customStyles.sigBox}>
                    <Text style={customStyles.sigTitle}>Principal</Text>
                    <View style={{ flex: 1 }} />
                    <View style={{ borderTopWidth: 1, borderTopColor: "#000", paddingTop: 2 }}>
                        <Text style={{ fontSize: 6, textAlign: "center" }}>Name & Signature / Date</Text>
                    </View>
                </View>

                {/* Promotion Status */}
                <View style={customStyles.promotionBox}>
                    <Text style={customStyles.sigTitle}>Promotion Status</Text>
                    {[
                        { label: "PROMOTED TO", value: "JS 2" },
                        { label: "PROMOTED ON TRIAL", value: "" },
                        { label: "TO REPEAT CLASS", value: "" },
                        { label: "WITHDRAWN", value: "" }
                    ].map((item, i) => (
                        <View key={i} style={customStyles.checkboxRow}>
                            <View style={customStyles.checkbox}>
                                <Text style={customStyles.checkboxText}>{item.value ? "X" : ""}</Text>
                            </View>
                            <Text style={customStyles.promoLabel}>{item.label} {item.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Badge */}
                <View style={customStyles.badgeBox}>
                    <Text style={customStyles.badgeText}>BACK TO SCHOOL</Text>
                    <Text style={{ fontSize: 8, marginTop: 5 }}>
                        {term.nextTermStartDate ? new Date(term.nextTermStartDate).toLocaleDateString() : "TBA"}
                    </Text>
                </View>
            </View>

            <View style={{ marginTop: 10, alignItems: "center" }}>
                <Text style={{ fontSize: 6, color: "#666" }}>
                    Generated on {new Date().toLocaleDateString()} | Report Card Management System | Secure Digital Copy
                </Text>
            </View>
        </View>
    );
};

export default Footer;
