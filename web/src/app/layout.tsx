import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { cn } from "@/lib/utils";
import { LayoutTransition } from "@/components/layout/LayoutTransition";
import { ResilienceHandler } from "@/components/ui/ResilienceHandler";
import { AgentationMount } from "@/components/dev/AgentationMount";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://devbridge.app"),
  title: "DevBridge — Codebase Onboarding",
  description: "DevBridge turns repositories into living knowledge hubs with grounded answers, repo maps, and annotations for onboarding developers.",
  openGraph: {
    title: "DevBridge — Codebase Onboarding",
    description:
      "Turn repositories into searchable knowledge hubs with grounded answers and citations.",
    url: "https://devbridge.app",
    siteName: "DevBridge",
    type: "website",
    images: [
      {
        url: "/og/devbridge-default.png",
        width: 1200,
        height: 630,
        alt: "DevBridge — codebase onboarding assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DevBridge — Codebase Onboarding",
    description:
      "Turn repositories into searchable knowledge hubs with grounded answers and citations.",
    images: ["/og/devbridge-default.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("h-full", geist.variable, geistMono.variable)}>
      <head />
      <body className="min-h-screen antialiased">
        <a
          href="#main-content"
          className="skip-link"
        >
          Skip to Content
        </a>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true} disableTransitionOnChange>
          <ResilienceHandler />
          <AgentationMount />
          <LayoutTransition>{children}</LayoutTransition>
        </ThemeProvider>
      </body>
    </html>
  );
}
