// app/api/labs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type LabPayload = {
  name: string;
  address: string;
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
  try {
    const body = (await req.json()) as LabPayload;

    // Validasi sederhana
    if (!body.name || !body.address) {
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
        name: body.name,
        address: body.address,
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
