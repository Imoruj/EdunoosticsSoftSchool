
import React from "react";
import { View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
    gradeKey: {
        marginVertical: 5,
        padding: 5,
        borderWidth: 1,
        borderColor: '#333',
    },
    gradeKeyTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 2,
    },
    gradeKeyText: {
        fontSize: 7,
        textAlign: 'center',
    },
});

interface GradeKeyProps {
    displayOptions?: any;
    sectionStyle?: any;
}

export const GradeKey: React.FC<GradeKeyProps> = ({ displayOptions = {}, sectionStyle = {} }) => {
    if (displayOptions.showAcademicKey === false) return null;

    const { container, header } = sectionStyle;

    return (
        <View style={[styles.gradeKey, container]}>
            <Text style={[styles.gradeKeyTitle, header]}>KEY TO ACADEMIC GRADES</Text>
            <Text style={styles.gradeKeyText}>
                A (75-100) | B (65-74) | C (50-64) | D (45-49) | E (40-44) | F (0-39)
            </Text>
        </View>
    );
};
