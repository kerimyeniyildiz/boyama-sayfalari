import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import { cn } from "@/lib/utils";
import { SonnerToaster } from "@/components/providers/sonner-provider";

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
  "Çocuklar için binlerce ücretsiz boyama sayfaları seni bekliyor. Renklerle hayal gücünü geliştir. Hemen yüksek kaliteli PDF boyama sayfasını indir, yazdır ve boya!";

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
  authors: [{ name: "Boyama Sayfaları" }],
  creator: "Boyama Sayfaları",
  publisher: "Boyama Sayfaları",
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
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png"
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
