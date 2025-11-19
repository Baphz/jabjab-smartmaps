// app/login/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  // ✅ kalau sudah login, jangan bisa lihat login lagi
  if (session) {
    redirect("/admin"); // atau "/dashboard"
  }

  // ❌ belum login → tampilkan form login client-side
  return <LoginForm />;
}
