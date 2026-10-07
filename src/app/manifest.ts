import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: "Premier SEO",
    description: SITE.description,
    start_url: "/",
    display: "browser",
    background_color: "#F8F7F4",
    theme_color: "#2553B8",
    icons: [
      { src: "/icon.png", sizes: "256x256", type: "image/png" },
      { src: "/brand/logo-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
