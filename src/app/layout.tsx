import type { Metadata, Viewport } from "next";
import "./globals.css";
import { t } from "@/lib/i18n/fr-BE";

export const metadata: Metadata = {
  title: `${t.app.name} — ${t.app.company}`,
  description: t.app.tagline,
  applicationName: t.app.name,
};

export const viewport: Viewport = {
  themeColor: "#123f2b", // = --jrf-green-800 (métadonnée hors CSS, seule exception au zéro-hex)
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr-BE">
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
