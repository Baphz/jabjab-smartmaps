import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { siteContent } from "@/lib/site-content";

export type AppBranding = {
  appName: string;
  shortName: string;
  logoUrl: string;
  logoAlt: string;
  faviconUrl: string;
  regionLabel: string;
  organizationName: string;
  footerTagline: string;
  publicHomeTitle: string;
  publicMapTitle: string;
};

export const defaultAppBranding: AppBranding = {
  appName: siteContent.brand.appName,
  shortName: siteContent.brand.shortName,
  logoUrl: siteContent.brand.logoUrl,
  logoAlt: siteContent.brand.logoAlt,
  faviconUrl: "/favicon.ico",
  regionLabel: siteContent.brand.regionLabel,
  organizationName: siteContent.brand.organizationName,
  footerTagline: siteContent.brand.footerTagline,
  publicHomeTitle: siteContent.publicHome.title,
  publicMapTitle: siteContent.publicHome.sections.mapTitle,
};

function normalizeString(value: string | null | undefined, fallback: string) {
  const trimmed = String(value ?? "").trim();
  return trimmed || fallback;
}

export const getAppBranding = cache(async (): Promise<AppBranding> => {
  try {
    const settings = await prisma.appSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      return defaultAppBranding;
    }

    return {
      appName: normalizeString(settings.appName, defaultAppBranding.appName),
      shortName: normalizeString(settings.shortName, defaultAppBranding.shortName),
      logoUrl: normalizeString(settings.logoUrl, defaultAppBranding.logoUrl),
      logoAlt: normalizeString(settings.logoAlt, defaultAppBranding.logoAlt),
      faviconUrl: normalizeString(settings.faviconUrl, defaultAppBranding.faviconUrl),
      regionLabel: normalizeString(settings.regionLabel, defaultAppBranding.regionLabel),
      organizationName: normalizeString(
        settings.organizationName,
        defaultAppBranding.organizationName
      ),
      footerTagline: normalizeString(
        settings.footerTagline,
        defaultAppBranding.footerTagline
      ),
      publicHomeTitle: normalizeString(
        settings.publicHomeTitle,
        defaultAppBranding.publicHomeTitle
      ),
      publicMapTitle: normalizeString(
        settings.publicMapTitle,
        defaultAppBranding.publicMapTitle
      ),
    };
  } catch (error) {
    console.error("getAppBranding error:", error);
    return defaultAppBranding;
  }
});
