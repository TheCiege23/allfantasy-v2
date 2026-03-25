import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AllFantasy",
    short_name: "AllFantasy",
    description:
      "AI-powered fantasy sports tools: trade analyzer, mock drafts, waiver advice, bracket challenges, and league management.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#020617",
    categories: ["sports", "games", "productivity"],
    lang: "en",
    icons: [
      {
        src: "/af-crest.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/af-crest.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/af-crest.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
