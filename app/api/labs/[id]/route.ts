// app/api/labs/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
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

  if (!id) {
    return NextResponse.json(
      { error: "ID laboratorium tidak valid" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();

    const updatedBase = await prisma.lab.update({
      where: { id },
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
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      { error: "ID laboratorium tidak valid" },
      { status: 400 }
    );
  }

  try {
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
