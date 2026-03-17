import { NextRequest, NextResponse } from "next/server";
import { fetchDistrictOptions } from "@/lib/wilayah-indonesia";

export async function GET(req: NextRequest) {
  try {
    const kabKotaId = (req.nextUrl.searchParams.get("kabKotaId") ?? "").trim();
    const search = (req.nextUrl.searchParams.get("search") ?? "").trim();

    if (!kabKotaId) {
      return NextResponse.json(
        { success: false, message: "kabKotaId wajib diisi." },
        { status: 400 }
      );
    }

    const data = await fetchDistrictOptions(kabKotaId, search);

    return NextResponse.json({
      success: true,
      data: data.map((item) => ({
        id: item.id,
        nama: item.displayName,
      })),
    });
  } catch (error) {
    console.error("GET /api/wilayah/kecamatan error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data kecamatan." },
      { status: 500 }
    );
  }
}
