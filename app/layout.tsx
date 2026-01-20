import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Zenko - Join the Waitlist",
  description:
    "Zenko is where real performance determines the outcome. Join the waitlist.",
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
    title: "Zenko - Join the Waitlist",
    description:
      "Zenko is where real performance determines the outcome. Join the waitlist.",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Zenko - Where Real Performance Determines the Outcome",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@zenkogginc",
    creator: "@zenkogginc",
    title: "Zenko - Join the Waitlist",
    description:
      "Zenko is where real performance determines the outcome. Join the waitlist.",
    images: ["/images/og-image.png"],
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
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
