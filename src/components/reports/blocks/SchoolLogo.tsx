
import React from "react";
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { School } from "@prisma/client";

const styles = StyleSheet.create({
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 15,
    },
    logoInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    logoImage: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
    },
});

interface SchoolLogoProps {
    school: School;
    borderColor?: string;
    show?: boolean;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({ school, borderColor = "#2e7d32", show = true }) => {
    if (!show) return null;

    return (
        <View style={[styles.logoContainer, { backgroundColor: borderColor }]}>
            <View style={styles.logoInner}>
                {school.logoUrl ? (
                    <Image style={styles.logoImage} src={school.logoUrl} />
                ) : (
                    <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>Logo</Text>
                )}
            </View>
        </View>
    );
};
