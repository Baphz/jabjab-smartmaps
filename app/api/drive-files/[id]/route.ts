export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  buildGoogleDriveThumbnailUrl,
  isLikelyGoogleDriveFileId,
} from "@/lib/drive-file";
import {
  downloadImageFromGoogleDrive,
  isGoogleDriveConfigured,
} from "@/lib/google-drive";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

async function isKnownLabPhoto(fileId: string) {
  const found = await prisma.lab.findFirst({
    where: {
      OR: [
        { labPhotoUrl: fileId },
        { labPhotoUrl: { contains: fileId } },
        { head1PhotoUrl: fileId },
        { head1PhotoUrl: { contains: fileId } },
        { head2PhotoUrl: fileId },
        { head2PhotoUrl: { contains: fileId } },
      ],
    },
    select: {
      id: true,
    },
  });

  return Boolean(found);
}

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const fileId = String(id ?? "").trim();

  if (!isLikelyGoogleDriveFileId(fileId)) {
    return NextResponse.json({ error: "ID file tidak valid." }, { status: 400 });
  }

  const allowed = await isKnownLabPhoto(fileId);

  if (!allowed) {
    return NextResponse.json(
      { error: "File gambar tidak terdaftar di aplikasi." },
      { status: 404 }
    );
  }

  if (!isGoogleDriveConfigured()) {
    return NextResponse.redirect(buildGoogleDriveThumbnailUrl(fileId), {
      status: 307,
    });
  }

  try {
    const response = await downloadImageFromGoogleDrive(fileId);

    return new Response(response.body, {
      status: 200,
      headers: {
        "Content-Type":
          response.headers.get("Content-Type") ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("GET /api/drive-files/[id] error:", error);

    return NextResponse.redirect(buildGoogleDriveThumbnailUrl(fileId), {
      status: 307,
    });
  }
}
