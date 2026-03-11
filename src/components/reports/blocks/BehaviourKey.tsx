
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
    footer: {
        borderWidth: 2,
        borderColor: "#333",
        marginTop: 0,
        padding: 5,
    },
    header: {
        fontSize: 8,
        fontWeight: "bold",
        textAlign: 'center',
        padding: 2,
        marginBottom: 4,
        letterSpacing: 1,
    }
});

interface BehaviourKeyProps {
    displayOptions?: any;
    sectionStyle?: any;
}

export const BehaviourKey: React.FC<BehaviourKeyProps> = ({ displayOptions = {}, sectionStyle = {} }) => {
    // Synchronized toggle logic handled in parent or here? 
    // Usually config.showBehaviourGradeKey OR config.displayOptions.showAffectiveKey
    // We assume the caller checks visibility, but we check here too if passed in displayOptions
    if (displayOptions.showAffectiveKey === false && displayOptions.showBehaviourGradeKey === false) return null;

    const { container, header } = sectionStyle;

    return (
        <View style={[styles.footer, container]}>
            <Text style={[styles.header, header]}>
                Key To Behaviour/Skills:
            </Text>
            <Text style={{ fontSize: 7, textAlign: 'center' }}>
                5 (Excellent) | 4 (Very Good) | 3 (Good) | 2 (Fair) | 1 (Poor)
            </Text>
        </View>
    );
};
