
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { Trait } from "../types";

const styles = StyleSheet.create({
    traitsCol: {
        width: "100%", // Controlled by parent
        borderWidth: 2,
        borderColor: "#333",
    },
    traitsHeader: {
        backgroundColor: "#e0e0e0",
        padding: 4,
        textAlign: "center",
        fontWeight: "bold",
        borderBottomWidth: 1,
        borderBottomColor: "#333",
        fontSize: 9,
    },
    traitRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        alignItems: "center",
    },
    traitNameCol: {
        width: "40%",
        padding: 3,
        borderRightWidth: 1,
        borderRightColor: "#333",
        backgroundColor: "#fafafa",
    },
    traitRatingCol: {
        flex: 1,
        flexDirection: "row",
    },
    ratingBox: {
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: "#eee",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
    },
    checkmark: {
        fontSize: 8,
        color: "#2e7d32",
    },
});

interface PsychomotorProps {
    skills: Trait[];
    displayOptions?: any;
    sectionStyle?: any;
}

export const Psychomotor: React.FC<PsychomotorProps> = ({ skills, displayOptions = {}, sectionStyle = {} }) => {
    const showOption = (key: string) => displayOptions[key] !== false;
    const { container, header, borderOnly, checkmarkColor } = sectionStyle;

    const renderRatingCheck = (rating: number, target: number) => {
        return Math.round(rating) === target ? <Text style={[styles.checkmark, { color: checkmarkColor }]}>✓</Text> : null;
    };

    return (
        <View style={[styles.traitsCol, container]}>
            <Text style={[styles.traitsHeader, header]}>PSYCHOMOTOR SKILLS</Text>
            {/* Header Row */}
            <View style={[styles.traitRow, header]}>
                <View style={[styles.traitNameCol, borderOnly]}><Text style={{ fontSize: 8, color: header?.color }}>SKILL</Text></View>
                <View style={styles.traitRatingCol}>
                    {[1, 2, 3, 4, 5].map(n => (
                        <View key={n} style={styles.ratingBox}>
                            <Text style={{ fontSize: 8, color: header?.color }}>{n}</Text>
                        </View>
                    ))}
                </View>
            </View>
            {/* Rows */}
            {skills.map((trait, i) => {
                const skillKey = trait.name.replace(/\s+/g, '');
                if (showOption(`showSkill${skillKey}`) === false) return null;
                return (
                    <View key={i} style={[styles.traitRow, borderOnly]}>
                        <View style={[styles.traitNameCol, borderOnly]}>
                            <Text style={{ fontSize: 7 }}>{trait.name}</Text>
                        </View>
                        <View style={styles.traitRatingCol}>
                            {[1, 2, 3, 4, 5].map(n => (
                                <View key={n} style={[styles.ratingBox, borderOnly]}>
                                    {renderRatingCheck(trait.rating, n)}
                                </View>
                            ))}
                        </View>
                    </View>
                );
            })}
        </View>
    );
};
