import { EnvironmentOutlined } from "@ant-design/icons";
import { Button } from "antd";
import Image from "next/image";
import RecentArticlesSection from "@/components/article/RecentArticlesSection";
import HomeMapAgendaLayout from "@/components/home/HomeMapAgendaLayout";
import ThemeModeToggle from "@/components/theme/ThemeModeToggle";
import { formatDateKey } from "@/lib/activity-calendar";
import { getActivitySources } from "@/lib/activity-server";
import { getAppBranding } from "@/lib/app-branding";
import { getCurrentClerkSession } from "@/lib/clerk-auth";
import { prisma } from "@/lib/prisma";
import { siteContent } from "@/lib/site-content";

function CompactMetricChip({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: number;
  tone?: "blue" | "green" | "violet" | "amber";
}) {
  const toneClass = `smartmaps-metric-chip smartmaps-metric-chip-${tone}`;

  return (
    <div className={`inline-flex min-w-fit items-center gap-2 rounded-full border px-2.5 py-1.5 ${toneClass}`}>
      <div className="smartmaps-metric-chip-label text-[10px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </div>
      <div className="smartmaps-metric-chip-value inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-semibold leading-none">
        {value}
      </div>
    </div>
  );
}

function matchesProvinceName(value: string | null | undefined, keyword: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .includes(keyword.toLowerCase());
}

export default async function HomePage() {
  const [branding, labs, session, activity, recentArticles] = await Promise.all([
    getAppBranding(),
    prisma.lab.findMany({
      include: { types: true },
      orderBy: { name: "asc" },
    }),
    getCurrentClerkSession(),
    getActivitySources({
      onlyPublished: true,
    }),
    prisma.article.findMany({
      where: {
        isPublished: true,
      },
      include: {
        lab: {
          select: {
            id: true,
            name: true,
            provinceName: true,
            cityName: true,
            cityType: true,
            districtName: true,
            villageName: true,
            villageType: true,
          },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
      take: 5,
    }),
  ]);

  const year = new Date().getFullYear();
  const todayKey = formatDateKey(new Date());
  const bantenLabCount = labs.filter((lab) =>
    matchesProvinceName(lab.provinceName, "banten")
  ).length;
  const dkiLabCount = labs.filter((lab) =>
    matchesProvinceName(lab.provinceName, "dki")
  ).length;
  const jabarLabCount = labs.filter((lab) =>
    matchesProvinceName(lab.provinceName, "jawa barat")
  ).length;
  const publicHomeContent = siteContent.publicHome;

  return (
    <main className="min-h-screen px-2.5 py-2.5 sm:px-4 lg:px-5">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-2.5">
        <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:px-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div
                  className="smartmaps-logo-frame"
                  style={{
                    position: "relative",
                    height: 48,
                    width: 48,
                    overflow: "hidden",
                    borderRadius: 14,
                  }}
                >
                  <Image
                    src={branding.logoUrl}
                    alt={branding.logoAlt}
                    fill
                    sizes="48px"
                    unoptimized
                    className="object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <div className="smartmaps-overline">
                    {siteContent.publicHome.eyebrow}
                  </div>
                  <h1 className="smartmaps-title-display mt-0.5">
                    {branding.publicHomeTitle}
                  </h1>
                </div>
              </div>
            </div>

            <div className="min-w-0 xl:w-auto">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] xl:flex xl:flex-wrap xl:items-center xl:justify-end rounded-2xl border border-slate-200 bg-slate-50/95 p-2.5">
                <span className="smartmaps-header-pill inline-flex min-h-10 w-full items-center gap-2 rounded-full border px-3.5 text-[11px] font-medium shadow-[0_1px_0_rgba(255,255,255,0.5)] sm:w-auto">
                    <EnvironmentOutlined className="text-slate-400" />
                    <span className="whitespace-nowrap">{branding.regionLabel}</span>
                </span>
                <ThemeModeToggle
                  size="middle"
                  className="smartmaps-header-toggle-button"
                />
                <Button
                  href={session.canAccessDashboard ? "/admin" : "/login"}
                  type="primary"
                  size="middle"
                  className="smartmaps-header-action-button w-full rounded-full sm:w-auto"
                >
                  {session.canAccessDashboard
                    ? publicHomeContent.toolbar.dashboardLabel
                    : publicHomeContent.toolbar.loginLabel}
                </Button>
              </div>
            </div>

            <div className="xl:col-span-2">
              <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <CompactMetricChip
                  label={publicHomeContent.metrics.total}
                  value={labs.length}
                  tone="green"
                />
                <CompactMetricChip
                  label={publicHomeContent.metrics.westJava}
                  value={jabarLabCount}
                  tone="blue"
                />
                <CompactMetricChip
                  label={publicHomeContent.metrics.jakarta}
                  value={dkiLabCount}
                  tone="amber"
                />
                <CompactMetricChip
                  label={publicHomeContent.metrics.banten}
                  value={bantenLabCount}
                  tone="violet"
                />
              </div>
            </div>
          </div>
        </section>

        <HomeMapAgendaLayout
          labs={labs}
          items={activity.sources}
          todayKey={todayKey}
          mapTitle={branding.publicMapTitle}
        />

        <RecentArticlesSection
          articles={recentArticles.map((article) => ({
            id: article.id,
            slug: article.slug,
            title: article.title,
            excerpt: article.excerpt,
            coverImageUrl: article.coverImageUrl,
            publishedAt: article.publishedAt,
            isGlobal: article.isGlobal,
            labName: article.lab?.name ?? null,
            provinceName: article.lab?.provinceName ?? null,
            cityName: article.lab?.cityName ?? null,
            cityType: article.lab?.cityType ?? null,
            districtName: article.lab?.districtName ?? null,
            villageName: article.lab?.villageName ?? null,
            villageType: article.lab?.villageType ?? null,
          }))}
        />

        <div className="flex flex-col gap-1 px-1 pb-1 text-[11px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {year} {branding.organizationName}.</span>
          <span>{branding.footerTagline}</span>
        </div>
      </div>
    </main>
  );
}
