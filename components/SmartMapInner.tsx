// components/SmartMapInner.tsx
"use client";

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { useMemo, useState } from "react";
import Image from "next/image";
import "leaflet/dist/leaflet.css";

export type LabTypeDTO = {
  id: string;
  name: string;
};

export type LabWithTypes = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  labPhotoUrl: string;
  head1Name: string | null;
  head1PhotoUrl: string | null;
  head2Name: string | null;
  head2PhotoUrl: string | null;
  types: LabTypeDTO[];
  phone: string | null;
  websiteUrl: string | null;
};

export type SmartMapInnerProps = {
  labs: LabWithTypes[];
};

// helper: FILE_ID Drive atau URL -> URL thumbnail
function resolvePhotoUrl(value: string | null): string {
  if (!value) return "";
  const v = value.trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://drive.google.com/thumbnail?id=${v}&sz=w400`;
}

// helper: normalisasi URL website
function normalizeWebsiteUrl(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

// marker bulat merah dengan foto lab
function createLabIcon(photoValue: string, selected: boolean) {
  const photoUrl = resolvePhotoUrl(photoValue);
  const style = photoUrl ? `background-image:url('${photoUrl}')` : "";

  return L.divIcon({
    className: "",
    html: `
      <div class="lab-pin ${selected ? "lab-pin-selected" : ""}">
        <div class="lab-pin-photo" style="${style}"></div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

const typeColor: Record<string, string> = {
  BLUD: "bg-sky-100 text-sky-800",
  LABKESMAS: "bg-emerald-100 text-emerald-800",
};

const getTypeClass = (name: string) =>
  typeColor[name.toUpperCase()] ?? "bg-slate-100 text-slate-800";

export default function SmartMapInner({ labs }: SmartMapInnerProps) {
  const [selectedLab, setSelectedLab] = useState<LabWithTypes | null>(null);

  const center = useMemo(() => {
    const defaultCenter = { lat: -6.0, lng: 107 }; // fokus Jabar / DKI / Banten
    if (labs.length === 0) return defaultCenter;

    const avgLat = labs.reduce((sum, l) => sum + l.latitude, 0) / labs.length;
    const avgLng = labs.reduce((sum, l) => sum + l.longitude, 0) / labs.length;

    return { lat: avgLat, lng: avgLng };
  }, [labs]);

  return (
    // relative supaya panel bawah bisa absolute di dalam jendela
    <div className="relative flex h-full w-full">
      {/* MAP */}
      <div className="flex-1">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={9}
          minZoom={7}
          maxZoom={18}
          scrollWheelZoom
          className="h-full w-full"
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> kontributor'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {labs.map((lab) => (
            <Marker
              key={lab.id}
              position={[lab.latitude, lab.longitude]}
              icon={createLabIcon(lab.labPhotoUrl, selectedLab?.id === lab.id)}
              eventHandlers={{
                click: () => setSelectedLab(lab),
                popupclose: () =>
                  setSelectedLab((prev) => (prev?.id === lab.id ? null : prev)),
              }}
            >
              <Popup>
                <div className="space-y-2">
                  <div className="flex gap-3 items-start">
                    <Image
                      src={resolvePhotoUrl(lab.labPhotoUrl)}
                      alt={lab.name}
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="text-sm leading-snug">
                      <div className="font-semibold mb-1 text-slate-900">
                        {lab.name}
                      </div>
                      <div className="text-xs text-slate-700">
                        {lab.address}
                      </div>
                      {lab.phone && (
                        <div className="mt-1 text-[11px] text-slate-600">
                          Tel: {lab.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* chips tipe */}
                  <div className="flex flex-wrap gap-1">
                    {lab.types.map((t) => (
                      <span
                        key={t.id}
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${getTypeClass(
                          t.name
                        )}`}
                      >
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* PANEL DETAIL – DESKTOP / LAYAR LEBAR (samping) */}
      {selectedLab && (
        <div className="hidden lg:block w-full max-w-md border-l border-slate-800 bg-slate-50/95 backdrop-blur px-4 py-4 overflow-y-auto relative">
          <button
            type="button"
            onClick={() => setSelectedLab(null)}
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 text-xs hover:bg-slate-100 hover:text-slate-700 shadow-sm"
            aria-label="Tutup panel detail"
          >
            ✕
          </button>

          <div className="panel-slide-in space-y-5 pt-4 pr-1">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Detail laboratorium
              </p>
              <h2 className="text-sm font-semibold text-slate-900">
                {selectedLab.name}
              </h2>
              <p className="text-xs text-slate-600 leading-snug">
                {selectedLab.address}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selectedLab.types.map((t) => (
                <span
                  key={t.id}
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getTypeClass(
                    t.name
                  )}`}
                >
                  {t.name}
                </span>
              ))}
            </div>

            {(selectedLab.phone || selectedLab.websiteUrl) && (
              <section className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Kontak instansi
                </p>
                {selectedLab.phone && (
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">Telepon: </span>
                    <a
                      href={`tel:${selectedLab.phone.replace(/\s+/g, "")}`}
                      className="underline decoration-dotted underline-offset-2"
                    >
                      {selectedLab.phone}
                    </a>
                  </p>
                )}
                {selectedLab.websiteUrl && (
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">Website: </span>
                    <a
                      href={normalizeWebsiteUrl(selectedLab.websiteUrl) ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-800 hover:underline underline-offset-2"
                    >
                      <span className="truncate max-w-[180px]">
                        {selectedLab.websiteUrl}
                      </span>
                      <span aria-hidden>↗</span>
                    </a>
                  </p>
                )}
              </section>
            )}

            <section className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Foto Laboratorium
              </p>
              <div className="relative w-full overflow-hidden rounded-lg bg-slate-200 aspect-video">
                <Image
                  src={resolvePhotoUrl(selectedLab.labPhotoUrl)}
                  alt={selectedLab.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Struktur utama
              </p>
              <div className="mt-1 flex flex-wrap items-stretch justify-center gap-4">
                {selectedLab.head1Name && (
                  <div className="flex w-40 flex-col items-center gap-1.5 text-center">
                    {selectedLab.head1PhotoUrl && (
                      <div className="relative h-24 w-24 overflow-hidden rounded-full border border-slate-200 shadow-sm">
                        <Image
                          src={resolvePhotoUrl(selectedLab.head1PhotoUrl)}
                          alt={selectedLab.head1Name ?? "Kepala Laboratorium"}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    )}
                    <span className="mt-1 text-[13px] font-semibold text-slate-900">
                      {selectedLab.head1Name}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                      Kepala Laboratorium
                    </span>
                  </div>
                )}

                {selectedLab.head2Name && (
                  <div className="flex w-40 flex-col items-center gap-1.5 text-center">
                    {selectedLab.head2PhotoUrl && (
                      <div className="relative h-24 w-24 overflow-hidden rounded-full border border-slate-200 shadow-sm">
                        <Image
                          src={resolvePhotoUrl(selectedLab.head2PhotoUrl)}
                          alt={selectedLab.head2Name ?? "Kepala Sub Bagian TU"}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    )}
                    <span className="mt-1 text-[13px] font-semibold text-slate-900">
                      {selectedLab.head2Name}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
                      Kepala Sub Bagian TU
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* PANEL DETAIL – MOBILE & TABLET (bawah), tampil di < lg */}
      {selectedLab && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center lg:hidden">
          <div className="w-full px-2 pb-2">
            <div className="mx-auto max-w-xl rounded-2xl border border-slate-300 bg-slate-50/95 shadow-xl panel-slide-in">
              {/* handle + close */}
              <div className="relative flex items-center justify-center border-b border-slate-200 px-4 py-2">
                <div className="h-1.5 w-10 rounded-full bg-slate-300" />
                <button
                  type="button"
                  onClick={() => setSelectedLab(null)}
                  className="absolute right-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-white text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Tutup detail laboratorium"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-[45vh] overflow-y-auto px-4 py-3 space-y-3">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Detail laboratorium
                  </p>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {selectedLab.name}
                  </h2>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    {selectedLab.address}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {selectedLab.types.map((t) => (
                    <span
                      key={t.id}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getTypeClass(
                        t.name
                      )}`}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>

                {(selectedLab.phone || selectedLab.websiteUrl) && (
                  <section className="rounded-lg border border-slate-200 bg-white/90 p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Kontak instansi
                    </p>
                    {selectedLab.phone && (
                      <p className="text-[11px] text-slate-700">
                        <span className="font-medium">Telepon: </span>
                        <a
                          href={`tel:${selectedLab.phone.replace(
                            /\s+/g,
                            ""
                          )}`}
                          className="underline decoration-dotted underline-offset-2"
                        >
                          {selectedLab.phone}
                        </a>
                      </p>
                    )}
                    {selectedLab.websiteUrl && (
                      <p className="text-[11px] text-slate-700">
                        <span className="font-medium">Website: </span>
                        <a
                          href={
                            normalizeWebsiteUrl(selectedLab.websiteUrl) ?? "#"
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sky-700 hover:text-sky-800 hover:underline underline-offset-2"
                        >
                          <span className="truncate max-w-40">
                            {selectedLab.websiteUrl}
                          </span>
                          <span aria-hidden>↗</span>
                        </a>
                      </p>
                    )}
                  </section>
                )}

                <section className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Foto Laboratorium
                  </p>
                  <div className="relative w-full overflow-hidden rounded-lg bg-slate-200 aspect-video">
                    <Image
                      src={resolvePhotoUrl(selectedLab.labPhotoUrl)}
                      alt={selectedLab.name}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
