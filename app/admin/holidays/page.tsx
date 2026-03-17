import AdminHeader from "@/components/admin/AdminHeader";
import AdminHolidaysManager, {
  type AdminHolidayRow,
} from "@/components/admin/AdminHolidaysManager";
import AdminSectionIntro from "@/components/admin/AdminSectionIntro";
import { formatDateKey } from "@/lib/activity-calendar";
import { requireAdminPageAccess } from "@/lib/clerk-auth";
import { prisma } from "@/lib/prisma";

export default async function AdminHolidaysPage() {
  const session = await requireAdminPageAccess();

  const holidays = await prisma.masterHoliday.findMany({
    orderBy: [{ date: "asc" }, { name: "asc" }],
  });

  const rows: AdminHolidayRow[] = holidays.map((holiday) => ({
    id: holiday.id,
    date: formatDateKey(holiday.date),
    name: holiday.name,
    type: holiday.type,
    source: holiday.source,
    isActive: holiday.isActive,
  }));

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <AdminHeader isAdmin={session.isAdmin} labName={session.labName} />

        <AdminSectionIntro
          eyebrow="Kalender Kerja"
          title="Kalender Hari Libur"
          description="Libur nasional dan cuti bersama dikelola terpusat agar kalender publik dan admin selalu konsisten."
        />

        <AdminHolidaysManager holidays={rows} />
      </div>
    </main>
  );
}
