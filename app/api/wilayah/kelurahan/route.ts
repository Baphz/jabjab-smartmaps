import { NextRequest, NextResponse } from "next/server";
import { fetchVillageOptions } from "@/lib/wilayah-indonesia";

export async function GET(req: NextRequest) {
  try {
    const kecamatanId = (req.nextUrl.searchParams.get("kecamatanId") ?? "").trim();
    const search = (req.nextUrl.searchParams.get("search") ?? "").trim();

    if (!kecamatanId) {
      return NextResponse.json(
        { success: false, message: "kecamatanId wajib diisi." },
        { status: 400 }
      );
    }

    const data = await fetchVillageOptions(kecamatanId, search);

    return NextResponse.json({
      success: true,
      data: data.map((item) => ({
        id: item.id,
        nama: item.displayName,
      })),
    });
  } catch (error) {
    console.error("GET /api/wilayah/kelurahan error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data kelurahan." },
      { status: 500 }
    );
  }
}
