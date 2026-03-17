import { NextResponse } from "next/server";
import { getCurrentClerkSession } from "@/lib/clerk-auth";
import {
  geocodeStructuredLocation,
  hasEnoughStructuredLocation,
} from "@/lib/address-geocoding";
import { normalizeWhitespace, type LabCityTypeValue, type LabVillageTypeValue } from "@/lib/lab-address";

type GeocodePayload = {
  addressDetail?: string;
  provinceName?: string;
  cityName?: string;
  cityType?: LabCityTypeValue;
  districtName?: string;
  villageName?: string;
  villageType?: LabVillageTypeValue;
};

export async function POST(req: Request) {
  const session = await getCurrentClerkSession();

  if (!session.userId) {
    return NextResponse.json(
      { success: false, message: "Unauthorized. Silakan login terlebih dahulu." },
      { status: 401 }
    );
  }

  if (!session.canAccessDashboard) {
    return NextResponse.json(
      { success: false, message: "Forbidden. Akun ini tidak memiliki akses dashboard." },
      { status: 403 }
    );
  }

  try {
    const body = (await req.json()) as GeocodePayload;
    const payload = {
      addressDetail: normalizeWhitespace(String(body.addressDetail ?? "")),
      provinceName: normalizeWhitespace(String(body.provinceName ?? "")),
      cityName: normalizeWhitespace(String(body.cityName ?? "")),
      cityType: body.cityType ?? null,
      districtName: normalizeWhitespace(String(body.districtName ?? "")),
      villageName: normalizeWhitespace(String(body.villageName ?? "")),
      villageType: body.villageType ?? null,
    };

    if (!hasEnoughStructuredLocation(payload)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Pilih minimal provinsi, kabupaten/kota, kecamatan, lalu isi kelurahan/desa atau detail alamat.",
        },
        { status: 400 }
      );
    }

    const result = await geocodeStructuredLocation(payload);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: "Lokasi belum ditemukan. Geser titik peta secara manual bila perlu.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("POST /api/geocode/address error:", error);

    const detail =
      error instanceof Error ? error.message : "Terjadi kesalahan tidak diketahui.";

    return NextResponse.json(
      {
        success: false,
        message: `Gagal mencocokkan alamat ke peta. ${detail}`,
      },
      { status: 500 }
    );
  }
}
