import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { getAppBranding } from "@/lib/app-branding";
import { siteContent } from "@/lib/site-content";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "antd/dist/reset.css";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getAppBranding();

  return {
    title: branding.appName || siteContent.metadata.title,
    description: siteContent.metadata.description,
    icons: branding.faviconUrl
      ? {
          icon: [{ url: branding.faviconUrl }],
          shortcut: [{ url: branding.faviconUrl }],
          apple: [{ url: branding.faviconUrl }],
        }
      : undefined,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body>
        <ClerkProvider afterSignOutUrl="/login">
          <AntdRegistry>
            <AppThemeProvider>{children}</AppThemeProvider>
          </AntdRegistry>
        </ClerkProvider>
      </body>
    </html>
  );
}
