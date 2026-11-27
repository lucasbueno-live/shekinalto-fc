import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand";

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
          background: `repeating-linear-gradient(180deg,${BRAND.turf900} 0 64px,${BRAND.turf800} 64px 128px)`,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: 300,
            border: `14px solid ${BRAND.chalk}`,
          }}
        />
        <div style={{ position: "absolute", left: 0, right: 0, top: 249, height: 14, background: BRAND.chalk }} />
        <div
          style={{
            width: 190,
            height: 190,
            borderRadius: 190,
            background: BRAND.bib,
            color: BRAND.turf950,
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
