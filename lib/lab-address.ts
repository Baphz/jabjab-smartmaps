export type LabCityTypeValue = "KABUPATEN" | "KOTA";
export type LabVillageTypeValue = "KELURAHAN" | "DESA";

type BuildStructuredAddressArgs = {
  addressDetail?: string | null;
  provinceName?: string | null;
  cityName?: string | null;
  cityType?: LabCityTypeValue | null;
  districtName?: string | null;
  villageName?: string | null;
  villageType?: LabVillageTypeValue | null;
  fallbackAddress?: string | null;
};

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function toDisplayCase(value: string | null | undefined) {
  const raw = normalizeWhitespace(String(value ?? ""));
  if (!raw) return "";

  return raw
    .split(" ")
    .map((part) => {
      const upper = part.toUpperCase();

      if (["DKI", "DI", "DIY", "NAD", "NTB", "NTT", "RI", "RW", "RT"].includes(upper)) {
        return upper;
      }

      if (/^[IVXLCDM]+$/.test(upper)) {
        return upper;
      }

      if (upper === "KAB.") {
        return "Kab.";
      }

      return upper.charAt(0) + upper.slice(1).toLowerCase();
    })
    .join(" ");
}

export function formatProvinceName(value: string | null | undefined) {
  return toDisplayCase(value);
}

export function formatCityName(
  value: string | null | undefined,
  type?: LabCityTypeValue | null
) {
  const raw = normalizeWhitespace(String(value ?? ""));
  if (!raw) return "";

  const upper = raw.toUpperCase();
  const cleaned = upper
    .replace(/^KABUPATEN\s+/, "")
    .replace(/^KAB\.\s+/, "")
    .replace(/^KOTA\s+/, "");
  const display = toDisplayCase(cleaned);

  if (type === "KABUPATEN") return `Kabupaten ${display}`;
  if (type === "KOTA") return `Kota ${display}`;

  if (upper.startsWith("KABUPATEN ") || upper.startsWith("KAB. ")) {
    return `Kabupaten ${display}`;
  }

  if (upper.startsWith("KOTA ")) {
    return `Kota ${display}`;
  }

  return display;
}

export function formatDistrictName(value: string | null | undefined) {
  return toDisplayCase(value);
}

export function formatVillageName(value: string | null | undefined) {
  return toDisplayCase(value);
}

export function formatVillageLabel(
  value: string | null | undefined,
  type?: LabVillageTypeValue | null
) {
  const display = formatVillageName(value);
  if (!display) return "";

  if (type === "DESA") return `Desa ${display}`;
  if (type === "KELURAHAN") return `Kelurahan ${display}`;
  return display;
}

export function buildAdministrativeAddressParts(args: {
  provinceName?: string | null;
  cityName?: string | null;
  cityType?: LabCityTypeValue | null;
  districtName?: string | null;
  villageName?: string | null;
  villageType?: LabVillageTypeValue | null;
}) {
  return [
    formatVillageLabel(args.villageName, args.villageType),
    args.districtName ? `Kecamatan ${formatDistrictName(args.districtName)}` : "",
    formatCityName(args.cityName, args.cityType),
    args.provinceName ? `Provinsi ${formatProvinceName(args.provinceName)}` : "",
  ].filter(Boolean);
}

export function buildStructuredAddress({
  addressDetail,
  provinceName,
  cityName,
  cityType,
  districtName,
  villageName,
  villageType,
  fallbackAddress,
}: BuildStructuredAddressArgs) {
  const parts = [
    normalizeWhitespace(String(addressDetail ?? "")),
    ...buildAdministrativeAddressParts({
      provinceName,
      cityName,
      cityType,
      districtName,
      villageName,
      villageType,
    }),
  ].filter(Boolean);

  const built = normalizeWhitespace(parts.join(", ").replace(/\s+,/g, ","));
  if (built) return built;
  return normalizeWhitespace(String(fallbackAddress ?? ""));
}

export function buildLabAddress(args: BuildStructuredAddressArgs) {
  return buildStructuredAddress(args);
}

export function normalizeSearchValue(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getProvinceSearchAliases(provinceName: string | null | undefined) {
  const normalized = normalizeSearchValue(String(provinceName ?? ""));

  if (!normalized) return [];
  if (normalized === "jawa barat") return ["jabar"];
  if (normalized === "dki jakarta") return ["dki", "jakarta"];
  if (normalized === "banten") return ["banten"];
  if (normalized === "di yogyakarta") return ["yogyakarta", "diy"];
  return [];
}

export function buildLabSearchText(args: {
  name: string;
  address: string;
  provinceName?: string | null;
  cityName?: string | null;
  cityType?: LabCityTypeValue | null;
  districtName?: string | null;
  villageName?: string | null;
}) {
  const cityDisplay = formatCityName(args.cityName, args.cityType);
  const provinceDisplay = formatProvinceName(args.provinceName);
  const districtDisplay = formatDistrictName(args.districtName);
  const villageDisplay = formatVillageName(args.villageName);

  return normalizeSearchValue(
    [
      args.name,
      args.address,
      provinceDisplay,
      cityDisplay,
      districtDisplay,
      villageDisplay,
      ...getProvinceSearchAliases(args.provinceName),
    ]
      .filter(Boolean)
      .join(" ")
  );
}

export function buildLabAreaLabels(args: {
  provinceName?: string | null;
  cityName?: string | null;
  cityType?: LabCityTypeValue | null;
  districtName?: string | null;
  villageName?: string | null;
  villageType?: LabVillageTypeValue | null;
}) {
  return [
    formatProvinceName(args.provinceName),
    formatCityName(args.cityName, args.cityType),
    args.districtName ? `Kecamatan ${formatDistrictName(args.districtName)}` : "",
    formatVillageLabel(args.villageName, args.villageType),
  ].filter(Boolean);
}
