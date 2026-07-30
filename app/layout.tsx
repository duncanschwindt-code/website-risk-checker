import type { Metadata, Viewport } from "next";

import "@/app/globals.css";
import { DemoBanner } from "@/components/demo-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getServerConfig } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL || "http://localhost:3000"),
  title: {
    default: "Website Risk Checker | Teens Against Scams",
    template: "%s | Website Risk Checker",
  },
  description:
    "An educational assessment of observable website risk indicators from Teens Against Scams.",
  applicationName: "Website Risk Checker",
  robots: {
    index: true,
    follow: true,
    noarchive: true,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#10243f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  const config = getServerConfig();
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="fixed top-3 left-3 z-50 -translate-y-24 rounded-lg bg-white px-4 py-3 font-bold shadow-lg transition-transform focus:translate-y-0"
        >
          Skip to main content
        </a>
        {config.APP_MODE === "demo" ? <DemoBanner /> : null}
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
