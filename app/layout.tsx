import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { getAppBranding } from "@/lib/app-branding";
import { siteContent } from "@/lib/site-content";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import "antd/dist/reset.css";
import "./globals.css";
import "leaflet/dist/leaflet.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

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
    <html lang="id" className={plusJakartaSans.variable} suppressHydrationWarning>
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
