import type { Metadata } from "next";
import { Geist, Geist_Mono, Cormorant_Garamond, JetBrains_Mono } from "next/font/google";
import "@/shared/style/globals.css";
import { AwsRum, type AwsRumConfig } from "aws-rum-web";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const cormorant = Cormorant_Garamond({
  variable: "--serif", subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"], style: ["normal", "italic"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--mono", subsets: ["latin"], weight: ["400", "500"],
});

// Initialize RUM once at module level — runs only on the client
if (typeof window !== "undefined") {
  try {
    const config: AwsRumConfig = {
      sessionSampleRate: 1,
      endpoint: "https://dataplane.rum.us-west-1.amazonaws.com",
      telemetries: ["performance", "errors", "http"],
      allowCookies: true,
      enableXRay: false,
      signing: false, // public resource policy — no credentials needed
    };
    new AwsRum("f5446ebc-0937-4e3b-90e1-12fdf4a48f20", "1.0.0", "us-west-1", config);
  } catch {
    // silently ignore init errors
  }
}

export const metadata: Metadata = {
  title: "OpenClaw Manager — Deploy AI Agents",
  description: "Launch specialized AI agents for Finance, Marketing, and Operations. Monitor everything. Command via Telegram.",
  icons: { icon: "/favicon.svg" },
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}