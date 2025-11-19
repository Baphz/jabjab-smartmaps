// components/admin/ModalPageLayout.tsx
"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface ModalPageLayoutProps {
  title: string;
  children: ReactNode;
  backHref: string;
}

export function ModalPageLayout({
  title,
  children,
  backHref,
}: ModalPageLayoutProps) {
  return (
    <main className="min-h-screen bg-slate-950/90 text-slate-50">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="relative w-full max-w-5xl rounded-2xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h1 className="text-sm font-semibold text-slate-50">{title}</h1>
              <p className="text-[11px] text-slate-400">
                Smart Maps Labkesda – Admin
              </p>
            </div>

            <Link
              href={backHref}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-800"
            >
              ✕ Tutup
            </Link>
          </div>

          {/* konten form / isi halaman */}
          <div className="max-h-[75vh] overflow-y-auto pr-1">{children}</div>
        </div>
      </div>
    </main>
  );
}
