import React from "react";
import { Text, View, Image } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./ProfessionalStyles";

interface FooterProps {
    comments: ReportCardData["comments"];
    term: ReportCardData["term"];
}

const ProfessionalFooter: React.FC<FooterProps & { config?: any }> = ({ comments, term, config }) => {
    return (
        <View style={styles.footer}>
            {/* Class Teacher Comment */}
            <View style={[styles.footerRow, { borderBottomWidth: 1, borderBottomColor: "#000", paddingBottom: 5 }]}>
                <View style={{ width: "70%", flexDirection: "row" }}>
                    <Text style={[styles.bold, { fontSize: 8 }]}>Class Teacher's Comments: </Text>
                    <Text style={{ fontSize: 8, marginLeft: 5, fontFamily: "Helvetica-Oblique", fontStyle: "italic" }}>
                        {comments.classTeacher || "Good result, keep it up."}
                    </Text>
                </View>
                <View style={{ width: "15%", flexDirection: "row", alignItems: "center" }}>
                    <Text style={[styles.bold, { fontSize: 8 }]}>Sign:</Text>
                    <View style={{ borderBottomWidth: 1, borderBottomColor: "#000", width: 40, marginLeft: 2 }} />
                </View>
                <View style={{ width: "15%", flexDirection: "row", alignItems: "center" }}>
                    <Text style={[styles.bold, { fontSize: 8 }]}>Date:</Text>
                    <Text style={{ fontSize: 8, marginLeft: 2 }}>24/10/2021</Text>
                </View>
            </View>

            {/* Principal Comment */}
            <View style={[styles.footerRow, { borderBottomWidth: 1, borderBottomColor: "#000", paddingBottom: 5, marginTop: 5 }]}>
                <View style={{ width: "70%", flexDirection: "row" }}>
                    <Text style={[styles.bold, { fontSize: 8 }]}>Principal's Comments: </Text>
                    <Text style={{ fontSize: 8, marginLeft: 5, fontFamily: "Helvetica-Oblique", fontStyle: "italic" }}>
                        {comments.principal || "Excellent performance."}
                    </Text>
                </View>
                <View style={{ width: "15%", flexDirection: "row", alignItems: "center" }}>
                    <Text style={[styles.bold, { fontSize: 8 }]}>Sign:</Text>
                    {config?.school?.principalSignatureUrl ? (
                        <Image src={config.school.principalSignatureUrl} style={{ width: 40, height: 20, marginLeft: 2, objectFit: 'contain' }} />
                    ) : (
                        <View style={{ borderBottomWidth: 1, borderBottomColor: "#000", width: 40, marginLeft: 2 }} />
                    )}
                </View>
                <View style={{ width: "15%", flexDirection: "row", alignItems: "center" }}>
                    <Text style={[styles.bold, { fontSize: 8 }]}>Date:</Text>
                    <Text style={{ fontSize: 8, marginLeft: 2 }}>{new Date().toLocaleDateString()}</Text>
                </View>
            </View>

            {/* Promotion Status */}
            <View style={{ flexDirection: "row", marginTop: 5, alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={[styles.bold, { fontSize: 8 }]}>Promotion Status: </Text>
                        <Text style={{ fontSize: 8, marginLeft: 5, fontFamily: "Helvetica-Bold", textTransform: "uppercase" }}>
                            {comments.promotionStatus || "PROMOTED TO NEXT CLASS"}
                        </Text>
                    </View>
                </View>
                {/* Back to School Badge */}
                <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: "#047857", justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ fontSize: 4, textAlign: "center", color: "#047857", fontFamily: "Helvetica-Bold" }}>BACK TO SCHOOL</Text>
                    <Text style={{ fontSize: 4, textAlign: "center", color: "#047857", marginTop: 1 }}>
                        {term.nextTermStartDate ? new Date(term.nextTermStartDate).toLocaleDateString() : ""}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export default ProfessionalFooter;
