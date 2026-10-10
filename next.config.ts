import type { NextConfig } from "next";

const common = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/**
 * Wat de site mag laden. Alles komt van onszelf; alleen het adres opzoeken in het klantformulier gaat naar PDOK.
 * Next.js zet kleine stukjes script in de pagina zelf, daarom staat 'unsafe-inline' aan. In ontwikkeling zijn
 * ook 'unsafe-eval' en een websocket nodig voor het live verversen.
 */
const dev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://api.pdok.nl${dev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");
common.push({ key: "Content-Security-Policy", value: csp });

const nextConfig: NextConfig = {
  // Alleen voor een tweede, aparte testserver; standaard blijft het gewone .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      { source: "/:path*", headers: common },
      // Alles behalve de intake mag niet in een iframe: het klantformulier is bedoeld als insluitbare widget.
      {
        source: "/((?!intake).*)",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
    ];
  },
};

export default nextConfig;
