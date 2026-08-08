import type { Metadata, Viewport } from "next";
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
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
