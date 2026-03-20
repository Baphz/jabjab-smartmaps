export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentClerkSession } from "@/lib/clerk-auth";
import {
  isSupabaseStorageConfigured,
  uploadFileToSupabaseStorage,
} from "@/lib/supabase-storage";
import { prisma } from "@/lib/prisma";

function normalizeKind(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed || "file";
}

function normalizeBucket(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim().toLowerCase();
  return trimmed || "article";
}

function normalizeLabId(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

export async function POST(req: Request) {
  const session = await getCurrentClerkSession();

  if (!session.userId) {
    return NextResponse.json(
      { error: "Unauthorized. Silakan login terlebih dahulu." },
      { status: 401 }
    );
  }

  if (!session.canAccessDashboard) {
    return NextResponse.json(
      { error: "Forbidden. Akun ini tidak memiliki akses upload." },
      { status: 403 }
    );
  }

  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      {
        error:
          "Supabase Storage belum dikonfigurasi. Isi SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, dan SUPABASE_STORAGE_BUCKET.",
      },
      { status: 503 }
    );
  }

  try {
    const formData = await req.formData();
    const fileEntry = formData.get("file");
    const kind = normalizeKind(formData.get("kind"));
    const bucket = normalizeBucket(formData.get("bucket"));
    const requestedLabId = normalizeLabId(formData.get("labId"));

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { error: "File PDF tidak ditemukan." },
        { status: 400 }
      );
    }

    if (fileEntry.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Hanya file PDF yang dapat di-upload." },
        { status: 400 }
      );
    }

    if (session.isLabAdmin && !session.labId) {
      return NextResponse.json(
        { error: "Akun Labkesda belum ditautkan ke laboratorium." },
        { status: 403 }
      );
    }

    if (session.isLabAdmin && requestedLabId !== session.labId) {
      return NextResponse.json(
        { error: "Akun ini hanya bisa upload untuk laboratorium miliknya." },
        { status: 403 }
      );
    }

    if (session.isLabAdmin && !requestedLabId) {
      return NextResponse.json(
        { error: "Labkesda wajib mengirim labId saat upload PDF." },
        { status: 400 }
      );
    }

    if (requestedLabId) {
      const labExists = await prisma.lab.findUnique({
        where: { id: requestedLabId },
        select: { id: true },
      });

      if (!labExists) {
        return NextResponse.json(
          { error: "Laboratorium tujuan tidak ditemukan." },
          { status: 404 }
        );
      }
    }

    const arrayBuffer = await fileEntry.arrayBuffer();
    const uploaded = await uploadFileToSupabaseStorage({
      fileBuffer: Buffer.from(arrayBuffer),
      originalFileName: fileEntry.name,
      mimeType: fileEntry.type,
      kind,
      labId: requestedLabId,
      bucket,
    });

    return NextResponse.json({
      ok: true,
      fileId: uploaded.publicUrl,
      previewUrl: uploaded.publicUrl,
      fileName: uploaded.path.split("/").pop(),
    });
  } catch (error) {
    console.error("POST /api/uploads/file error:", error);

    const message =
      error instanceof Error ? error.message : "Gagal upload PDF ke Supabase Storage.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
