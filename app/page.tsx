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

function CompactMetric({
  label,
  value,
  tone = "blue",
}: {
  label: string;
  value: number;
  tone?: "blue" | "green" | "amber";
}) {
  const toneClass =
    tone === "blue"
      ? "border-sky-200 bg-sky-50/90"
      : tone === "green"
      ? "border-emerald-200 bg-emerald-50/90"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50/90"
        : "border-sky-200 bg-sky-50/90";

  return (
    <div className={`rounded-2xl border px-3 py-2 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-[18px] font-semibold leading-none tracking-tight text-slate-950">
        {value}
      </div>
    </div>
  );
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
          },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
      take: 5,
    }),
  ]);

  const year = new Date().getFullYear();
  const todayKey = formatDateKey(new Date());
  const publicAgendaCount = activity.sources.filter(
    (item) => item.kind === "lab_event" && item.endDate >= todayKey
  ).length;
  const activeHolidayCount = activity.sources.filter(
    (item) =>
      (item.kind === "libur_nasional" || item.kind === "cuti_bersama") &&
      item.startDate >= todayKey
  ).length;

  return (
    <main className="min-h-screen px-2.5 py-2.5 sm:px-4 lg:px-5">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-2.5">
        <section className="rounded-2xl border border-sky-100 bg-sky-50/75 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:px-5">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <div
                  className="smartmaps-logo-frame"
                  style={{
                    position: "relative",
                    height: 42,
                    width: 42,
                    overflow: "hidden",
                    borderRadius: 12,
                  }}
                >
                  <Image
                    src={branding.logoUrl}
                    alt={branding.logoAlt}
                    fill
                    sizes="42px"
                    unoptimized
                    className="object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {siteContent.publicHome.eyebrow}
                  </div>
                  <h1 className="mt-0.5 text-[20px] font-semibold tracking-tight text-slate-950 sm:text-[24px]">
                    {siteContent.publicHome.title}
                  </h1>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-sky-200 bg-sky-100/70 px-3 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-600">
                    <EnvironmentOutlined className="text-slate-400" />
                    {branding.regionLabel}
                  </span>
                  <ThemeModeToggle />
                </div>
                <Button
                  href={session.canAccessDashboard ? "/admin" : "/login"}
                  type="primary"
                  size="small"
                >
                  {session.canAccessDashboard ? "Dashboard" : "Login"}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <CompactMetric
                  label={siteContent.publicHome.metrics.labs}
                  value={labs.length}
                  tone="blue"
                />
                <CompactMetric
                  label={siteContent.publicHome.metrics.activeAgenda}
                  value={publicAgendaCount}
                  tone="green"
                />
                <CompactMetric
                  label={siteContent.publicHome.metrics.holidays}
                  value={activeHolidayCount}
                  tone="amber"
                />
              </div>
            </div>
          </div>
        </section>

        <HomeMapAgendaLayout
          labs={labs}
          items={activity.sources}
          todayKey={todayKey}
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
