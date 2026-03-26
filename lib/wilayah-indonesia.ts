import {
  buildLabAddress,
  formatCityName,
  formatDistrictName,
  formatProvinceName,
  formatVillageName,
  normalizeSearchValue,
  normalizeWhitespace,
  toDisplayCase,
  type LabCityTypeValue,
  type LabVillageTypeValue,
} from "./lab-address.ts";
import wilayahSnapshot from "../data/wilayah-snapshot.json";

type WilayahFetchItem = Record<string, string>;

export type ProvinceOption = {
  id: string;
  name: string;
  displayName: string;
};

export type RegencyOption = {
  id: string;
  provinceId: string;
  name: string;
  cityType: LabCityTypeValue;
  displayName: string;
};

export type DistrictOption = {
  id: string;
  regencyId: string;
  name: string;
  displayName: string;
};

export type VillageOption = {
  id: string;
  districtId: string;
  name: string;
  displayName: string;
};

type DistrictWithHierarchy = DistrictOption & {
  provinceId: string;
  regencyName: string;
  regencyType: LabCityTypeValue;
};

type VillageOverrideSeed = {
  id: string;
  name: string;
};

type WilayahSnapshotRow = {
  id: string;
  name: string;
};

type WilayahSnapshotRelationRow = WilayahSnapshotRow & {
  provinceId?: string;
  regencyId?: string;
  districtId?: string;
};

type WilayahSnapshot = {
  generatedAt: string;
  source: string;
  provinces: WilayahSnapshotRow[];
  regencies: Array<WilayahSnapshotRow & { provinceId: string }>;
  districts: Array<WilayahSnapshotRow & { regencyId: string }>;
  villages: Array<WilayahSnapshotRow & { districtId: string }>;
};

export type ResolvedLabRegion = {
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
  address: string;
};

const WILAYAH_BASE_URL =
  "https://emsifa.github.io/api-wilayah-indonesia/api";

const wilayahCache = new Map<string, Promise<WilayahFetchItem[]>>();
const localWilayahSnapshot = wilayahSnapshot as WilayahSnapshot;
const localProvinceIds = new Set(
  localWilayahSnapshot.provinces.map((item) => String(item.id))
);
const localRegencyIds = new Set(
  localWilayahSnapshot.regencies.map((item) => String(item.id))
);
const localDistrictIds = new Set(
  localWilayahSnapshot.districts.map((item) => String(item.id))
);
const localRegenciesByProvinceId = new Map<string, WilayahFetchItem[]>();
const localDistrictsByRegencyId = new Map<string, WilayahFetchItem[]>();
const localVillagesByDistrictId = new Map<string, WilayahFetchItem[]>();

// Upstream wilayah reference is occasionally missing newer villages.
// Keep targeted local corrections here so dependent APIs and geocoding
// still return complete results without changing route behavior.
const VILLAGE_OVERRIDES_BY_DISTRICT_ID: Record<string, VillageOverrideSeed[]> = {
  // Kecamatan Cimanggis, Kota Depok.
  // Upstream list currently misses Curug and Tugu.
  "3276040": [
    { id: "local-3276040-curug", name: "CURUG" },
    { id: "local-3276040-tugu", name: "TUGU" },
  ],
};

for (const row of localWilayahSnapshot.regencies) {
  const provinceId = String(row.provinceId);
  const current = localRegenciesByProvinceId.get(provinceId) ?? [];
  current.push({
    id: String(row.id),
    province_id: provinceId,
    name: String(row.name),
  });
  localRegenciesByProvinceId.set(provinceId, current);
}

for (const row of localWilayahSnapshot.districts) {
  const regencyId = String(row.regencyId);
  const current = localDistrictsByRegencyId.get(regencyId) ?? [];
  current.push({
    id: String(row.id),
    regency_id: regencyId,
    name: String(row.name),
  });
  localDistrictsByRegencyId.set(regencyId, current);
}

for (const row of localWilayahSnapshot.villages) {
  const districtId = String(row.districtId);
  const current = localVillagesByDistrictId.get(districtId) ?? [];
  current.push({
    id: String(row.id),
    district_id: districtId,
    name: String(row.name),
  });
  localVillagesByDistrictId.set(districtId, current);
}

function cloneWilayahRows<T extends WilayahFetchItem | WilayahSnapshotRelationRow>(
  rows: T[]
) {
  return rows.map((item) => ({ ...item }));
}

