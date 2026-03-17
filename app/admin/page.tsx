// app/admin/page.tsx
import { Alert, Card, Col, Row, Tag } from "antd";
import ActivityCalendar from "@/components/activity/ActivityCalendar";
import UpcomingActivityList from "@/components/activity/UpcomingActivityList";
import { prisma } from "@/lib/prisma";
import { formatDateKey } from "@/lib/activity-calendar";
import { getActivitySources } from "@/lib/activity-server";
import { requireDashboardPageAccess } from "@/lib/clerk-auth";
import AdminLabsTable from "@/components/admin/AdminLabsTable";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminSectionIntro from "@/components/admin/AdminSectionIntro";

function AdminMetricCard({
  label,
  value,
  tone = "slate",
  helper,
}: {
  label: string;
  value: number | string;
  tone?: "slate" | "green" | "amber" | "blue";
  helper?: string;
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50/85"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50/85"
        : tone === "blue"
          ? "border-sky-200 bg-sky-50/85"
          : "border-slate-200 bg-slate-50/85";

  return (
    <div className={`rounded-[20px] border px-4 py-3 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-[24px] font-semibold leading-none tracking-tight text-slate-950">
        {value}
      </div>
      {helper ? <div className="mt-1 text-[11px] text-slate-500">{helper}</div> : null}
    </div>
  );
}

function overlapsMonth(startDate: string, endDate: string, monthKey: string) {
  const monthStart = `${monthKey}-01`;
  const nextMonth =
    monthKey.slice(5) === "12"
      ? `${String(Number(monthKey.slice(0, 4)) + 1)}-01`
      : `${monthKey.slice(0, 4)}-${String(Number(monthKey.slice(5)) + 1).padStart(2, "0")}`;
  const monthEnd = new Date(`${nextMonth}-01T00:00:00.000Z`);
  monthEnd.setUTCDate(monthEnd.getUTCDate() - 1);
  const monthEndKey = formatDateKey(monthEnd);

  return startDate <= monthEndKey && endDate >= monthStart;
}

export default async function AdminDashboardPage() {
  const session = await requireDashboardPageAccess();

  const [labs, activity] = await Promise.all([
    session.isAdmin
      ? prisma.lab.findMany({
          include: { types: true },
          orderBy: { createdAt: "desc" },
        })
      : session.labId
      ? prisma.lab.findMany({
          where: { id: session.labId },
          include: { types: true },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    session.isLabAdmin && !session.labId
      ? Promise.resolve({
          events: [],
          holidays: [],
          sources: [],
        })
      : getActivitySources({
          labId: session.isAdmin ? undefined : session.labId,
        }),
  ]);

  const labRows = labs.map((lab) => ({
    id: lab.id,
    name: lab.name,
    address: lab.address,
    types: lab.types.map((t) => ({
      id: t.id,
      name: t.name,
    })),
  }));

  const uniqueTypeCount = new Set(
    labs.flatMap((lab) => lab.types.map((type) => type.name.toUpperCase()))
  ).size;
  const missingLinkedLab = session.isLabAdmin && !session.labId;
  const todayKey = formatDateKey(new Date());
  const currentMonthKey = todayKey.slice(0, 7);
  const visibleMonthAgendaCount = activity.sources.filter(
    (item) => item.kind === "lab_event" && overlapsMonth(item.startDate, item.endDate, currentMonthKey)
  ).length;
  const visibleMonthHolidayCount = activity.sources.filter(
    (item) => item.kind !== "lab_event" && overlapsMonth(item.startDate, item.endDate, currentMonthKey)
  ).length;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <AdminHeader isAdmin={session.isAdmin} labName={session.labName} />

        {missingLinkedLab ? (
          <Alert
            type="warning"
            showIcon
            title="Akun Labkesda belum ditautkan ke laboratorium"
            description="Minta super admin untuk mengirim ulang invitation atau memperbaiki metadata akun ini."
          />
        ) : null}

        <AdminSectionIntro
          eyebrow="Ringkasan"
          title={session.isAdmin ? "Kontrol Operasional Labkesda" : "Ruang Kerja Laboratorium"}
          description={
            session.isAdmin
              ? "Pantau kesehatan data, kepadatan agenda, dan kalender kerja bulanan sebelum masuk ke pengelolaan laboratorium."
              : "Semua ringkasan utama laboratorium Anda dirangkum di sini agar perubahan data, agenda, dan kalender operasional lebih mudah dipantau."
          }
          footer={
            <div className="flex flex-wrap gap-2">
              <Tag color={session.isAdmin ? "blue" : "green"} variant="filled">
                {session.isAdmin ? "Mode Super Admin" : "Mode Labkesda"}
              </Tag>
              <Tag color="green" variant="filled">
                {uniqueTypeCount} jenis laboratorium
              </Tag>
            </div>
          }
        />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            label="Laboratorium terlihat"
            value={labs.length}
            helper={session.isAdmin ? "seluruh laboratorium" : "lab tertaut ke akun"}
          />
          <AdminMetricCard
            label="Agenda bulan ini"
            value={visibleMonthAgendaCount}
            tone="green"
            helper="agenda yang beririsan dengan bulan aktif"
          />
          <AdminMetricCard
            label="Hari libur bulan ini"
            value={visibleMonthHolidayCount}
            tone="amber"
            helper="libur nasional dan cuti bersama"
          />
          <AdminMetricCard
            label="Agenda mendatang"
            value={
              activity.sources.filter(
                (item) => item.kind === "lab_event" && item.endDate >= todayKey
              ).length
            }
            tone="blue"
            helper="kegiatan yang masih akan berlangsung"
          />
        </div>

        <Row gutter={[16, 16]} align="top">
          <Col xs={24} xl={16}>
            <Card
              variant="borderless"
              className="rounded-[24px] border border-sky-100 bg-sky-50/70 shadow-[0_18px_38px_rgba(15,23,42,0.05)]"
            >
              <ActivityCalendar
                items={activity.sources}
                title="Kalender Operasional"
                description="Agenda laboratorium, libur nasional, dan cuti bersama digabung dalam satu kalender operasional."
                todayKey={todayKey}
                actionHref="/admin/events"
                actionLabel="Kelola Agenda"
              />
            </Card>
          </Col>

          <Col xs={24} xl={8}>
            <Card
              variant="borderless"
              className="rounded-[24px] border border-emerald-100 bg-emerald-50/65 shadow-[0_18px_38px_rgba(15,23,42,0.05)]"
            >
              <UpcomingActivityList
                items={activity.sources}
                title="Agenda Mendatang"
                description={
                  session.isAdmin
                    ? "Pantau agenda seluruh Labkesda yang sudah dijadwalkan."
                    : "Pantau agenda laboratorium yang terhubung ke akun Anda."
                }
                todayKey={todayKey}
                actionHref="/admin/events"
                actionLabel="Kelola Agenda"
              />
            </Card>
          </Col>
        </Row>

        <Card
          variant="borderless"
          className="rounded-[24px] border border-sky-100 bg-sky-50/60 shadow-[0_18px_38px_rgba(15,23,42,0.05)]"
        >
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Data Utama
              </div>
              <h2 className="mb-1 mt-1 text-2xl font-semibold text-slate-900">
                Daftar Laboratorium
              </h2>
              <p className="m-0 text-sm text-slate-500">
                {session.isAdmin
                  ? "Seluruh laboratorium yang terdaftar di peta."
                  : "Laboratorium yang ditautkan ke akun Anda."}
              </p>
            </div>
          </div>

          <AdminLabsTable labs={labRows} canDelete={session.isAdmin} />
        </Card>
      </div>
    </main>
  );
}
