import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import "file-icons-js/css/style.css";
import { cn } from "@/lib/utils";
import { LayoutTransition } from "@/components/layout/LayoutTransition";
import { ResilienceHandler } from "@/components/ui/ResilienceHandler";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://devbridge.app"),
  title: "DevBridge - Codebase Onboarding",
  description: "DevBridge turns repositories into living knowledge hubs with grounded answers, repo maps, and annotations for onboarding developers.",
  icons: {
    icon: "/favicon.svg",
  },
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
    <html lang="en" suppressHydrationWarning className={cn("h-full", fontSans.variable, fontMono.variable)}>
      <head />
      <body className="min-h-screen antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true} disableTransitionOnChange>
          <ResilienceHandler />
          <LayoutTransition>{children}</LayoutTransition>
        </ThemeProvider>
      </body>
    </html>
  );
}
