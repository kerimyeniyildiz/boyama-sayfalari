import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { SonnerToaster } from "@/components/providers/sonner-provider";
import { cn } from "@/lib/utils";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap"
});

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Boyama Sayfaları";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const description =
  "Çocuklar için ücretsiz ve kaliteli boyama sayfaları. Eğitici, güvenli ve baskıya uygun içeriklerle öğrenmeyi eğlenceli hale getiriyoruz.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`
  },
  description,
  applicationName: siteName,
  keywords: [
    "boyama sayfaları",
    "çocuk etkinlikleri",
    "boyama PDF",
    "ücretsiz boyama"
  ],
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  alternates: {
    canonical: siteUrl
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName,
    url: siteUrl,
    title: siteName,
    description
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description
  },
  robots: {
    index: true,
    follow: true
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" }
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "manifest", url: "/site.webmanifest" }]
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const plausibleScriptSrc = process.env.PLAUSIBLE_SCRIPT_SRC;
  const plausibleDomain = process.env.PLAUSIBLE_DOMAIN;

  return (
    <html lang="tr" suppressHydrationWarning>
      <body
        className={cn(
          inter.variable,
          plusJakarta.variable,
          "font-sans bg-brand-light text-brand-dark"
        )}
      >
        {plausibleScriptSrc && plausibleDomain ? (
          <Script
            defer
            data-domain={plausibleDomain}
            src={plausibleScriptSrc}
            strategy="afterInteractive"
          />
        ) : null}
        {children}
        <SonnerToaster />
      </body>
    </html>
  );
}
