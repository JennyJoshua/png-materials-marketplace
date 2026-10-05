import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PNG Materials Marketplace", template: "%s | PNG Materials Marketplace" },
  description: "Find building materials and suppliers in Papua New Guinea.",
  applicationName: "PNG Materials Marketplace",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#14181b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
