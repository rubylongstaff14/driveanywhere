import type { Metadata } from "next";
import { IBM_Plex_Mono, Outfit, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ConditionalFooter } from "@/components/layout/conditional-footer";
import { ConditionalModeBanner } from "@/components/layout/conditional-mode-banner";
import { Header } from "@/components/layout/header";
import "./globals.css";

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "DriveAnywhere.ai — Race simplified London routes",
    template: "%s · DriveAnywhere.ai",
  },
  description:
    "Race simplified versions of real London routes and challenge your friends for the fastest time.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    title: "DriveAnywhere.ai",
    description:
      "Race simplified versions of real London routes and challenge your friends for the fastest time.",
    type: "website",
    siteName: "DriveAnywhere.ai",
  },
  twitter: {
    card: "summary_large_image",
    title: "DriveAnywhere.ai",
    description:
      "Race simplified versions of real London routes and challenge your friends for the fastest time.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="bg-ink-950 text-foreground flex min-h-full flex-col">
        <a
          href="#main-content"
          className="focus:bg-accent focus:text-ink-950 sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <AuthProvider>
          <ConditionalModeBanner />
          <Header />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <ConditionalFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
