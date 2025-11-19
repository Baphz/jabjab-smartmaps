// app/admin/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminLabsTable from "@/components/admin/AdminLabsTable";
import AdminHeader from "@/components/admin/AdminHeader";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login?from=/admin");
  }

  const labs = await prisma.lab.findMany({
    include: { types: true },
    orderBy: { createdAt: "desc" },
  });

  const labRows = labs.map((lab) => ({
    id: lab.id,
    name: lab.name,
    address: lab.address,
    types: lab.types.map((t) => ({
      id: t.id,
      name: t.name,
    })),
  }));

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        {/* Header + tombol + logout modal */}
        <AdminHeader />

        {/* Card tabel */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-100">
              Daftar Laboratorium
            </h2>
            <p className="text-[11px] text-slate-400">
              Total: {labs.length} laboratorium terdaftar
            </p>
          </div>

          <AdminLabsTable labs={labRows} />
        </section>
      </div>
    </main>
  );
}
