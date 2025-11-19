// app/page.tsx
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SmartMap from "@/components/SmartMap";

// ganti FILE_ID_LOGO dengan ID file Google Drive kamu
const LOGO_URL =
  "https://drive.google.com/thumbnail?id=1KtUkqQREVr_dQVhjYBdv35HgpUUMrAvS&sz=w200";

export default async function HomePage() {
  // ambil labs & session barengan
  const [labs, session] = await Promise.all([
    prisma.lab.findMany({
      include: { types: true },
      orderBy: { name: "asc" },
    }),
    getServerSession(authOptions),
  ]);

  const year = new Date().getFullYear();

  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
      {/* NAVBAR */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          {/* Kiri: logo + judul */}
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg border border-slate-300 bg-white">
              <Image
                src={LOGO_URL}
                alt="Logo Smart Maps Labkesda"
                fill
                sizes="32px"
                unoptimized
                className="object-contain"
              />
            </div>

            <div>
              <p className="text-sm font-semibold leading-tight">
                JabJaB SmartMaps
              </p>
              <p className="text-[11px] leading-tight text-slate-400">
                Peta Laboratorium Kesehatan Jawa Barat-DKI Jakarta-Banten
              </p>
            </div>
          </div>

          {/* Kanan: tombol login / dashboard */}
          <div className="flex items-center gap-2">
            {session ? (
              // ✅ sudah login → langsung ke halaman admin / dashboard
              <a
                href="/admin" // kalau route kamu pakai "/dashboard", ganti ini
                className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
              >
                Dashboard
              </a>
            ) : (
              // ❌ belum login → ke halaman login
              <a
                href="/login"
                className="rounded-md border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
              >
                Login Admin
              </a>
            )}
          </div>
        </div>
      </header>

      {/* KONTEN UTAMA */}
      <div className="flex-1 px-4 py-6 flex justify-center">
        <div className="w-full max-w-6xl rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden flex flex-col">
          {/* header kecil card */}
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <h1 className="text-sm font-semibold text-slate-50">
                Peta Laboratorium Kesehatan
              </h1>
              <p className="text-[11px] text-slate-400">
                Klik marker untuk melihat detail laboratorium.
              </p>
            </div>
          </div>

          {/* area map di dalam “jendela” */}
          <div className="flex-1 min-h-[420px] h-[70vh]">
            <SmartMap labs={labs} />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-900/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 text-[11px] text-slate-400">
          <p>
            © {year} ASLABKESDA DPW Jawa Barat-DKI Jakarta-Banten. Semua hak
            cipta.
          </p>
          <p className="hidden sm:block">
            Smart Maps • Data Laboratorium Kesehatan daerah Jawa Barat, DKI dan
            Banten
          </p>
        </div>
      </footer>
    </main>
  );
}
