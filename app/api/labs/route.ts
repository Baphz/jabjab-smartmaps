// app/api/labs/route.ts
import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/clerk-auth";
import { buildLabAddress, normalizeWhitespace, type LabCityTypeValue, type LabVillageTypeValue } from "@/lib/lab-address";
import { prisma } from "@/lib/prisma";

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
  types: string[]; // daftar nama tipe lab
  phone: string | null;
  websiteUrl: string | null;
};

// GET /api/labs -> list semua lab
export async function GET() {
  const labs = await prisma.lab.findMany({
    include: { types: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(labs);
}

// POST /api/labs -> buat lab baru
export async function POST(req: Request) {
  const authError = await requireAdminApiAccess();

  if (authError) {
    return authError;
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

    // Validasi sederhana
    if (!body.name || !address) {
      return NextResponse.json(
        { error: "Nama dan alamat wajib diisi" },
        { status: 400 }
      );
    }

    if (
      body.latitude === undefined ||
      body.longitude === undefined ||
      Number.isNaN(body.latitude) ||
      Number.isNaN(body.longitude)
    ) {
      return NextResponse.json(
        { error: "Latitude dan longitude wajib berupa angka" },
        { status: 400 }
      );
    }

    // 1) Buat lab tanpa types dulu
    const createdLab = await prisma.lab.create({
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

    // 2) Upsert LabType dari daftar nama
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

    // 3) Update lab untuk connect ke types
    const labWithTypes = await prisma.lab.update({
      where: { id: createdLab.id },
      data: {
        types: {
          connect: types.map((t) => ({ id: t.id })),
        },
      },
      include: { types: true },
    });
    return NextResponse.json(labWithTypes, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/labs error:", err);

    const detail =
      err instanceof Error ? err.message : "Terjadi kesalahan tidak diketahui";

    return NextResponse.json(
      { error: "Gagal membuat laboratorium", detail },
      { status: 500 }
    );
  }
}
