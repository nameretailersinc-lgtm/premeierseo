import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** Shared 1200×630 Open Graph card (design doc §7.4): paper background, ink text, one accent. */
export function ogImage({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  const size = title.length > 48 ? 64 : title.length > 30 ? 76 : 88;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#F8F7F4",
          padding: "72px 80px",
          borderLeft: "20px solid #2553B8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#65625B", letterSpacing: 1, textTransform: "uppercase" }}>{eyebrow}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: size, fontWeight: 700, color: "#1C1B19", lineHeight: 1.1, letterSpacing: -1 }}>{title}</div>
          {subtitle && (
            <div style={{ display: "flex", marginTop: 24, fontSize: 34, color: "#4A4843", lineHeight: 1.35, maxWidth: 980 }}>{subtitle}</div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#2553B8",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            P
          </div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: "#1C1B19" }}>Premier SEO Services</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}

export function logoImage(px: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2553B8",
          borderRadius: px * 0.22,
          color: "#ffffff",
          fontSize: px * 0.62,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        P
      </div>
    ),
    { width: px, height: px },
  );
}
