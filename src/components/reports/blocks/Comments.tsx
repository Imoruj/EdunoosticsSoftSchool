
import React from "react";
import { View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { School } from "@prisma/client";
import { Comments as CommentsType } from "../types";

const styles = StyleSheet.create({
    footer: {
        borderWidth: 2,
        borderColor: "#333",
        marginTop: 10,
    },
    footerRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: "#333",
        alignItems: "center",
        minHeight: 40,
    },
    footerLabel: {
        width: 120,
        padding: 5,
        fontWeight: "bold",
        backgroundColor: "#f5f5f5",
        borderRightWidth: 1,
        borderRightColor: "#333",
        fontSize: 9,
    },
    footerText: {
        flex: 1,
        padding: 5,
        fontSize: 9,
        borderRightWidth: 1,
        borderRightColor: "#333",
    },
    footerSign: {
        width: 80,
        padding: 5,
        fontSize: 9,
        textAlign: "center",
        borderRightWidth: 1,
        borderRightColor: "#333",
    },
    footerDate: {
        width: 100,
        padding: 5,
        fontSize: 9,
        textAlign: "center",
    },
    promotionStatus: {
        backgroundColor: "#e0e0e0",
        padding: 8,
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 10,
        borderWidth: 2,
        borderColor: "#333",
        marginTop: 10,
    },
});

interface CommentsProps {
    comments: CommentsType;
    school: School;
    displayOptions?: any;
    sectionStyle?: any;
}

export const Comments: React.FC<CommentsProps> = ({ comments, school, displayOptions = {}, sectionStyle = {} }) => {
    const showOption = (key: string) => displayOptions[key] !== false;
    const { container, header, borderOnly } = sectionStyle;

    return (
        <>
            {showOption('showComments') && (
                <View style={[styles.footer, container]}>
                    {showOption('showTeacherSection') && (
                        <View style={[styles.footerRow, borderOnly]}>
                            <Text style={[styles.footerLabel, header]}>Class Teacher's Comment:</Text>
                            <Text style={[styles.footerText, borderOnly]}>
                                {showOption('showTeacherComment') ? (comments.classTeacher || "") : ""}
                            </Text>
                            {showOption('showTeacherSign') && <Text style={[styles.footerSign, borderOnly]}>Sign: __________</Text>}
                            {showOption('showTeacherDate') && <Text style={styles.footerDate}>Date: __________</Text>}
                        </View>
                    )}
                    {showOption('showPrincipalSection') && (
                        <View style={[styles.footerRow, { borderBottomWidth: 0 }]}>
                            <Text style={[styles.footerLabel, header]}>Principal's Comment:</Text>
                            <Text style={[styles.footerText, borderOnly]}>
                                {showOption('showPrincipalComment') ? (comments.principal || "") : ""}
                            </Text>
                            {showOption('showPrincipalSign') && (
                                <View style={[styles.footerSign, borderOnly, { alignItems: 'center', justifyContent: 'center' }]}>
                                    {school.principalSignatureUrl ? (
                                        <Image src={school.principalSignatureUrl} style={{ width: 60, height: 30, objectFit: 'contain' }} />
                                    ) : (
                                        <Text>Sign: __________</Text>
                                    )}
                                </View>
                            )}
                            {showOption('showPrincipalDate') && <Text style={styles.footerDate}>Date: __________</Text>}
                        </View>
                    )}
                </View>
            )}

            {showOption('showPromotionStatus') && (
                <View style={[styles.promotionStatus, header, { borderTopWidth: container?.borderWidth, borderLeftWidth: container?.borderWidth, borderRightWidth: container?.borderWidth, borderBottomWidth: container?.borderWidth }]}>
                    <Text>PROMOTION STATUS: {comments.promotionStatus || "PROMOTED TO NEXT CLASS"}</Text>
                </View>
            )}
        </>
    );
};
