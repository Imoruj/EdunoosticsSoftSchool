import React from "react";
import { Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./styles";

interface HeaderProps {
    school: ReportCardData["school"];
    term: ReportCardData["term"];
}

const customStyles = StyleSheet.create({
    container: {
        borderWidth: 2,
        borderColor: "#059669",
        padding: 5,
        marginBottom: 5,
        flexDirection: "row",
        alignItems: "center",
    },
    logo: {
        width: 80,
        height: 80,
    },
    textContainer: {
        flex: 1,
        alignItems: "center",
    },
    schoolName: {
        fontSize: 18,
        fontWeight: "bold",
        textTransform: "uppercase",
    },
    schoolDetails: {
        fontSize: 8,
        marginTop: 2,
    },
    motto: {
        fontSize: 8,
        fontStyle: "italic",
        marginTop: 2,
    },
    email: {
        fontSize: 8,
        marginTop: 2,
    },
    reportTitleBox: {
        borderWidth: 1,
        borderColor: "#000",
        padding: 4,
        marginTop: 10,
        width: "100%",
        backgroundColor: "#fff",
    },
    reportTitle: {
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
        textTransform: "uppercase",
    },
});

const Header: React.FC<HeaderProps & { config?: any }> = ({ school, term, config }) => {
    return (
        <View style={styles.header}>
            <View style={customStyles.container}>
                {school.logoUrl && (
                    <Image style={customStyles.logo} src={school.logoUrl} />
                )}
                <View style={customStyles.textContainer}>
                    <Text style={customStyles.schoolName}>{school.name}</Text>
                    <Text style={customStyles.schoolDetails}>{school.address}</Text>
                    <Text style={customStyles.motto}>Motto: {school.motto || "Knowledge is Power"}</Text>
                    <Text style={customStyles.email}>{school.email}</Text>
                </View>
                {/* Visual balance spacer if no right-side logo */}
                <View style={{ width: 80 }} />
            </View>

            <View style={customStyles.reportTitleBox}>
                <Text style={customStyles.reportTitle}>
                    {term.sessionName} {term.name} REPORT SHEET
                </Text>
            </View>
        </View>
    );
};

export default Header;
