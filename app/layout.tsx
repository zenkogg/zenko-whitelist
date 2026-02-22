import type { Metadata } from "next";
import { Inter, Sora, Press_Start_2P } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: "400",
});

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sora",
  weight: "600",
});

const pressStart2P = Press_Start_2P({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-press-start",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Zenko — Every Game Feeds Your Name | Join The Origin",
  description:
    "They said it's just a game... we made it pay. Before the awards. Before the spotlight. This is where your reputation starts. Join The Origin.",
  authors: [{ name: "Zenko" }],
  creator: "Zenko",
  publisher: "Zenko",
  metadataBase: new URL("https://waitlist.zenko.gg"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/images/zenko-head.svg",
    apple: "/images/zenko-head.svg",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://waitlist.zenko.gg",
    siteName: "Zenko",
    title: "Zenko — Every Game Feeds Your Name | Join The Origin",
    description:
      "They said it's just a game... we made it pay. Before the awards. Before the spotlight. This is where your reputation starts. Join The Origin.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Zenko — Every Game Feeds Your Name",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@zenkogginc",
    creator: "@zenkogginc",
    title: "Zenko — Every Game Feeds Your Name | Join The Origin",
    description:
      "They said it's just a game... we made it pay. Before the awards. Before the spotlight. This is where your reputation starts. Join The Origin.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Zenko — Every Game Feeds Your Name",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${sora.variable} ${pressStart2P.variable}`}>
      <body className="font-sans antialiased">
        <TooltipProvider>
          {children}
          <Analytics />
        </TooltipProvider>
      </body>
    </html>
  );
}
