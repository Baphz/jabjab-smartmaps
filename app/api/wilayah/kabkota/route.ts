import { NextRequest, NextResponse } from "next/server";
import { fetchRegencyOptions } from "@/lib/wilayah-indonesia";

export async function GET(req: NextRequest) {
  try {
    const provinceId = (req.nextUrl.searchParams.get("provinceId") ?? "").trim();
    const search = (req.nextUrl.searchParams.get("search") ?? "").trim();

    if (!provinceId) {
      return NextResponse.json(
        { success: false, message: "provinceId wajib diisi." },
        { status: 400 }
      );
    }

    const data = await fetchRegencyOptions(provinceId, search);

    return NextResponse.json({
      success: true,
      data: data.map((item) => ({
        id: item.id,
        nama: item.name,
        tipe: item.cityType,
        namaTampil: item.displayName,
      })),
    });
  } catch (error) {
    console.error("GET /api/wilayah/kabkota error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data kabupaten/kota." },
      { status: 500 }
    );
  }
}
