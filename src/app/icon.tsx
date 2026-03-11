import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
    width: 32,
    height: 32,
};

export const contentType = "image/png";

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #1d4ed8, #0f172a)",
                    color: "#ffffff",
                    fontSize: 16,
                    fontWeight: 700,
                    borderRadius: 8,
                    letterSpacing: "-0.08em",
                }}
            >
                RC
            </div>
        ),
        size
    );
}
