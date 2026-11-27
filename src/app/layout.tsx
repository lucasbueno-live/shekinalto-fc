import type { Metadata, Viewport } from "next";
import { Barlow, Big_Shoulders } from "next/font/google";
import "./globals.css";

const shoulders = Big_Shoulders({ subsets: ["latin"], weight: ["600", "800", "900"], variable: "--font-shoulders" });
const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-barlow" });

export const metadata: Metadata = {
  title: "Shekinalto FC",
  description: "Cartas, lista da semana e sorteio de times da nossa pelada.",
  appleWebApp: { capable: true, title: "Shekinalto FC", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0e3b2c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${shoulders.variable} ${barlow.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
