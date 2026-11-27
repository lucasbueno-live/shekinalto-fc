import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Ícone: gramado com o círculo central e o "7" do suíço em laranja de colete.
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
          background: "repeating-linear-gradient(180deg,#0e3b2c 0 64px,#145239 64px 128px)",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: 300,
            border: "14px solid #f2f4ec",
          }}
        />
        <div style={{ position: "absolute", left: 0, right: 0, top: 249, height: 14, background: "#f2f4ec" }} />
        <div
          style={{
            width: 190,
            height: 190,
            borderRadius: 190,
            background: "#f2862e",
            color: "#0a2b20",
            fontSize: 150,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          7
        </div>
      </div>
    ),
    size,
  );
}
