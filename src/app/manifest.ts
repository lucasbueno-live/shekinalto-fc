import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shekinalto FC",
    short_name: "Shekinalto FC",
    description: "Cartas, lista da semana e sorteio de times da nossa pelada.",
    start_url: "/",
    display: "standalone",
    background_color: "#0e3b2c",
    theme_color: "#0e3b2c",
    lang: "pt-BR",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
