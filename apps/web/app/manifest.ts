import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IG Focus Hub",
    short_name: "IG Focus",
    description: "Instagram without the doomscrolling.",
    start_url: "/inbox",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Inbox", url: "/inbox", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Create", url: "/create", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Business", url: "/business", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
