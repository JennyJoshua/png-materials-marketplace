import type { MetadataRoute } from "next";

/** PWA-ready web app manifest. No service worker yet: offline support is planned for a later phase. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PNG Materials Marketplace",
    short_name: "PNG Materials",
    description: "Find building materials and suppliers in Papua New Guinea.",
    start_url: "/",
    display: "standalone",
    background_color: "#e8eaec",
    theme_color: "#14181b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
