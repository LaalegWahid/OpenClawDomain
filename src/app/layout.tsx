import type { Metadata } from "next";
import { Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import "@/shared/style/globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "OpenClaw Manager — Deploy AI Agents",
  description: "Launch specialized AI agents for Finance, Marketing, and Operations. Monitor everything. Command via Telegram.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "OpenClaw Manager — Deploy AI Agents",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${cormorant.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
