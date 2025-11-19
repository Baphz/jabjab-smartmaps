// components/admin/AdminLabsTable.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";

export type AdminLabRow = {
  id: string;
  name: string;
  address: string;
  types: { id: string; name: string }[];
};

type NotifState =
  | {
      type: "success" | "error";
      title: string;
      message: string;
    }
  | null;

type Props = {
  labs: AdminLabRow[];
};

export default function AdminLabsTable({ labs }: Props) {
  const router = useRouter();

  const [deleteTarget, setDeleteTarget] = useState<AdminLabRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notif, setNotif] = useState<NotifState>(null);

  const handleAskDelete = (lab: AdminLabRow) => {
    setDeleteTarget(lab);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/labs/${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        let msg = "Gagal menghapus data laboratorium.";

        try {
          const data: unknown = await res.json();
          if (
            data &&
            typeof data === "object" &&
            "error" in data &&
            typeof (data as { error: unknown }).error === "string"
          ) {
            msg = (data as { error: string }).error;
          }
        } catch {
          // abaikan error parse
        }

        setNotif({
          type: "error",
          title: "Gagal menghapus",
          message: msg,
        });
        setIsDeleting(false);
        return;
      }

      setNotif({
        type: "success",
        title: "Data terhapus",
        message: `Laboratorium "${deleteTarget.name}" berhasil dihapus.`,
      });
      setIsDeleting(false);
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      console.error("delete lab error:", err);
      setNotif({
        type: "error",
        title: "Gagal menghapus",
        message: "Terjadi kesalahan tak terduga saat menghapus data.",
      });
      setIsDeleting(false);
    }
  };

  const handleCloseNotif = () => {
    setNotif(null);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs text-slate-200">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-3 py-2">Nama</th>
              <th className="px-3 py-2">Alamat</th>
              <th className="px-3 py-2 w-40">Tipe</th>
              <th className="px-3 py-2 w-28 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {labs.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-[11px] text-slate-500"
                >
                  Belum ada data laboratorium.
                </td>
              </tr>
            ) : (
              labs.map((lab) => (
                <tr
                  key={lab.id}
                  className="border-b border-slate-800/60 bg-slate-900/40 hover:bg-slate-900/80"
                >
                  <td className="px-3 py-2 align-top text-[13px] font-medium">
                    {lab.name}
                  </td>
                  <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                    {lab.address}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {lab.types.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {lab.types.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200"
                          >
                            {t.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] italic text-slate-500">
                        Belum diset
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/admin/${lab.id}/edit`}
                        className="rounded-md border border-slate-700 bg-slate-900/80 px-2.5 py-1 text-[11px] text-slate-100 hover:bg-slate-800"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleAskDelete(lab)}
                        className="rounded-md border border-red-500/60 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-200 hover:bg-red-500/20"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal konfirmasi hapus */}
      <Modal
        open={deleteTarget !== null}
        onClose={() => (!isDeleting ? setDeleteTarget(null) : null)}
        title="Hapus laboratorium?"
      >
        <p className="text-[11px] text-slate-300">
          Yakin ingin menghapus data laboratorium{" "}
          <span className="font-semibold text-slate-100">
            {deleteTarget?.name}
          </span>
          ? Tindakan ini tidak dapat dibatalkan.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => setDeleteTarget(null)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleConfirmDelete}
            className="rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-red-500 disabled:opacity-60"
          >
            {isDeleting ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </Modal>

      {/* Modal notif sukses / error */}
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
            type="button"
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
