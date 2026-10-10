import type { Metadata, Viewport } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import { SmoothAnchors } from "@/components/SmoothAnchors";
import { TouchActive } from "@/components/TouchActive";
import "./globals.css";

// Archivo met breedte-as: smal en zwaar voor koppen (zoals een typeplaatje), normaal voor lopende tekst.
const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"], axes: ["wdth"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    siteName: "Werkly",
    locale: "nl_NL",
    type: "website",
    title: "Werkly: van aanvraag tot factuur",
    description: "Minder administratie en sneller van aanvraag naar factuur.",
  },
  title: {
    default: "Werkly: van aanvraag tot factuur",
    template: "%s · Werkly",
  },
  description:
    "Werkly automatiseert het kantoorwerk van installatiebedrijven, van klantaanvraag tot offerte, uitvoering en factuur. Minder administratie, meer klussen.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f2f4f1", interactiveWidget: "resizes-content" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="nl" className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TouchActive />
        <SmoothAnchors />
        {children}
      </body>
    </html>
  );
}
