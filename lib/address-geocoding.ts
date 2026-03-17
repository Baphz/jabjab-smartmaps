import "server-only";

import {
  formatCityName,
  formatDistrictName,
  formatProvinceName,
  formatVillageName,
  normalizeWhitespace,
  type LabCityTypeValue,
  type LabVillageTypeValue,
} from "./lab-address";

type StructuredLocationInput = {
  addressDetail?: string | null;
  provinceName?: string | null;
  cityName?: string | null;
  cityType?: LabCityTypeValue | null;
  districtName?: string | null;
  villageName?: string | null;
  villageType?: LabVillageTypeValue | null;
};

export type GeocodeAddressResult = {
  latitude: number;
  longitude: number;
  displayName: string;
  query: string;
};

type CachedGeocodeResult = {
  expiresAt: number;
  result: GeocodeAddressResult | null;
};

type NominatimSearchItem = {
  lat?: string;
  lon?: string;
  display_name?: string;
};

const DEFAULT_GEOCODING_SEARCH_URL = "https://nominatim.openstreetmap.org/search";
const DEFAULT_GEOCODING_USER_AGENT = "smart-maps-labkesda/1.0";
const GEOCODING_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

const geocodeCache = new Map<string, CachedGeocodeResult>();
let nextGeocodeAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForGeocodeSlot() {
  const now = Date.now();
  const delay = Math.max(0, nextGeocodeAt - now);
  nextGeocodeAt = now + delay + 1100;

  if (delay > 0) {
    await sleep(delay);
  }
}

function buildVillageLabel(
  villageName: string | null | undefined,
  villageType: LabVillageTypeValue | null | undefined
) {
  const displayName = formatVillageName(villageName);
  if (!displayName) return "";

  if (villageType === "DESA") {
    return `Desa ${displayName}`;
  }

  if (villageType === "KELURAHAN") {
    return `Kelurahan ${displayName}`;
  }

  return displayName;
}

export function hasEnoughStructuredLocation(args: StructuredLocationInput) {
  const addressDetail = normalizeWhitespace(String(args.addressDetail ?? ""));

  return Boolean(
    formatProvinceName(args.provinceName) &&
      formatCityName(args.cityName, args.cityType) &&
      formatDistrictName(args.districtName) &&
      (buildVillageLabel(args.villageName, args.villageType) || addressDetail.length >= 6)
  );
}

export function buildGeocodeQueryCandidates(args: StructuredLocationInput) {
  const addressDetail = normalizeWhitespace(String(args.addressDetail ?? ""));
  const provinceName = formatProvinceName(args.provinceName);
  const cityName = formatCityName(args.cityName, args.cityType);
  const districtName = formatDistrictName(args.districtName)
    ? `Kecamatan ${formatDistrictName(args.districtName)}`
    : "";
  const villageName = buildVillageLabel(args.villageName, args.villageType);

  const candidates = [
    [addressDetail, villageName, districtName, cityName, provinceName, "Indonesia"],
    [villageName, districtName, cityName, provinceName, "Indonesia"],
    [districtName, cityName, provinceName, "Indonesia"],
  ]
    .map((parts) =>
      normalizeWhitespace(
        parts
          .filter(Boolean)
          .join(", ")
          .replace(/\s+,/g, ",")
      )
    )
    .filter(Boolean);

  return Array.from(new Set(candidates));
}

function getCachedResult(cacheKey: string) {
  const cached = geocodeCache.get(cacheKey);

  if (!cached) {
    return null;
  }

  if (cached.expiresAt < Date.now()) {
    geocodeCache.delete(cacheKey);
    return null;
  }

  return cached.result;
}

function setCachedResult(cacheKey: string, result: GeocodeAddressResult | null) {
  geocodeCache.set(cacheKey, {
    expiresAt: Date.now() + GEOCODING_CACHE_TTL_MS,
    result,
  });
}

async function requestGeocode(query: string) {
  const url = new URL(
    process.env.GEOCODING_SEARCH_URL?.trim() || DEFAULT_GEOCODING_SEARCH_URL
  );
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "id");
  url.searchParams.set("accept-language", "id");

  await waitForGeocodeSlot();

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent":
        process.env.GEOCODING_USER_AGENT?.trim() || DEFAULT_GEOCODING_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding gagal dengan status ${response.status}.`);
  }

  const payload = (await response.json()) as NominatimSearchItem[];
  const item = Array.isArray(payload) ? payload[0] : null;

  if (!item?.lat || !item?.lon) {
    return null;
  }

  const latitude = Number.parseFloat(item.lat);
  const longitude = Number.parseFloat(item.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
    displayName: normalizeWhitespace(item.display_name ?? query),
    query,
  } satisfies GeocodeAddressResult;
}

export async function geocodeStructuredLocation(args: StructuredLocationInput) {
  if (!hasEnoughStructuredLocation(args)) {
    return null;
  }

  const candidates = buildGeocodeQueryCandidates(args);

  for (const query of candidates) {
    const cacheKey = query.toLowerCase();
    const cached = getCachedResult(cacheKey);

    if (cached !== null) {
      return cached;
    }

    const result = await requestGeocode(query);
    setCachedResult(cacheKey, result);

    if (result) {
      return result;
    }
  }

  return null;
}
