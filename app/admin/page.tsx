// app/admin/page.tsx
import { clerkClient } from "@clerk/nextjs/server";
import { Alert, Button, Card, Tabs, Tag, type TabsProps } from "antd";
import ActivityCalendar from "@/components/activity/ActivityCalendar";
import AdminAppSettingsManager from "@/components/admin/AdminAppSettingsManager";
import UpcomingActivityList from "@/components/activity/UpcomingActivityList";
import AdminArticlesManager, {
  type AdminArticleRow,
} from "@/components/admin/AdminArticlesManager";
import AdminEventsManager, {
  type AdminEventRow,
} from "@/components/admin/AdminEventsManager";
import AdminHolidaysManager, {
  type AdminHolidayRow,
} from "@/components/admin/AdminHolidaysManager";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminLabsTable from "@/components/admin/AdminLabsTable";
import AdminUsersManager, {
  type ActiveLabUserRow,
  type PendingInvitationRow,
} from "@/components/admin/AdminUsersManager";
import { formatDateKey } from "@/lib/activity-calendar";
import { getActivitySources } from "@/lib/activity-server";
import { getAppBranding } from "@/lib/app-branding";
import {
  LAB_ADMIN_ROLE,
  requireDashboardPageAccess,
} from "@/lib/clerk-auth";
import { prisma } from "@/lib/prisma";

function AdminMetricCard({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number | string;
  tone?: "slate" | "green" | "amber" | "blue";
}) {
  const toneClass = `smartmaps-admin-metric smartmaps-admin-metric-${tone}`;

  return (
    <div className={toneClass}>
      <div className="smartmaps-admin-metric-label">
        {label}
      </div>
      <div className="smartmaps-admin-metric-value">
        {value}
      </div>
    </div>
  );
}

