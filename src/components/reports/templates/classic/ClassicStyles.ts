import { StyleSheet } from "@react-pdf/renderer";

export const styles = StyleSheet.create({
    page: {
        flexDirection: "column",
        backgroundColor: "#FFFFFF",
        padding: 20,
        fontFamily: "Helvetica",
    },
    header: {
        marginBottom: 10,
        alignItems: "center",
    },
    section: {
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: "bold",
        backgroundColor: "#f0f0f0",
        textAlign: "center",
        borderWidth: 1,
        borderColor: "#000",
        padding: 2,
    },
    table: {
        display: "flex",
        width: "100%",
        borderStyle: "solid",
        borderWidth: 1,
        borderColor: "#000",
    },
    tableRow: {
        flexDirection: "row",
        minHeight: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#000",
        alignItems: "center",
    },
    tableCol: {
        borderRightWidth: 1,
        borderRightColor: "#000",
        height: "100%",
        justifyContent: "center",
        padding: 2,
    },
    tableCell: {
        fontSize: 8,
        textAlign: "center",
    },
    bold: {
        fontWeight: "bold",
    },
    textCenter: {
        textAlign: "center",
    },
    borderBottomNone: {
        borderBottomWidth: 0,
    },
    borderRightNone: {
        borderRightWidth: 0,
    },
});
