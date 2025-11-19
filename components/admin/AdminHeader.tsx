// components/admin/AdminHeader.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Modal } from "@/components/ui/modal";

export default function AdminHeader() {
  const [openLogout, setOpenLogout] = useState(false);

  const handleConfirmLogout = async () => {
    await signOut({
      callbackUrl: "/login",
      redirect: true,
    });
  };

  return (
    <>
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-50">
            Dashboard Admin – Data Laboratorium
          </h1>
          <p className="text-[11px] text-slate-400">
            Kelola daftar Laboratorium Kesehatan daerah.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
          >
            ← Kembali ke Peta
          </Link>

          <Link
            href="/admin/new"
            className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            + Tambah Data
          </Link>

          <button
            type="button"
            onClick={() => setOpenLogout(true)}
            className="inline-flex items-center rounded-md border border-red-500/60 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/20"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Modal konfirmasi logout */}
      <Modal
        open={openLogout}
        onClose={() => setOpenLogout(false)}
        title="Keluar dari Dashboard?"
      >
        <p className="text-[11px] text-slate-300">
          Anda yakin ingin keluar ?
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpenLogout(false)}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-slate-200 hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirmLogout}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500"
          >
            Keluar
          </button>
        </div>
      </Modal>
    </>
  );
}
