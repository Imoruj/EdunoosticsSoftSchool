
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { School } from "@prisma/client";

const styles = StyleSheet.create({
    schoolInfo: {
        flex: 1,
        alignItems: "center",
        textAlign: "center",
    },
    schoolName: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 4,
        textTransform: "uppercase",
    },
    subtitle: {
        fontSize: 10,
        marginBottom: 2,
        color: "#333",
    },
    motto: {
        fontSize: 9,
        fontStyle: "italic",
        color: "#555",
        marginBottom: 2,
    },
    email: {
        fontSize: 8,
        color: "#555",
    },
});

interface SchoolHeaderProps {
    school: School;
    displayOptions?: any;
}

export const SchoolHeader: React.FC<SchoolHeaderProps> = ({ school, displayOptions = {} }) => {
    const showOption = (key: string) => displayOptions[key] !== false;

    return (
        <View style={styles.schoolInfo}>
            {showOption('showSchoolName') && <Text style={styles.schoolName}>{school.name}</Text>}
            {showOption('showSchoolAddress') && (
                <Text style={styles.subtitle}>{school.address}</Text>
            )}
            {(showOption('showSchoolMotto') && school.motto) && <Text style={styles.motto}>Motto: "{school.motto}"</Text>}
            {showOption('showSchoolContact') && <Text style={styles.email}>{school.email} | {school.phone}</Text>}
        </View>
    );
};
