import { StyleSheet } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
    page: {
        padding: 20,
        backgroundColor: "#FFFFFF",
        fontFamily: "Helvetica",
    },
    // Header Section
    headerOuterContainer: {
        borderWidth: 2,
        borderColor: "#047857", // Darker Emerald Green
        padding: 5,
        marginBottom: 3,
    },
    logoContainer: {
        width: 80,
        height: 80,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    schoolInfoContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    // Title Strip
    titleBanner: {
        backgroundColor: "#FFFFFF",
        borderWidth: 1.5,
        borderColor: "#000",
        paddingVertical: 3,
        paddingHorizontal: 10,
        alignItems: "center",
        marginBottom: 5,
        textAlign: "center"
    },
    titleText: {
        fontSize: 11,
        fontWeight: "bold",
        fontFamily: "Helvetica-Bold",
        textTransform: "uppercase",
    },
    // Grid System
    gridContainer: {
        flexDirection: "row",
        marginBottom: 5,
        gap: 3,
        height: 100, // Fixed height for this section to ensure alignment
    },
    gridCol: {
        flexDirection: "column",
        flex: 1,
    },
    gridBox: {
        borderWidth: 1,
        borderColor: "#047857", // Green border
        height: "100%",
    },
    gridBoxHeader: {
        backgroundColor: "#d1fae5", // Light Green
        borderBottomWidth: 1,
        borderBottomColor: "#047857",
        padding: 2,
        justifyContent: "center",
        alignItems: "center",
        height: 15,
    },
    gridBoxHeaderText: {
        fontSize: 6,
        fontFamily: "Helvetica-Bold",
        fontWeight: "bold",
        color: "#000",
        textTransform: "uppercase",
    },
    gridRow: {
        flexDirection: "row",
        borderBottomWidth: 0.5,
        borderBottomColor: "#000",
        height: 14, // Fixed row height
        alignItems: "center",
    },
    gridRowLast: {
        borderBottomWidth: 0,
    },
    gridLabel: {
        width: "40%",
        fontSize: 6.5,
        paddingLeft: 3,
        borderRightWidth: 1,
        borderRightColor: "#000",
        height: "100%",
        justifyContent: "center",
        backgroundColor: "#f9fafb",
    },
    gridValue: {
        width: "60%",
        fontSize: 7,
        paddingLeft: 3,
        fontFamily: "Helvetica-Bold",
        fontWeight: "bold",
        height: "100%",
        justifyContent: "center",
    },
    // Main Academic Table
    table: {
        width: "100%",
        borderWidth: 1.5,
        borderColor: "#047857",
        marginBottom: 5,
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: "#fff", // White background for header container
        borderBottomWidth: 1.5,
        borderBottomColor: "#047857",
        height: 35, // Taller header to accommodate wrapped text
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 0.5,
        borderBottomColor: "#000",
        height: 14,
        alignItems: "center",
    },
    tableCol: {
        borderRightWidth: 1,
        borderRightColor: "#047857",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
    tableHeaderCol: {
        borderRightWidth: 1,
        borderRightColor: "#047857",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        padding: 1,
    },
    tableHeaderText: {
        fontSize: 5.5,
        fontFamily: "Helvetica-Bold",
        fontWeight: "bold",
        textAlign: "center",
    },
    tableCell: {
        fontSize: 7,
        textAlign: "center",
        fontFamily: "Helvetica",
    },
    tableCellLeft: {
        fontSize: 7,
        textAlign: "left",
        paddingLeft: 4,
        fontFamily: "Helvetica",
    },
    // Traits & Skills
    sectionHeader: {
        backgroundColor: "#d1fae5",
        borderWidth: 1,
        borderColor: "#047857",
        borderBottomWidth: 0,
        padding: 2,
        textAlign: "center",
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        fontWeight: "bold",
    },
    traitsContainer: {
        flexDirection: "row",
        gap: 5,
        marginBottom: 5,
    },
    traitsBox: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#047857",
    },
    // Footer
    footer: {
        marginTop: 5,
        borderWidth: 1,
        borderColor: "#047857",
        padding: 5,
    },
    footerRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 4,
        borderBottomWidth: 0.5,
        borderBottomColor: "#ccc",
    },
    promotionBox: {
        marginTop: 5,
        padding: 5,
        textAlign: "center",
        fontFamily: "Helvetica-Bold",
        fontSize: 9,
    },
    // Utilities
    bold: {
        fontFamily: "Helvetica-Bold",
        fontWeight: "bold",
    },
    borderRightNone: {
        borderRightWidth: 0,
    },
});
