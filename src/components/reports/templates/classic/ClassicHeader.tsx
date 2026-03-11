import React from "react";
import { Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./ClassicStyles";

interface HeaderProps {
    school: ReportCardData["school"];
    term: ReportCardData["term"];
}

const Header: React.FC<HeaderProps & { config?: any }> = ({ school, term, config }) => {
    return (
        <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
                {school.logoUrl && (
                    <Image style={{ width: 60, height: 60 }} src={school.logoUrl} />
                )}
                <View style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ fontSize: 20, fontWeight: "bold", textTransform: "uppercase" }}>{school.name}</Text>
                    <Text style={{ fontSize: 10 }}>{school.address}</Text>
                    <Text style={{ fontSize: 9 }}>{school.email} | {school.phone}</Text>
                </View>
            </View>
            <View style={{ borderBottomWidth: 2, borderBottomColor: "#000", marginBottom: 5 }} />
            <Text style={{ fontSize: 14, fontWeight: "bold", textAlign: "center", textTransform: "uppercase" }}>
                STUDENT TERM REPORT - {term.name}
            </Text>
            <Text style={{ fontSize: 10, textAlign: "center" }}>{term.sessionName}</Text>
        </View>
    );
};

export default Header;
