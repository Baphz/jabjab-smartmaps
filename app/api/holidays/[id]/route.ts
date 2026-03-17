import { HolidayType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/clerk-auth";
import {
  dateKeyToUtcDate,
  normalizeDateKeyInput,
  normalizeOptionalText,
  normalizeText,
} from "@/lib/activity-server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type HolidayPayload = {
  date?: string;
  name?: string;
  type?: string;
  source?: string;
  isActive?: boolean;
};

function normalizeHolidayType(value: unknown) {
  if (value === HolidayType.CUTI_BERSAMA || value === HolidayType.LIBUR_NASIONAL) {
    return value;
  }

  return null;
}

function parseActiveFlag(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export async function PUT(req: Request, context: RouteContext) {
  const authError = await requireAdminApiAccess();

  if (authError) {
    return authError;
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: "ID hari libur tidak valid." },
      { status: 400 }
    );
  }

  try {
    const body = (await req.json()) as HolidayPayload;
    const dateKey = normalizeDateKeyInput(body.date);
    const name = normalizeText(body.name);
    const type = normalizeHolidayType(body.type);
    const source = normalizeOptionalText(body.source);
    const isActive = parseActiveFlag(body.isActive, true);

    if (!dateKey) {
      return NextResponse.json(
        { error: "Tanggal libur wajib diisi." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Nama hari libur wajib diisi." },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: "Jenis hari libur tidak valid." },
        { status: 400 }
      );
    }

    const date = dateKeyToUtcDate(dateKey);

    if (!date) {
      return NextResponse.json(
        { error: "Format tanggal tidak valid." },
        { status: 400 }
      );
    }

    const holiday = await prisma.masterHoliday.update({
      where: { id },
      data: {
        date,
        name,
        type,
        source,
        isActive,
      },
    });

    return NextResponse.json(holiday);
  } catch (error) {
    console.error("PUT /api/holidays/[id] error:", error);

    const message =
      error instanceof Error ? error.message : "Gagal memperbarui hari libur.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const authError = await requireAdminApiAccess();

  if (authError) {
    return authError;
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: "ID hari libur tidak valid." },
      { status: 400 }
    );
  }

  try {
    await prisma.masterHoliday.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true, deletedId: id });
  } catch (error) {
    console.error("DELETE /api/holidays/[id] error:", error);

    const message =
      error instanceof Error ? error.message : "Gagal menghapus hari libur.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
