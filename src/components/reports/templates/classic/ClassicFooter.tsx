import React from "react";
import { Text, View, Image } from "@react-pdf/renderer";
import { ReportCardData } from "./types";

interface FooterProps {
    comments: ReportCardData["comments"];
    term: ReportCardData["term"];
}

const Footer: React.FC<FooterProps & { config?: any; school?: any }> = ({ comments, term, config, school }) => {
    return (
        <View style={{ marginTop: 20 }}>
            <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold" }}>Class Teacher's Comment:</Text>
                <Text style={{ fontSize: 10, fontStyle: "italic", borderBottomWidth: 1, borderBottomColor: "#ccc", paddingBottom: 2 }}>{comments.classTeacher || "No comment."}</Text>
            </View>
            <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: "bold" }}>Principal's Comment:</Text>
                <Text style={{ fontSize: 10, fontStyle: "italic", borderBottomWidth: 1, borderBottomColor: "#ccc", paddingBottom: 2 }}>{comments.principal || "No comment."}</Text>
                {school?.principalSignatureUrl && (
                    <Image src={school.principalSignatureUrl} style={{ width: 60, height: 30, objectFit: 'contain', marginTop: 5 }} />
                )}
            </View>
            <Text style={{ fontSize: 8, textAlign: "center", color: "#666", marginTop: 20 }}>
                Generated on {new Date().toLocaleDateString()} | Report Card Management System
            </Text>
        </View>
    );
};

export default Footer;
