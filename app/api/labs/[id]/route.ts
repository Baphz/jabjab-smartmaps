// app/api/labs/[id]/route.ts
import { NextResponse } from "next/server";
import { requireAdminApiAccess, requireLabWriteApiAccess } from "@/lib/clerk-auth";
import {
  buildLabAddress,
  normalizeWhitespace,
  type LabCityTypeValue,
  type LabVillageTypeValue,
} from "@/lib/lab-address";
import {
  cleanupUnusedLabStorageFiles,
  collectLabStorageObjectPaths,
} from "@/lib/lab-storage-cleanup";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type LabPayload = {
  name: string;
  address: string;
  addressDetail: string | null;
  provinceId: string | null;
  provinceName: string | null;
  cityId: string | null;
  cityName: string | null;
  cityType: LabCityTypeValue | null;
  districtId: string | null;
  districtName: string | null;
  villageId: string | null;
  villageName: string | null;
  villageType: LabVillageTypeValue | null;
  latitude: number;
  longitude: number;
  labPhotoUrl: string;
  head1Name: string | null;
  head1PhotoUrl: string | null;
  head2Name: string | null;
  head2PhotoUrl: string | null;
  types: string[];
  phone: string | null;
  websiteUrl: string | null;
};

// GET /api/labs/[id] - ambil 1 lab
export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: "ID laboratorium tidak valid" },
      { status: 400 }
    );
  }

  const lab = await prisma.lab.findUnique({
    where: { id },
    include: { types: true },
  });

  if (!lab) {
    return NextResponse.json(
      { error: "Laboratorium tidak ditemukan" },
      { status: 404 }
    );
  }

  return NextResponse.json(lab);
}

// PUT /api/labs/[id] - update
export async function PUT(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const authError = await requireLabWriteApiAccess(id);

  if (authError) {
    return authError;
  }

  if (!id) {
    return NextResponse.json(
      { error: "ID laboratorium tidak valid" },
      { status: 400 }
    );
  }

  try {
    const body = (await req.json()) as LabPayload;
    const address = buildLabAddress({
      addressDetail: body.addressDetail,
      provinceName: body.provinceName,
      cityName: body.cityName,
      cityType: body.cityType,
      districtName: body.districtName,
      villageName: body.villageName,
      villageType: body.villageType,
      fallbackAddress: body.address,
    });
    const existing = await prisma.lab.findUnique({
      where: { id },
      select: {
        id: true,
        labPhotoUrl: true,
        head1PhotoUrl: true,
        head2PhotoUrl: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Laboratorium tidak ditemukan" },
        { status: 404 }
      );
    }

    const updatedBase = await prisma.lab.update({
      where: { id },
      data: {
        name: normalizeWhitespace(body.name),
        address,
        addressDetail: body.addressDetail,
        provinceId: body.provinceId,
        provinceName: body.provinceName,
        cityId: body.cityId,
        cityName: body.cityName,
        cityType: body.cityType,
        districtId: body.districtId,
        districtName: body.districtName,
        villageId: body.villageId,
        villageName: body.villageName,
        villageType: body.villageType,
        latitude: body.latitude,
        longitude: body.longitude,
        labPhotoUrl: body.labPhotoUrl,
        head1Name: body.head1Name,
        head1PhotoUrl: body.head1PhotoUrl,
        head2Name: body.head2Name,
        head2PhotoUrl: body.head2PhotoUrl,
        phone: body.phone,
        websiteUrl: body.websiteUrl,
      },
    });

    const typeNames: string[] = Array.isArray(body.types) ? body.types : [];

    const types = await Promise.all(
      typeNames.map((name) =>
        prisma.labType.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    );

    const updated = await prisma.lab.update({
      where: { id: updatedBase.id },
      data: {
        types: {
          set: [],
          connect: types.map((t) => ({ id: t.id })),
        },
      },
      include: { types: true },
    });

    const previousFileIds = collectLabStorageObjectPaths([
      existing.labPhotoUrl,
      existing.head1PhotoUrl,
      existing.head2PhotoUrl,
    ]);
    const currentFileIds = collectLabStorageObjectPaths([
      body.labPhotoUrl,
      body.head1PhotoUrl,
      body.head2PhotoUrl,
    ]);

    await cleanupUnusedLabStorageFiles(
      previousFileIds.filter((fileId) => !currentFileIds.includes(fileId))
    );

    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("PUT /api/labs/[id] error:", err);

    const detail =
      err instanceof Error ? err.message : "Terjadi kesalahan tidak diketahui";

    return NextResponse.json(
      { error: "Gagal memperbarui laboratorium", detail },
      { status: 500 }
    );
  }
}

// DELETE /api/labs/[id] - hapus
export async function DELETE(_req: Request, context: RouteContext) {
  const authError = await requireAdminApiAccess();

  if (authError) {
    return authError;
  }

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: "ID laboratorium tidak valid" },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.lab.findUnique({
      where: { id },
      select: {
        id: true,
        labPhotoUrl: true,
        head1PhotoUrl: true,
        head2PhotoUrl: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Laboratorium tidak ditemukan" },
        { status: 404 }
      );
    }

    // kosongkan relasi types dulu (kalau ada)
    try {
      await prisma.lab.update({
        where: { id },
        data: {
          types: {
            set: [],
          },
        },
      });
    } catch (relErr: unknown) {
      // kalau model ga punya field `types`, cukup log, jangan matiin DELETE
      console.warn("Gagal clear relasi types sebelum delete:", relErr);
    }

    await prisma.lab.delete({
      where: { id },
    });

    await cleanupUnusedLabStorageFiles(
      collectLabStorageObjectPaths([
        existing.labPhotoUrl,
        existing.head1PhotoUrl,
        existing.head2PhotoUrl,
      ])
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE /api/labs/[id] error:", err);

    const detail =
      err instanceof Error ? err.message : "Terjadi kesalahan tidak diketahui";

    return NextResponse.json(
      { error: "Gagal menghapus laboratorium", detail },
      { status: 500 }
    );
  }
}
