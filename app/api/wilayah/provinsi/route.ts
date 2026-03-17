import { NextRequest, NextResponse } from "next/server";
import { fetchProvinceOptions } from "@/lib/wilayah-indonesia";

export async function GET(req: NextRequest) {
  try {
    const search = (req.nextUrl.searchParams.get("search") ?? "").trim();
    const data = await fetchProvinceOptions(search);

    return NextResponse.json({
      success: true,
      data: data.map((item) => ({
        id: item.id,
        nama: item.displayName,
      })),
    });
  } catch (error) {
    console.error("GET /api/wilayah/provinsi error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data provinsi." },
      { status: 500 }
    );
  }
}
