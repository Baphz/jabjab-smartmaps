// components/admin/LabForm.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo, FormEvent } from "react";
import { Modal } from "@/components/ui/modal";

export type LabTypeChip = {
  id: string;
  name: string;
};

export type LabFormInitial = {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  labPhotoUrl: string;
  head1Name: string | null;
  head1PhotoUrl: string | null;
  head2Name: string | null;
  head2PhotoUrl: string | null;
  phone: string | null;
  websiteUrl: string | null;
  types: LabTypeChip[];
};

type LabFormProps = {
  initialData?: LabFormInitial;
};

type NotifState =
  | {
      type: "success" | "error";
      title: string;
      message: string;
    }
  | null;

export default function LabForm({ initialData }: LabFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initialData?.id);

  // state untuk manajemen chip types (BLUD, LABKESMAS, dll)
  const [typeInput, setTypeInput] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    initialData?.types.map((t) => t.name) ?? []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // state untuk modal notif (sukses / error)
  const [notif, setNotif] = useState<NotifState>(null);

  const title = useMemo(
    () => (isEdit ? "Edit Laboratorium" : "Tambah Laboratorium"),
    [isEdit]
  );

  const handleAddType = () => {
    const value = typeInput.trim();
    if (!value) return;
    if (selectedTypes.includes(value)) {
      setTypeInput("");
      return;
    }
    setSelectedTypes((prev) => [...prev, value]);
    setTypeInput("");
  };

  const handleRemoveType = (name: string) => {
    setSelectedTypes((prev) => prev.filter((t) => t !== name));
  };

  const openError = (title: string, message: string) => {
    setNotif({
      type: "error",
      title,
      message,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData(event.currentTarget);

      const latitudeStr = String(formData.get("latitude") ?? "").trim();
      const longitudeStr = String(formData.get("longitude") ?? "").trim();

      const latitude = Number.parseFloat(latitudeStr);
      const longitude = Number.parseFloat(longitudeStr);

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        openError(
          "Data tidak valid",
          "Latitude dan longitude harus berupa angka yang valid."
        );
        setIsSubmitting(false);
        return;
      }

      const body = {
        name: String(formData.get("name") ?? "").trim(),
        address: String(formData.get("address") ?? "").trim(),
        latitude,
        longitude,
        labPhotoUrl: String(formData.get("labPhotoUrl") ?? "").trim(),
        head1Name: (() => {
          const v = formData.get("head1Name");
          return v ? String(v).trim() || null : null;
        })(),
        head1PhotoUrl: (() => {
          const v = formData.get("head1PhotoUrl");
          return v ? String(v).trim() || null : null;
        })(),
        head2Name: (() => {
          const v = formData.get("head2Name");
          return v ? String(v).trim() || null : null;
        })(),
        head2PhotoUrl: (() => {
          const v = formData.get("head2PhotoUrl");
          return v ? String(v).trim() || null : null;
        })(),
        phone: (() => {
          const v = formData.get("phone");
          return v ? String(v).trim() || null : null;
        })(),
        websiteUrl: (() => {
          const v = formData.get("websiteUrl");
          return v ? String(v).trim() || null : null;
        })(),
        types: selectedTypes, // array nama tipe (["BLUD", "LABKESMAS", ...])
      };

      if (!body.name || !body.address) {
        openError(
          "Data belum lengkap",
          "Nama laboratorium dan alamat wajib diisi."
        );
        setIsSubmitting(false);
        return;
      }

      const endpoint = isEdit
        ? `/api/labs/${encodeURIComponent(String(initialData?.id))}`
        : "/api/labs";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let message = "Gagal menyimpan data laboratorium.";

        try {
          const data: unknown = await res.json();
          if (
            data &&
            typeof data === "object" &&
            "error" in data &&
            typeof (data as { error: unknown }).error === "string"
          ) {
            message = (data as { error: string }).error;
          }
        } catch {
          // abaikan error parse JSON
        }

        openError("Gagal menyimpan", message);
        setIsSubmitting(false);
        return;
      }

      // sukses → tampilkan modal sukses, redirect ke /admin setelah user klik OK
      setNotif({
        type: "success",
        title: isEdit ? "Perubahan disimpan" : "Laboratorium ditambahkan",
        message: "Data laboratorium berhasil disimpan.",
      });
      setIsSubmitting(false);
    } catch (err: unknown) {
      const detail =
        err instanceof Error ? err.message : "Terjadi kesalahan tidak diketahui";
      console.error("LabForm submit error:", err);

      openError("Gagal menyimpan", `Terjadi kesalahan: ${detail}`);
      setIsSubmitting(false);
    }
  };

  const handleCloseNotif = () => {
    if (notif?.type === "success") {
      // setelah sukses, kembali ke daftar admin
      setNotif(null);
      router.push("/admin");
      router.refresh();
    } else {
      setNotif(null);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-slate-50"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-sm font-semibold">{title}</h1>
            <p className="text-[11px] text-slate-400">
              Isi data dasar, kontak, dan lokasi laboratorium.
            </p>
          </div>
        </div>

        {/* GRID UTAMA */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Kolom kiri: info umum & kontak */}
          <div className="space-y-4">
            <section className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Informasi umum
              </p>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-200">
                  Nama Laboratorium
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={initialData?.name ?? ""}
                  required
                  className="w-full rounded-md border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-200">
                  Alamat
                </label>
                <textarea
                  name="address"
                  defaultValue={initialData?.address ?? ""}
                  required
                  rows={3}
                  className="w-full rounded-md border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </section>

            <section className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Kontak instansi
              </p>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-200">
                  Nomor Telepon
                </label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={initialData?.phone ?? ""}
                  placeholder="mis. (022) 1234567 / 0812xxxxxxx"
                  className="w-full rounded-md border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-200">
                  Website Resmi
                </label>
                <input
                  type="url"
                  name="websiteUrl"
                  defaultValue={initialData?.websiteUrl ?? ""}
                  placeholder="mis. labkesda.jabarprov.go.id"
                  className="w-full rounded-md border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </section>
          </div>

          {/* Kolom kanan: foto & koordinat */}
          <div className="space-y-4">
            <section className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Foto & pimpinan
              </p>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-200">
                  Kode Foto Laboratorium (Google Drive thumbnail ID / URL)
                </label>
                <input
                  type="text"
                  name="labPhotoUrl"
                  defaultValue={initialData?.labPhotoUrl ?? ""}
                  placeholder="mis. 1PWxeE1axIWMnoB_..."
                  className="w-full rounded-md border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-300">
                    Nama Kepala Lab
                  </label>
                  <input
                    type="text"
                    name="head1Name"
                    defaultValue={initialData?.head1Name ?? ""}
                    className="w-full rounded-md border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <input
                    type="text"
                    name="head1PhotoUrl"
                    defaultValue={initialData?.head1PhotoUrl ?? ""}
                    placeholder="ID / URL Foto Kepala Lab"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-[13px] text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-300">
                    Nama Kepala Sub Bagian TU
                  </label>
                  <input
                    type="text"
                    name="head2Name"
                    defaultValue={initialData?.head2Name ?? ""}
                    className="w-full rounded-md border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                  <input
                    type="text"
                    name="head2PhotoUrl"
                    defaultValue={initialData?.head2PhotoUrl ?? ""}
                    placeholder="ID / URL Foto Kepala Sub Bag TU"
                    className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-[13px] text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Koordinat peta
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-200">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    name="latitude"
                    defaultValue={initialData?.latitude ?? ""}
                    required
                    className="w-full rounded-md border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-200">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    name="longitude"
                    defaultValue={initialData?.longitude ?? ""}
                    required
                    className="w-full rounded-md border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Types / chips */}
        <section className="space-y-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Tipe laboratorium
          </p>

          <div className="flex flex-wrap gap-2">
            {selectedTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleRemoveType(t)}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100/90 px-2.5 py-0.5 text-[11px] font-medium text-slate-800 hover:bg-slate-200"
              >
                {t}
                <span className="text-[10px]">✕</span>
              </button>
            ))}
            {selectedTypes.length === 0 && (
              <p className="text-[11px] text-slate-500">
                Belum ada tipe. Tambahkan misalnya: BLUD, LABKESMAS, RS, SWASTA.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={typeInput}
              onChange={(e) => setTypeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddType();
                }
              }}
              placeholder="Ketik lalu Enter (mis. BLUD)"
              className="flex-1 rounded-md border border-slate-600 bg-slate-950/60 px-2 py-1.5 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <button
              type="button"
              onClick={handleAddType}
              className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
            >
              Tambah
            </button>
          </div>
        </section>

        {/* Tombol submit */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {isSubmitting
              ? isEdit
                ? "Menyimpan..."
                : "Membuat..."
              : isEdit
              ? "Simpan Perubahan"
              : "Simpan Laboratorium"}
          </button>
        </div>
      </form>

      {/* Modal notif (sukses / error) */}
      <Modal
        open={notif !== null}
        onClose={handleCloseNotif}
        title={notif?.title}
      >
        <p
          className={`text-[11px] ${
            notif?.type === "error" ? "text-red-200" : "text-emerald-200"
          }`}
        >
          {notif?.message}
        </p>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleCloseNotif}
            className={`rounded-md px-3 py-1.5 text-[11px] font-semibold text-white ${
              notif?.type === "error"
                ? "bg-red-600 hover:bg-red-500"
                : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            OK
          </button>
        </div>
      </Modal>
    </>
  );
}