function getLocalWilayahList(path: string): WilayahFetchItem[] | null {
  if (path === "/provinces.json") {
    return cloneWilayahRows(
      localWilayahSnapshot.provinces.map((item) => ({
        id: String(item.id),
        name: String(item.name),
      }))
    );
  }

  const regencyMatch = path.match(/^\/regencies\/([^/]+)\.json$/);
  if (regencyMatch) {
    const provinceId = regencyMatch[1];
    if (localProvinceIds.has(provinceId)) {
      return cloneWilayahRows(localRegenciesByProvinceId.get(provinceId) ?? []);
    }
    return null;
  }

  const districtMatch = path.match(/^\/districts\/([^/]+)\.json$/);
  if (districtMatch) {
    const regencyId = districtMatch[1];
    if (localRegencyIds.has(regencyId)) {
      return cloneWilayahRows(localDistrictsByRegencyId.get(regencyId) ?? []);
    }
    return null;
  }

  const villageMatch = path.match(/^\/villages\/([^/]+)\.json$/);
  if (villageMatch) {
    const districtId = villageMatch[1];
    if (localDistrictIds.has(districtId)) {
      return cloneWilayahRows(localVillagesByDistrictId.get(districtId) ?? []);
    }
    return null;
  }

  return null;
}

function normalizeComparable(value: string) {
  return normalizeSearchValue(value)
    .replace(/\bprovinsi\b/g, "")
    .replace(/\bkabupatan\b/g, "kabupaten")
    .replace(/\bkabupaten\b/g, "")
    .replace(/\bkab\b/g, "")
    .replace(/\bkota\b/g, "")
    .replace(/\bkecamatan\b/g, "")
    .replace(/\bkec\b/g, "")
    .replace(/\bkelurahan\b/g, "")
    .replace(/\bkel\b/g, "")
    .replace(/\bdesa\b/g, "")
    .replace(/\bds\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchWilayahList(path: string) {
  const localRows = getLocalWilayahList(path);
  if (localRows) {
    return localRows;
  }

  const cacheKey = `${WILAYAH_BASE_URL}${path}`;
  let pending = wilayahCache.get(cacheKey);

  if (!pending) {
    pending = fetch(cacheKey, {
      cache: "force-cache",
      headers: {
        Accept: "application/json",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Gagal mengambil referensi wilayah: ${path}`);
        }

        const payload = (await response.json()) as unknown;
        return Array.isArray(payload) ? (payload as WilayahFetchItem[]) : [];
      })
      .catch((error) => {
        wilayahCache.delete(cacheKey);
        throw error;
      });
    wilayahCache.set(cacheKey, pending);
  }

  return pending;
}

function inferCityTypeFromName(name: string): LabCityTypeValue {
  return name.toUpperCase().startsWith("KOTA ") ? "KOTA" : "KABUPATEN";
}

function applyVillageOverrides(districtId: string, rows: VillageOption[]) {
  const overrides = VILLAGE_OVERRIDES_BY_DISTRICT_ID[districtId];
  if (!overrides || overrides.length === 0) {
    return rows;
  }

  const existingComparableNames = new Set(
    rows.map((item) => normalizeComparable(item.name))
  );
  const merged = [...rows];

  for (const override of overrides) {
    const comparableName = normalizeComparable(override.name);
    if (existingComparableNames.has(comparableName)) {
      continue;
    }

    merged.push({
      id: override.id,
      districtId,
      name: override.name,
      displayName: formatVillageName(override.name),
    });
    existingComparableNames.add(comparableName);
  }

  return merged.sort((left, right) =>
    left.displayName.localeCompare(right.displayName, "id")
  );
}

function extractAddressToken(
  address: string,
  pattern: RegExp
): string | null {
  const match = address.match(pattern);
  const value = match?.[1]?.trim();
  return value ? normalizeWhitespace(value) : null;
}

function extractVillageType(address: string): LabVillageTypeValue | null {
  if (/\bdesa\b/i.test(address) || /\bds\.?\b/i.test(address)) {
    return "DESA";
  }

  if (/\bkelurahan\b/i.test(address) || /\bkel\.?\b/i.test(address)) {
    return "KELURAHAN";
  }

  return null;
}

function buildMatchScore(text: string, optionName: string, candidate?: string | null) {
  const normalizedText = normalizeComparable(text);
  const optionComparable = normalizeComparable(optionName);
  const candidateComparable = normalizeComparable(candidate ?? "");

  let score = 0;

  if (candidateComparable) {
    if (candidateComparable === optionComparable) {
      score = Math.max(score, 120 + optionComparable.length);
    } else if (
      optionComparable.includes(candidateComparable) ||
      candidateComparable.includes(optionComparable)
    ) {
      score = Math.max(score, 90 + Math.min(optionComparable.length, candidateComparable.length));
    }
  }

  if (normalizedText.includes(optionComparable)) {
    score = Math.max(score, 70 + optionComparable.length);
  }

  return score;
}

function pickBestOption<T extends { name: string }>(
  text: string,
  options: T[],
  explicitCandidate?: string | null
) {
  let best: { item: T; score: number } | null = null;

  for (const item of options) {
    const score = buildMatchScore(text, item.name, explicitCandidate);
    if (!best || score > best.score) {
      best = { item, score };
    }
  }

  return best && best.score >= 70 ? best.item : null;
}

function cleanupAddressDetail(
  address: string,
  args: {
    provinceName?: string | null;
    cityName?: string | null;
    cityType?: LabCityTypeValue | null;
    districtName?: string | null;
    villageName?: string | null;
    villageType?: LabVillageTypeValue | null;
  }
) {
  const cityCore = args.cityName
    ? args.cityName.replace(/^Kabupaten\s+/i, "").replace(/^Kota\s+/i, "")
    : "";
  const comparableTokens = [
    args.provinceName,
    args.cityName,
    cityCore,
    args.districtName,
    args.villageName,
  ]
    .map((item) => normalizeComparable(String(item ?? "")))
    .filter(Boolean);

  const segments = normalizeWhitespace(address)
    .split(",")
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean)
    .filter((segment) => {
      const comparable = normalizeComparable(segment);
      if (!comparable) {
        return false;
      }

      return !comparableTokens.includes(comparable);
    });

  const cleaned = normalizeWhitespace(
    segments
      .join(", ")
      .replace(/\s+,/g, ",")
      .replace(/(?:,\s*){2,}/g, ", ")
      .replace(/^,\s*|\s*,\s*$/g, "")
  );

  return cleaned || null;
}

export async function fetchProvinceOptions(search = "") {
  const rows = await fetchWilayahList("/provinces.json");
  const normalizedSearch = normalizeSearchValue(search);

  return rows
    .map((item) => ({
      id: String(item.id),
      name: String(item.name),
      displayName: formatProvinceName(String(item.name)),
    }))
    .filter((item) =>
      normalizedSearch
        ? normalizeSearchValue(item.displayName).includes(normalizedSearch)
        : true
    )
    .slice(0, 20);
}

export async function fetchRegencyOptions(provinceId: string, search = "") {
  const rows = await fetchWilayahList(`/regencies/${provinceId}.json`);
  const normalizedSearch = normalizeSearchValue(search);

  return rows
    .map((item) => {
      const cityType = inferCityTypeFromName(String(item.name));
      return {
        id: String(item.id),
        provinceId: String(item.province_id),
        name: String(item.name),
        cityType,
        displayName: formatCityName(String(item.name), cityType),
      } satisfies RegencyOption;
    })
    .filter((item) =>
      normalizedSearch
        ? normalizeSearchValue(item.displayName).includes(normalizedSearch)
        : true
    )
    .slice(0, 50);
}

export async function fetchDistrictOptions(regencyId: string, search = "") {
  const rows = await fetchWilayahList(`/districts/${regencyId}.json`);
  const normalizedSearch = normalizeSearchValue(search);

  return rows
    .map((item) => ({
      id: String(item.id),
      regencyId,
      name: String(item.name),
      displayName: formatDistrictName(String(item.name)),
    }))
    .filter((item) =>
      normalizedSearch
        ? normalizeSearchValue(item.displayName).includes(normalizedSearch)
        : true
    )
    .slice(0, 50);
}

export async function fetchVillageOptions(districtId: string, search = "") {
  const rows = await fetchWilayahList(`/villages/${districtId}.json`);
  const normalizedSearch = normalizeSearchValue(search);

  return applyVillageOverrides(
    districtId,
    rows
      .map((item) => ({
        id: String(item.id),
        districtId,
        name: String(item.name),
        displayName: formatVillageName(String(item.name)),
      }))
  )
    .filter((item) =>
      normalizedSearch
        ? normalizeSearchValue(item.displayName).includes(normalizedSearch)
        : true
    )
    .slice(0, 50);
}

async function fetchAllRegencyOptions() {
  const provinces = await fetchProvinceOptions();
  const groups = await Promise.all(
    provinces.map((province) => fetchRegencyOptions(province.id))
  );
  return groups.flat();
}

async function fetchAllDistrictOptions(provinceId?: string | null) {
  const regencies = provinceId
    ? await fetchRegencyOptions(provinceId)
    : await fetchAllRegencyOptions();
  const groups = await Promise.all(
    regencies.map(async (regency) =>
      (await fetchDistrictOptions(regency.id)).map((district) => ({
        ...district,
        provinceId: regency.provinceId,
        regencyName: regency.name,
        regencyType: regency.cityType,
      }))
    )
  );
  return groups.flat() as DistrictWithHierarchy[];
}

async function inferRegionFromDistrict(
  text: string,
  explicitDistrict: string | null,
  provinceId?: string | null,
  regencyId?: string | null
) {
  if (!explicitDistrict) {
    return null;
  }

  const globalDistricts = async () =>
    fetchAllDistrictOptions(provinceId ?? null);

  if (regencyId) {
    const districts = await fetchDistrictOptions(regencyId);
    const district = pickBestOption(text, districts, explicitDistrict);

    if (district) {
      return {
        district,
        provinceId: provinceId ?? null,
        regencyId,
      } as const;
    }
  }

  const districts = await globalDistricts();
  const district = pickBestOption(text, districts, explicitDistrict);

  if (!district) {
    return null;
  }

  return {
    district,
    provinceId: district.provinceId,
    regencyId: district.regencyId,
  } as const;
}

export async function resolveLabRegionFromAddress(
  address: string,
  extraContext = ""
): Promise<ResolvedLabRegion> {
  const trimmedAddress = normalizeWhitespace(address);
  const trimmedContext = normalizeWhitespace(extraContext);
  const analysisText = normalizeWhitespace(
    [trimmedAddress, trimmedContext].filter(Boolean).join(", ")
  );

  const explicitProvince = extractAddressToken(
    analysisText,
    /\b(?:provinsi|prov\.?)\b\s+([^,]+)/i
  );
  const explicitCity = extractAddressToken(
    analysisText,
    /\b(?:kabupaten|kabupatan|kab\.?|kota)\b\s+([^,]+)/i
  );
  const explicitDistrict = extractAddressToken(
    analysisText,
    /\b(?:kecamatan|kec\.?)\b\s+([^,]+)/i
  );
  const explicitVillage = extractAddressToken(
    analysisText,
    /\b(?:kelurahan|kel\.?|desa|ds\.?)\b\s+([^,]+)/i
  );
  const villageType = extractVillageType(trimmedAddress);

  let province = pickBestOption(analysisText, await fetchProvinceOptions(), explicitProvince);
  let regencyOptions = province
    ? await fetchRegencyOptions(province.id)
    : await fetchAllRegencyOptions();
  let regency = pickBestOption(
    analysisText,
    explicitCity
      ? regencyOptions.filter((item) =>
          analysisText.toUpperCase().includes("KOTA")
            ? item.cityType === "KOTA"
            : analysisText.toUpperCase().includes("KAB")
            ? item.cityType === "KABUPATEN"
            : true
        )
      : regencyOptions,
    explicitCity
  );

  if (!province && regency) {
    province = (await fetchProvinceOptions()).find(
      (item) => item.id === regency?.provinceId
    ) ?? null;
    regencyOptions = await fetchRegencyOptions(province?.id ?? regency.provinceId);
  }

  let district: DistrictOption | null = null;
  const districtInference = await inferRegionFromDistrict(
    analysisText,
    explicitDistrict,
    province?.id ?? null,
    regency?.id ?? null
  );

  if (districtInference) {
    district = districtInference.district;

    if (!regency || regency.id !== districtInference.regencyId) {
      regency =
        regencyOptions.find((item) => item.id === districtInference.regencyId) ??
        (await fetchAllRegencyOptions()).find(
          (item) => item.id === districtInference.regencyId
        ) ??
        null;
    }

    if (!province || province.id !== districtInference.provinceId) {
      province =
        (await fetchProvinceOptions()).find(
          (item) => item.id === districtInference.provinceId
        ) ?? province;
      if (province) {
        regencyOptions = await fetchRegencyOptions(province.id);
      }
    }
  }

  let village: VillageOption | null = null;
  if (district) {
    village = pickBestOption(
      analysisText,
      await fetchVillageOptions(district.id),
      explicitVillage
    );
  }

  const provinceName = province ? formatProvinceName(province.name) : null;
  const cityName = regency
    ? formatCityName(regency.name, regency.cityType)
    : null;
  const districtName = district ? formatDistrictName(district.name) : null;
  const villageName = village ? formatVillageName(village.name) : explicitVillage ? toDisplayCase(explicitVillage) : null;
  const addressDetail = cleanupAddressDetail(trimmedAddress, {
    provinceName,
    cityName,
    cityType: regency?.cityType ?? null,
    districtName,
    villageName,
    villageType,
  });

  return {
    addressDetail,
    provinceId: province?.id ?? null,
    provinceName,
    cityId: regency?.id ?? null,
    cityName,
    cityType: regency?.cityType ?? null,
    districtId: district?.id ?? null,
    districtName,
    villageId: village?.id ?? null,
    villageName,
    villageType,
    address: buildLabAddress({
      addressDetail,
      provinceName,
      cityName,
      cityType: regency?.cityType ?? null,
      districtName,
      villageName,
      villageType,
      fallbackAddress: trimmedAddress,
    }),
  };
}
