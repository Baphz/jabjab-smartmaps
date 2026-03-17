import { Alert } from "antd";
import AdminEventsManager, {
  type AdminEventRow,
} from "@/components/admin/AdminEventsManager";
import AdminHeader from "@/components/admin/AdminHeader";
import { formatDateKey } from "@/lib/activity-calendar";
import { requireDashboardPageAccess } from "@/lib/clerk-auth";
import { prisma } from "@/lib/prisma";

export default async function AdminEventsPage() {
  const session = await requireDashboardPageAccess();

  const eventFilter = session.isAdmin
    ? undefined
    : session.labId
      ? {
          OR: [{ labId: session.labId }, { isGlobal: true }],
        }
      : {
          isGlobal: true,
        };

  const [labs, events] = await Promise.all([
    prisma.lab.findMany({
      where:
        session.isAdmin || !session.labId
          ? undefined
          : {
              id: session.labId,
            },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.labEvent.findMany({
          where: eventFilter,
          include: {
            lab: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: [{ startDate: "asc" }, { title: "asc" }],
        }),
  ]);

  const eventRows: AdminEventRow[] = events.map((event) => ({
    id: event.id,
    labId: event.lab?.id ?? null,
    labName: event.isGlobal ? "Agenda Global DPW" : event.lab?.name ?? null,
    isGlobal: event.isGlobal,
    title: event.title,
    description: event.description,
    locationName: event.locationName,
    locationAddress: event.locationAddress,
    addressDetail: event.addressDetail,
    provinceId: event.provinceId,
    provinceName: event.provinceName,
    cityId: event.cityId,
    cityName: event.cityName,
    cityType: event.cityType,
    districtId: event.districtId,
    districtName: event.districtName,
    villageId: event.villageId,
    villageName: event.villageName,
    villageType: event.villageType,
    latitude: event.latitude,
    longitude: event.longitude,
    startDate: formatDateKey(event.startDate),
    endDate: formatDateKey(event.endDate),
    timeLabel: event.timeLabel,
    isPublished: event.isPublished,
    createdAt: event.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <AdminHeader isAdmin={session.isAdmin} labName={session.labName} />

        {session.isLabAdmin && !session.labId ? (
          <Alert
            type="warning"
            showIcon
            title="Akun Labkesda belum ditautkan ke laboratorium"
            description="Agenda tidak bisa dikelola sampai super admin memperbaiki metadata akun ini."
          />
        ) : null}
        <AdminEventsManager
          labs={labs.map((lab) => ({
            value: lab.id,
            label: lab.name,
          }))}
          events={eventRows}
          canManageAllLabs={session.isAdmin}
          fixedLabId={session.isLabAdmin ? session.labId : null}
          fixedLabLabel={session.isLabAdmin ? session.labName : null}
        />
      </div>
    </main>
  );
}
