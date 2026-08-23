import type { Metadata } from "next";
import "./globals.css";
import TopBar from '@/components/layout/TopBar';
import Footer from '@/components/layout/Footer';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: "WorkWyse — A public record of what is known about job listings",
  description: "WorkWyse collects what people can show about a job listing — accounts, evidence, automated checks — and keeps it attached to the claim it supports.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:opsz,ital,wght@6..72,0,400;6..72,0,500;6..72,0,600;6..72,1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background">
        <Providers>
          {/*
            Full-height flex column shell. min-h-screen alone is not enough:
            without flex-col + flex-1 on <main>, the footer sits directly
            after whatever height the content happens to take, so on a short
            page (or when zoomed out, which shrinks effective content height)
            it renders partway up the viewport instead of pinned to the
            bottom. flex-1 makes <main> absorb all remaining vertical space,
            which pushes the footer down to the viewport edge on short pages
            and lets it fall naturally after content on long ones.
          */}
          <div className="min-h-screen flex flex-col bg-background text-ink max-w-[1920px] mx-auto">
            <TopBar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
