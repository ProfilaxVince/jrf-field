import type { Metadata, Viewport } from "next";
import "./globals.css";
import { t } from "@/lib/i18n/fr-BE";

export const metadata: Metadata = {
  title: `${t.app.name} — ${t.app.company}`,
  description: t.app.tagline,
  applicationName: t.app.name,
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml", sizes: "192x192" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml", sizes: "512x512" },
    ],
    apple: "/icons/icon-512.svg",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#123f2b",
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
