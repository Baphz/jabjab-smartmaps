import { NextResponse } from "next/server";
import { getCurrentClerkSession } from "@/lib/clerk-auth";
import {
  dateKeyToUtcDate,
  normalizeDateKeyInput,
  normalizeOptionalText,
  normalizeText,
} from "@/lib/activity-server";
import { resolveRelatedArticleForEvent } from "@/lib/articles";
import {
  buildStructuredAddress,
  normalizeWhitespace,
  type LabCityTypeValue,
  type LabVillageTypeValue,
} from "@/lib/lab-address";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type EventPayload = {
  labId?: string;
  isGlobal?: boolean;
  title?: string;
  description?: string;
  locationName?: string;
  addressDetail?: string;
  provinceId?: string;
  provinceName?: string;
  cityId?: string;
  cityName?: string;
  cityType?: LabCityTypeValue;
  districtId?: string;
  districtName?: string;
  villageId?: string;
  villageName?: string;
  villageType?: LabVillageTypeValue;
  latitude?: number;
  longitude?: number;
  startDate?: string;
  endDate?: string;
  timeLabel?: string;
  isPublished?: boolean;
  relatedArticleId?: string;
};

function parsePublishedFlag(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function parseGlobalFlag(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function parseCityType(value: unknown): LabCityTypeValue | null {
  return value === "KABUPATEN" || value === "KOTA" ? value : null;
}

function parseVillageType(value: unknown): LabVillageTypeValue | null {
  return value === "KELURAHAN" || value === "DESA" ? value : null;
}

function parseCoordinate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getEventErrorStatus(message: string) {
  if (message === "Artikel terkait tidak ditemukan.") {
    return 404;
  }

  if (
    message.startsWith("Artikel terkait") ||
    message.startsWith("Agenda global hanya")
  ) {
    return 400;
  }

  return 500;
}

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "ID agenda tidak valid." }, { status: 400 });
  }

  const event = await prisma.labEvent.findUnique({
    where: { id },
    include: {
      lab: {
        select: {
          id: true,
          name: true,
        },
      },
      relatedArticle: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });

  if (!event) {
    return NextResponse.json(
      { error: "Agenda kegiatan tidak ditemukan." },
      { status: 404 }
    );
  }

  return NextResponse.json(event);
}

