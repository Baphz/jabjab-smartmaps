"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const LOGO_URL =
  "https://drive.google.com/thumbnail?id=1KtUkqQREVr_dQVhjYBdv35HgpUUMrAvS&sz=w200";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // dukung ?callbackUrl=... (dari NextAuth) & ?from=...
  const callbackUrl =
    searchParams.get("callbackUrl") ??
    searchParams.get("from") ??
    "/admin";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
        callbackUrl,
      });

      console.log("signIn result:", res);

      setLoading(false);

      if (!res) {
        setError("Terjadi kesalahan. Coba lagi.");
        return;
      }

      if (res.error) {
        // tampilkan pesan error asli untuk debug
        setError(`Login gagal: ${res.error}`);
        return;
      }

      // sukses
      if (res.url) {
        router.push(res.url);
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      console.error("signIn error:", err);
      setLoading(false);
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-50">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
        {/* Logo + heading */}
        <div className="mb-4 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-300 bg-white shadow-md">
            <div className="relative h-10 w-10">
              <Image
                src={LOGO_URL}
                alt="Logo Smart Maps Labkesda"
                fill
                sizes="40px"
                unoptimized
                className="object-contain"
              />
            </div>
          </div>

          <p className="text-[11px] font-semibold tracking-wide text-sky-400">
            JabJaB SmartMaps
          </p>
          <h1 className="mt-1 text-base font-semibold">
            Login Dashboard
          </h1>
          <p className="text-[11px] text-slate-400">
            Peta Laboratorium Kesehatan Jawa Barat-DKI Jakarta-Banten
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-200">
              Username
            </label>
            <input
              type="text"
              name="username"
              required
              className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="admin"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-200">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Masuk..." : "Masuk"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
          <span>© {new Date().getFullYear()}</span>
          <Link
            href="/"
            className="text-slate-300 underline decoration-dotted underline-offset-2 hover:text-slate-100"
          >
            ← Kembali ke peta
          </Link>
        </div>
      </div>
    </main>
  );
}