function TabLabel({
  label,
  count,
}: {
  label: string;
  count?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      {typeof count === "number" ? (
        <span className="smartmaps-admin-tab-counter">
          {count}
        </span>
      ) : null}
    </span>
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

function getPrimaryEmail(user: {
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{ id: string; emailAddress: string }>;
}) {
  return (
    user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId
    )?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "-"
  );
}

export default async function AdminDashboardPage() {
  const session = await requireDashboardPageAccess();
  const clerk = session.isAdmin ? await clerkClient() : null;

  const [branding, labs, activity, dashboardEvents, dashboardArticles, holidays, usersResult, invitationsResult] =
    await Promise.all([
      getAppBranding(),
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
      prisma.labEvent.findMany({
        where: session.isAdmin
          ? undefined
          : session.labId
            ? {
                OR: [{ labId: session.labId }, { isGlobal: true }],
              }
            : {
                isGlobal: true,
              },
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
      prisma.article.findMany({
        where: session.isAdmin
          ? undefined
          : session.labId
            ? {
                OR: [{ labId: session.labId }, { isGlobal: true }],
              }
            : {
                isGlobal: true,
              },
        include: {
          lab: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
      }),
      session.isAdmin
        ? prisma.masterHoliday.findMany({
            orderBy: [{ date: "asc" }, { name: "asc" }],
          })
        : Promise.resolve([]),
      clerk ? clerk.users.getUserList({ limit: 100 }) : Promise.resolve(null),
      clerk
        ? clerk.invitations.getInvitationList({ status: "pending", limit: 100 })
        : Promise.resolve(null),
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

  const primaryLab = labs[0] ?? null;
  const missingLinkedLab = session.isLabAdmin && !session.labId;
  const todayKey = formatDateKey(new Date());
  const currentMonthKey = todayKey.slice(0, 7);
  const visibleMonthAgendaCount = activity.sources.filter(
    (item) =>
      item.kind === "lab_event" && overlapsMonth(item.startDate, item.endDate, currentMonthKey)
  ).length;
  const visibleMonthHolidayCount = activity.sources.filter(
    (item) =>
      (item.kind === "libur_nasional" || item.kind === "cuti_bersama") &&
      overlapsMonth(item.startDate, item.endDate, currentMonthKey)
  ).length;
  const visibleArticleCount = activity.sources.filter((item) => item.kind === "article").length;
  const upcomingAgendaCount = activity.sources.filter(
    (item) => item.kind === "lab_event" && item.endDate >= todayKey
  ).length;

  const eventRows: AdminEventRow[] = dashboardEvents.map((event) => ({
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

  const holidayRows: AdminHolidayRow[] = holidays.map((holiday) => ({
    id: holiday.id,
    date: formatDateKey(holiday.date),
    name: holiday.name,
    type: holiday.type,
    source: holiday.source,
    isActive: holiday.isActive,
  }));

  const articleRows: AdminArticleRow[] = dashboardArticles.map((article) => ({
    id: article.id,
    labId: article.lab?.id ?? null,
    labName: article.isGlobal ? "Artikel Global DPW" : article.lab?.name ?? null,
    isGlobal: article.isGlobal,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    contentHtml: article.contentHtml,
    coverImageUrl: article.coverImageUrl,
    isPublished: article.isPublished,
    publishedAt: formatDateKey(article.publishedAt),
    createdAt: article.createdAt.toISOString(),
  }));

  const activeUsers: ActiveLabUserRow[] = (usersResult?.data ?? [])
    .filter((user) => user.publicMetadata?.role === LAB_ADMIN_ROLE)
    .map((user) => ({
      id: user.id,
      email: getPrimaryEmail(user),
      labId:
        typeof user.publicMetadata?.lab_id === "string"
          ? user.publicMetadata.lab_id
          : null,
      labName:
        typeof user.publicMetadata?.lab_name === "string"
          ? user.publicMetadata.lab_name
          : null,
      createdAt: new Date(user.createdAt).toISOString(),
    }));

  const pendingInvitations: PendingInvitationRow[] = (invitationsResult?.data ?? [])
    .filter((invitation) => invitation.publicMetadata?.role === LAB_ADMIN_ROLE)
    .map((invitation) => ({
      id: invitation.id,
      email: invitation.emailAddress,
      labId:
        typeof invitation.publicMetadata?.lab_id === "string"
          ? invitation.publicMetadata.lab_id
          : null,
      labName:
        typeof invitation.publicMetadata?.lab_name === "string"
          ? invitation.publicMetadata.lab_name
          : null,
      createdAt: new Date(invitation.createdAt).toISOString(),
    }));

  const reservedLabIds = new Set<string>();

  for (const user of activeUsers) {
    if (user.labId) {
      reservedLabIds.add(user.labId);
    }
  }

  for (const invitation of pendingInvitations) {
    if (invitation.labId) {
      reservedLabIds.add(invitation.labId);
    }
  }

  const eventLabOptions = labs.map((lab) => ({
    value: lab.id,
    label: lab.name,
  }));

  const inviteLabOptions = labs.map((lab) => ({
    value: lab.id,
    label: `${lab.name} (${lab.id})`,
    disabled: reservedLabIds.has(lab.id),
  }));

  const managementTabs: TabsProps["items"] = [];

  if (!session.isAdmin && primaryLab) {
    managementTabs.push({
      key: "lab",
      label: <TabLabel label="Laboratorium Saya" />,
      children: (
        <Card variant="borderless" className="smartmaps-admin-panel">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h2 className="mb-1 text-xl font-semibold text-slate-900">{primaryLab.name}</h2>
              <p className="m-0 max-w-3xl text-sm leading-6 text-slate-600">
                {primaryLab.address}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {primaryLab.types.length > 0
                  ? primaryLab.types.map((type) => (
                      <Tag key={type.id} color="blue">
                        {type.name}
                      </Tag>
                    ))
                  : (
                      <Tag>Belum diset</Tag>
                    )}
              </div>
            </div>

            <Button href={`/admin/${primaryLab.id}/edit`} type="primary">
              Edit
            </Button>
          </div>
        </Card>
      ),
    });
  }

  managementTabs.push({
    key: "events",
    label: <TabLabel label="Agenda" count={eventRows.length} />,
    children: (
      <AdminEventsManager
        labs={eventLabOptions}
        events={eventRows}
        canManageAllLabs={session.isAdmin}
        fixedLabId={session.isLabAdmin ? session.labId : null}
        fixedLabLabel={session.isLabAdmin ? session.labName : null}
      />
    ),
  });

  managementTabs.push({
    key: "articles",
    label: <TabLabel label="Artikel" count={articleRows.length} />,
    children: (
      <AdminArticlesManager
        labs={eventLabOptions}
        articles={articleRows}
        canManageAllLabs={session.isAdmin}
        fixedLabId={session.isLabAdmin ? session.labId : null}
        fixedLabLabel={session.isLabAdmin ? session.labName : null}
      />
    ),
  });

  if (session.isAdmin) {
    managementTabs.push(
      {
        key: "holidays",
        label: <TabLabel label="Libur" count={holidayRows.length} />,
        children: <AdminHolidaysManager holidays={holidayRows} />,
      },
      {
        key: "settings",
        label: <TabLabel label="Aplikasi" />,
        children: <AdminAppSettingsManager branding={branding} />,
      },
      {
        key: "users",
        label: <TabLabel label="Akun" count={activeUsers.length + pendingInvitations.length} />,
        children: (
          <AdminUsersManager
            labs={inviteLabOptions}
            activeUsers={activeUsers}
            pendingInvitations={pendingInvitations}
          />
        ),
      },
      {
        key: "labs",
        label: <TabLabel label="Laboratorium" count={labRows.length} />,
        children: (
          <Card variant="borderless" className="smartmaps-admin-panel">
            <AdminLabsTable labs={labRows} canDelete />
          </Card>
        ),
      }
    );
  }

  return (
    <main className="smartmaps-admin min-h-screen px-4 py-4 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <AdminHeader
          isAdmin={session.isAdmin}
          labName={session.labName}
          appName={branding.appName}
          logoUrl={branding.logoUrl}
          logoAlt={branding.logoAlt}
        />

        {missingLinkedLab ? (
          <Alert
            type="warning"
            showIcon
            title="Akun Labkesda belum ditautkan ke laboratorium"
          />
        ) : null}

        {session.isLabAdmin && primaryLab ? (
          <Card
            variant="borderless"
            className="smartmaps-admin-panel smartmaps-admin-panel-soft-green"
            styles={{ body: { padding: 14 } }}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h2 className="mb-1 text-xl font-semibold text-slate-900">{primaryLab.name}</h2>
                <p className="m-0 max-w-3xl text-sm leading-6 text-slate-600">
                  {primaryLab.address}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {primaryLab.types.length > 0
                    ? primaryLab.types.map((type) => (
                        <Tag key={type.id} color="blue">
                          {type.name}
                        </Tag>
                        ))
                    : null}
                </div>
              </div>

              <Button size="small" href={`/admin/${primaryLab.id}/edit`} type="primary">
                Edit Laboratorium
              </Button>
            </div>
          </Card>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard label="Laboratorium" value={labs.length} />
          <AdminMetricCard
            label="Agenda bulan ini"
            value={visibleMonthAgendaCount}
            tone="green"
          />
          <AdminMetricCard label="Artikel" value={visibleArticleCount} tone="blue" />
          <AdminMetricCard
            label={session.isAdmin ? "Hari libur" : "Agenda mendatang"}
            value={session.isAdmin ? visibleMonthHolidayCount : upcomingAgendaCount}
            tone={session.isAdmin ? "amber" : "green"}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card
            variant="borderless"
            className="smartmaps-admin-panel smartmaps-admin-panel-soft-blue"
            styles={{ body: { padding: 14 } }}
          >
            <ActivityCalendar
              items={activity.sources}
              title="Kalender"
              description=""
              todayKey={todayKey}
              compact
              hideSummary
              hideNote
            />
          </Card>

          <Card
            variant="borderless"
            className="smartmaps-admin-panel smartmaps-admin-panel-soft-green"
            styles={{ body: { padding: 14 } }}
          >
            <UpcomingActivityList
              items={activity.sources}
              title="Agenda"
              description=""
              todayKey={todayKey}
              compact
              limit={5}
            />
          </Card>
        </div>

        <Card
          variant="borderless"
          className="smartmaps-admin-panel"
          styles={{ body: { padding: 14 } }}
        >
          <Tabs
            className="smartmaps-admin-tabs"
            size="small"
            defaultActiveKey={session.isAdmin ? "events" : primaryLab ? "lab" : "events"}
            items={managementTabs}
          />
        </Card>
      </div>
    </main>
  );
}