export async function PUT(req: Request, context: RouteContext) {
  const session = await getCurrentClerkSession();
  const { id } = await context.params;

  if (!session.userId) {
    return NextResponse.json(
      { error: "Unauthorized. Silakan login terlebih dahulu." },
      { status: 401 }
    );
  }

  if (!session.canAccessDashboard) {
    return NextResponse.json(
      { error: "Forbidden. Akun ini tidak memiliki akses dashboard." },
      { status: 403 }
    );
  }

  if (!id) {
    return NextResponse.json({ error: "ID agenda tidak valid." }, { status: 400 });
  }

  try {
    const existing = await prisma.labEvent.findUnique({
      where: { id },
      select: {
        id: true,
        labId: true,
        isGlobal: true,
        relatedArticleId: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Agenda kegiatan tidak ditemukan." },
        { status: 404 }
      );
    }

    if (session.isLabAdmin && (existing.isGlobal || session.labId !== existing.labId)) {
      return NextResponse.json(
        { error: "Forbidden. Akun ini hanya bisa mengelola agenda lab miliknya." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as EventPayload;
    const requestedLabId = normalizeText(body.labId);
    const isGlobal = session.isAdmin
      ? parseGlobalFlag(body.isGlobal, existing.isGlobal)
      : false;
    const labId = isGlobal
      ? ""
      : session.isAdmin
        ? requestedLabId || existing.labId || ""
        : existing.labId || "";
    const title = normalizeText(body.title);
    const description = normalizeOptionalText(body.description);
    const locationName = normalizeOptionalText(body.locationName);
    const addressDetail = normalizeWhitespace(String(body.addressDetail ?? ""));
    const provinceId = normalizeOptionalText(body.provinceId);
    const provinceName = normalizeOptionalText(body.provinceName);
    const cityId = normalizeOptionalText(body.cityId);
    const cityName = normalizeOptionalText(body.cityName);
    const cityType = parseCityType(body.cityType);
    const districtId = normalizeOptionalText(body.districtId);
    const districtName = normalizeOptionalText(body.districtName);
    const villageId = normalizeOptionalText(body.villageId);
    const villageName = normalizeOptionalText(body.villageName);
    const villageType = parseVillageType(body.villageType);
    const latitude = parseCoordinate(body.latitude);
    const longitude = parseCoordinate(body.longitude);
    const timeLabel = normalizeOptionalText(body.timeLabel);
    const relatedArticleId = normalizeOptionalText(body.relatedArticleId);
    const startDateKey = normalizeDateKeyInput(body.startDate);
    const endDateKey =
      normalizeDateKeyInput(body.endDate) ?? normalizeDateKeyInput(body.startDate);
    const isPublished = parsePublishedFlag(body.isPublished, true);
    const locationAddress = buildStructuredAddress({
      addressDetail,
      provinceName,
      cityName,
      cityType,
      districtName,
      villageName,
      villageType,
    });

    if (!title) {
      return NextResponse.json(
        { error: "Judul kegiatan wajib diisi." },
        { status: 400 }
      );
    }

    if (!locationName || !addressDetail) {
      return NextResponse.json(
        { error: "Nama lokasi dan detail alamat event wajib diisi." },
        { status: 400 }
      );
    }

    if (!provinceId || !provinceName || !cityId || !cityName || !districtId || !districtName) {
      return NextResponse.json(
        {
          error:
            "Pilih minimal provinsi, kabupaten/kota, dan kecamatan untuk lokasi event.",
        },
        { status: 400 }
      );
    }

    if (
      latitude === null ||
      longitude === null ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return NextResponse.json(
        { error: "Koordinat lokasi event wajib diisi dan harus valid." },
        { status: 400 }
      );
    }

    if (!startDateKey || !endDateKey) {
      return NextResponse.json(
        { error: "Tanggal mulai dan selesai wajib diisi." },
        { status: 400 }
      );
    }

    if (endDateKey < startDateKey) {
      return NextResponse.json(
        { error: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai." },
        { status: 400 }
      );
    }

    if (!isGlobal && !labId) {
      return NextResponse.json(
        { error: "Laboratorium tujuan wajib dipilih." },
        { status: 400 }
      );
    }

    const [lab, startDate, endDate, relatedArticle] = await Promise.all([
      isGlobal
        ? Promise.resolve(null)
        : prisma.lab.findUnique({
            where: { id: labId },
            select: { id: true },
          }),
      Promise.resolve(dateKeyToUtcDate(startDateKey)),
      Promise.resolve(dateKeyToUtcDate(endDateKey)),
      resolveRelatedArticleForEvent({
        articleId: relatedArticleId,
        eventLabId: isGlobal ? null : labId,
        isGlobalEvent: isGlobal,
        viewerLabId: session.labId,
        isAdmin: session.isAdmin,
      }),
    ]);

    if (!isGlobal && !lab) {
      return NextResponse.json(
        { error: "Laboratorium tidak ditemukan." },
        { status: 404 }
      );
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Format tanggal tidak valid." },
        { status: 400 }
      );
    }

    const updated = await prisma.labEvent.update({
      where: { id },
      data: {
        labId: isGlobal ? null : labId,
        isGlobal,
        title,
        description,
        locationName,
        locationAddress,
        addressDetail,
        provinceId,
        provinceName,
        cityId,
        cityName,
        cityType,
        districtId,
        districtName,
        villageId,
        villageName,
        villageType,
        latitude,
        longitude,
        relatedArticleId: relatedArticle?.id ?? null,
        startDate,
        endDate,
        timeLabel,
        isPublished,
      },
      include: {
        lab: {
          select: {
            id: true,
            name: true,
          },
        },
        relatedArticle: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/events/[id] error:", error);

    const message =
      error instanceof Error ? error.message : "Gagal memperbarui agenda.";

    return NextResponse.json({ error: message }, { status: getEventErrorStatus(message) });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getCurrentClerkSession();
  const { id } = await context.params;

  if (!session.userId) {
    return NextResponse.json(
      { error: "Unauthorized. Silakan login terlebih dahulu." },
      { status: 401 }
    );
  }

  if (!session.canAccessDashboard) {
    return NextResponse.json(
      { error: "Forbidden. Akun ini tidak memiliki akses dashboard." },
      { status: 403 }
    );
  }

  if (!id) {
    return NextResponse.json({ error: "ID agenda tidak valid." }, { status: 400 });
  }

  const existing = await prisma.labEvent.findUnique({
    where: { id },
    select: {
      id: true,
      labId: true,
      isGlobal: true,
      title: true,
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Agenda kegiatan tidak ditemukan." },
      { status: 404 }
    );
  }

  if (session.isLabAdmin && (existing.isGlobal || session.labId !== existing.labId)) {
    return NextResponse.json(
      { error: "Forbidden. Akun ini hanya bisa mengelola agenda lab miliknya." },
      { status: 403 }
    );
  }

  try {
    await prisma.labEvent.delete({
      where: { id },
    });

    return NextResponse.json({
      ok: true,
      deletedId: existing.id,
    });
  } catch (error) {
    console.error("DELETE /api/events/[id] error:", error);

    const message =
      error instanceof Error ? error.message : "Gagal menghapus agenda.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
