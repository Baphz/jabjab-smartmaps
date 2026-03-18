import { Tag } from "antd";
import {
  buildAdministrativeAddressParts,
  formatCityName,
  formatProvinceName,
  type LabCityTypeValue,
  type LabVillageTypeValue,
} from "@/lib/lab-address";

type ArticleOriginMetaProps = {
  isGlobal: boolean;
  labName?: string | null;
  provinceName?: string | null;
  cityName?: string | null;
  cityType?: LabCityTypeValue | null;
  districtName?: string | null;
  villageName?: string | null;
  villageType?: LabVillageTypeValue | null;
  mode?: "compact" | "full";
};

function buildCompactLocationParts({
  provinceName,
  cityName,
  cityType,
}: Pick<ArticleOriginMetaProps, "provinceName" | "cityName" | "cityType">) {
  return [
    formatCityName(cityName, cityType),
    provinceName ? `Provinsi ${formatProvinceName(provinceName)}` : "",
  ].filter(Boolean);
}

function buildFullLocationParts({
  provinceName,
  cityName,
  cityType,
  districtName,
  villageName,
  villageType,
}: Pick<
  ArticleOriginMetaProps,
  "provinceName" | "cityName" | "cityType" | "districtName" | "villageName" | "villageType"
>) {
  return buildAdministrativeAddressParts({
    provinceName,
    cityName,
    cityType,
    districtName,
    villageName,
    villageType,
  });
}

export default function ArticleOriginMeta({
  isGlobal,
  labName,
  provinceName,
  cityName,
  cityType,
  districtName,
  villageName,
  villageType,
  mode = "compact",
}: ArticleOriginMetaProps) {
  const locationParts = isGlobal
    ? []
    : mode === "full"
      ? buildFullLocationParts({
          provinceName,
          cityName,
          cityType,
          districtName,
          villageName,
          villageType,
        })
      : buildCompactLocationParts({
          provinceName,
          cityName,
          cityType,
        });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Tag color={isGlobal ? "blue" : "green"} variant="filled">
        {isGlobal ? "Global DPW" : labName ?? "Artikel Lab"}
      </Tag>

      {locationParts.map((part) => (
        <span
          key={part}
          className="inline-flex min-h-6 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-medium text-slate-600"
        >
          {part}
        </span>
      ))}
    </div>
  );
}
