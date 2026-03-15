import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StrataWatch",
  description:
    "StrataWatch is a real-time conflict heatmap and civilian early-warning platform for monitoring regional safety risk.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} bg-[#0b0b0f] text-zinc-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
