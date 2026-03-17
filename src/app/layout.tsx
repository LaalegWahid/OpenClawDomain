import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/shared/style/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
