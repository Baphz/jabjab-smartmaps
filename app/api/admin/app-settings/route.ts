import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/clerk-auth";
import { prisma } from "@/lib/prisma";

function normalizeOptionalString(value: unknown) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

export async function POST(req: Request) {
  const authError = await requireAdminApiAccess();

  if (authError) {
    return authError;
  }

  try {
    const body = (await req.json()) as {
      appName?: string;
      shortName?: string;
      logoUrl?: string;
      logoAlt?: string;
      faviconUrl?: string;
      regionLabel?: string;
      organizationName?: string;
      footerTagline?: string;
      publicHomeTitle?: string;
      publicMapTitle?: string;
    };

    const settings = await prisma.appSettings.upsert({
      where: { id: "default" },
      update: {
        appName: normalizeOptionalString(body.appName),
        shortName: normalizeOptionalString(body.shortName),
        logoUrl: normalizeOptionalString(body.logoUrl),
        logoAlt: normalizeOptionalString(body.logoAlt),
        faviconUrl: normalizeOptionalString(body.faviconUrl),
        regionLabel: normalizeOptionalString(body.regionLabel),
        organizationName: normalizeOptionalString(body.organizationName),
        footerTagline: normalizeOptionalString(body.footerTagline),
        publicHomeTitle: normalizeOptionalString(body.publicHomeTitle),
        publicMapTitle: normalizeOptionalString(body.publicMapTitle),
      },
      create: {
        id: "default",
        appName: normalizeOptionalString(body.appName),
        shortName: normalizeOptionalString(body.shortName),
        logoUrl: normalizeOptionalString(body.logoUrl),
        logoAlt: normalizeOptionalString(body.logoAlt),
        faviconUrl: normalizeOptionalString(body.faviconUrl),
        regionLabel: normalizeOptionalString(body.regionLabel),
        organizationName: normalizeOptionalString(body.organizationName),
        footerTagline: normalizeOptionalString(body.footerTagline),
        publicHomeTitle: normalizeOptionalString(body.publicHomeTitle),
        publicMapTitle: normalizeOptionalString(body.publicMapTitle),
      },
    });

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error("POST /api/admin/app-settings error:", error);

    const message =
      error instanceof Error ? error.message : "Gagal menyimpan pengaturan aplikasi.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
