import type { Metadata } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import "@/shared/style/globals.css";
import { RumProvider } from "@/feature/monitor_RUM/RUM";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  variable: "--serif", subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"], style: ["normal", "italic"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--mono", subsets: ["latin"], weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "OpenClaw Manager — Deploy Your very Own AI Agents",
  description: "Launch specialized AI agents for Finance, Marketing, and Operations. Monitor everything. Command via Telegram.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "OpenClaw Manager — Deploy your Own AI Agents",
    description: "Launch specialized AI agents for Finance, Marketing, and Operations. Monitor everything. Command via Telegram.",
    images: [{ url: "/og.svg", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenClaw Manager — Deploy AI Agents",
    description: "Launch specialized AI agents for Finance, Marketing, and Operations.",
    images: ["/og.svg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} ${jetbrainsMono.variable} antialiased`}>
        <RumProvider />
        {children}
      </body>
    </html>
  );
}