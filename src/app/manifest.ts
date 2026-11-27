import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shekinalto FC",
    short_name: "Shekinalto FC",
    description: "Cartas, lista da semana e sorteio de times da nossa pelada.",
    start_url: "/",
    display: "standalone",
    background_color: BRAND.turf900,
    theme_color: BRAND.turf900,
    lang: "pt-BR",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
