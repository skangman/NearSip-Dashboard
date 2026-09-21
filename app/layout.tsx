import type { Metadata, Viewport } from "next";
import { THEME_INIT_SCRIPT } from "@/lib/domain/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "NearSip Dashboard — Partner Requirement MVP",
  description: "NearSip partner analytics dashboard mockup",
  icons: {
    icon: "/nearsip-logo.png",
    apple: "/nearsip-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // suppressHydrationWarning: THEME_INIT_SCRIPT sets data-theme on <html> before React hydrates.
  // It is a plain inline <script> in <head> (not next/script): that one runs synchronously while the
  // HTML is parsed, so the first paint already has the right theme. next/script "beforeInteractive"
  // would queue it through the Next runtime and allow a flash of the wrong theme.
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700;800&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
