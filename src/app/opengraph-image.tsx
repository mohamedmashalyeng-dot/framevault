import { ImageResponse } from "next/og";
import { BRAND } from "@/config/brand";

export const alt = `${BRAND.name}: website templates, components and AI prompts`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share image for pages without a product poster. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#0e0f10",
          color: "#f1ede5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, letterSpacing: 6 }}>
          <div style={{ width: 40, height: 40, border: "3px solid #f1ede5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 20, height: 20, background: "#5ef2b8", borderRadius: 3 }} />
          </div>
          {BRAND.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 84, lineHeight: 1, letterSpacing: -3, fontWeight: 700 }}>Interfaces that look</div>
          <div style={{ fontSize: 84, lineHeight: 1.05, letterSpacing: -3, fontWeight: 700, color: "#5ef2b8" }}>finished on day one.</div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#a19d95" }}>Templates · Components · Sections · AI prompts</div>
        </div>
      </div>
    ),
    size,
  );
}
