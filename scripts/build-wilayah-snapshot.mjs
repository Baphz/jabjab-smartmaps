import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = "https://emsifa.github.io/api-wilayah-indonesia/api";
const TARGET_PROVINCE_IDS = new Set(["31", "32", "36"]);
const FETCH_TIMEOUT_MS = 15000;
const REGENCY_CONCURRENCY = 8;
const DISTRICT_CONCURRENCY = 16;

async function fetchJson(pathname) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil ${pathname}: ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [];
}

function toRow(item, extra = {}) {
  return {
    ...extra,
    id: String(item.id),
    name: String(item.name),
  };
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );

  return results;
}

async function main() {
  const provinces = (await fetchJson("/provinces.json"))
    .filter((item) => TARGET_PROVINCE_IDS.has(String(item.id)))
    .map((item) => toRow(item))
    .sort((left, right) => left.name.localeCompare(right.name, "id"));

  const regencies = [];
  const districts = [];
  const villages = [];

  const provinceRegenciesGroups = await mapWithConcurrency(
    provinces,
    REGENCY_CONCURRENCY,
    async (province) =>
      (await fetchJson(`/regencies/${province.id}.json`))
        .map((item) => toRow(item, { provinceId: province.id }))
        .sort((left, right) => left.name.localeCompare(right.name, "id"))
  );

  for (const provinceRegencies of provinceRegenciesGroups) {
    regencies.push(...provinceRegencies);
  }

  const regencyDistrictGroups = await mapWithConcurrency(
    regencies,
    REGENCY_CONCURRENCY,
    async (regency) =>
      (await fetchJson(`/districts/${regency.id}.json`))
        .map((item) => toRow(item, { regencyId: regency.id }))
        .sort((left, right) => left.name.localeCompare(right.name, "id"))
  );

  for (const regencyDistricts of regencyDistrictGroups) {
    districts.push(...regencyDistricts);
  }

  const districtVillageGroups = await mapWithConcurrency(
    districts,
    DISTRICT_CONCURRENCY,
    async (district) =>
      (await fetchJson(`/villages/${district.id}.json`))
        .map((item) => toRow(item, { districtId: district.id }))
        .sort((left, right) => left.name.localeCompare(right.name, "id"))
  );

  for (const districtVillages of districtVillageGroups) {
    villages.push(...districtVillages);
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    source: BASE_URL,
    provinces,
    regencies,
    districts,
    villages,
  };

  const cwd = path.dirname(fileURLToPath(import.meta.url));
  const outputPath = path.resolve(cwd, "../data/wilayah-snapshot.json");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  console.log(
    `Wilayah snapshot tersimpan: ${provinces.length} provinsi, ${regencies.length} kab/kota, ${districts.length} kecamatan, ${villages.length} kelurahan/desa`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
