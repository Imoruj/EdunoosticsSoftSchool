import React from "react";
import { Text, View, Image } from "@react-pdf/renderer";
import { ReportCardData } from "./types";
import { styles } from "./ProfessionalStyles";

interface HeaderProps {
    school: ReportCardData["school"];
    term: ReportCardData["term"];
}

const Header: React.FC<HeaderProps & { config?: any }> = ({ school, term, config }) => {
    return (
        <View>
            <View style={styles.headerOuterContainer}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                    <View style={styles.logoContainer}>
                        {school.logoUrl ? (
                            <Image style={{ width: 70, height: 70 }} src={school.logoUrl} />
                        ) : (
                            <View style={{ width: 70, height: 70, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" }}>
                                <Text style={{ fontSize: 8 }}>LOGO</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.schoolInfoContainer}>
                        <Text style={{ fontSize: 16, fontFamily: "Helvetica-Bold", fontWeight: "bold", textTransform: "uppercase", color: "#047857" }}>{school.name}</Text>
                        <Text style={{ fontSize: 8, marginTop: 4, fontFamily: "Helvetica" }}>{school.address}</Text>
                        <Text style={{ fontSize: 8, marginTop: 2, fontFamily: "Helvetica-Oblique", fontStyle: "italic" }}>Motto: {school.motto || "His Grace is Sufficient"}</Text>
                        <Text style={{ fontSize: 8, marginTop: 2, fontFamily: "Helvetica" }}>{school.email}</Text>
                    </View>
                    {/* Visual balance spacer */}
                    <View style={{ width: 80 }} />
                </View>
            </View>

            <View style={styles.titleBanner}>
                <Text style={styles.titleText}>
                    {term.sessionName} {term.name} REPORT SHEET
                </Text>
            </View>
        </View>
    );
};

export default Header;
