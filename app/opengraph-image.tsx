import { ImageResponse } from "next/og";

/** Afbeelding bij een gedeelde link (WhatsApp, LinkedIn, e-mail): petrol vlak met de belofte en de leiding. */
export const alt = "Werkly: van aanvraag tot factuur";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
          background: "#0b3d3a",
          color: "white",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Werkly</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 104, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>Van aanvraag</div>
          <div style={{ fontSize: 104, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>tot factuur.</div>
          <div style={{ marginTop: 28, fontSize: 32, color: "#cde7e3" }}>
            Minder administratie voor installatiebedrijven.
          </div>
        </div>
        {/* De leiding met vijf koppelingen */}
        <div style={{ display: "flex", alignItems: "center", position: "relative", height: 40 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 14, height: 12, borderRadius: 6, background: "#0f766e" }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${i * 25}%`,
                marginLeft: i === 0 ? 0 : i === 4 ? -40 : -20,
                width: 40,
                height: 40,
                borderRadius: 20,
                background: "white",
                border: "8px solid #0f766e",
                display: "flex",
              }}
            >
              <div style={{ position: "absolute", right: -6, bottom: -6, width: 14, height: 14, borderRadius: 7, background: "#f5c542" }} />
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
