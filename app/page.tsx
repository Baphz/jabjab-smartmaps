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
  const wrapperClass =
    tone === "blue"
      ? "border-blue-200/90 bg-blue-50/90 text-blue-800"
      : tone === "green"
        ? "border-emerald-200/90 bg-emerald-50/90 text-emerald-800"
        : tone === "violet"
          ? "border-violet-200/90 bg-violet-50/90 text-violet-800"
          : "border-amber-200/90 bg-amber-50/90 text-amber-800";
  const valueClass =
    tone === "blue"
      ? "bg-blue-600 text-white"
      : tone === "green"
        ? "bg-emerald-600 text-white"
        : tone === "violet"
          ? "bg-violet-600 text-white"
          : "bg-amber-500 text-amber-950";

  return (
    <div
      className={`inline-flex min-w-fit items-center gap-2 rounded-full border px-2.5 py-1.5 ${wrapperClass}`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </div>
      <div
        className={`inline-flex min-w-7 items-center justify-center rounded-full px-2 py-0.5 text-[12px] font-semibold leading-none ${valueClass}`}
      >
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

  return (
    <main className="min-h-screen px-2.5 py-2.5 sm:px-4 lg:px-5">
      <div className="mx-auto flex max-w-[1480px] flex-col gap-2.5">
        <section className="rounded-2xl border border-slate-200 bg-white/96 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:px-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
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
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {siteContent.publicHome.eyebrow}
                  </div>
                  <h1 className="mt-0.5 text-[22px] font-semibold tracking-tight text-slate-950 sm:text-[28px]">
                    {siteContent.publicHome.title}
                  </h1>
                </div>
              </div>

              <div className="mt-3 flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <CompactMetricChip
                  label="Total"
                  value={labs.length}
                  tone="blue"
                />
                <CompactMetricChip
                  label="Banten"
                  value={bantenLabCount}
                  tone="green"
                />
                <CompactMetricChip
                  label="DKI"
                  value={dkiLabCount}
                  tone="violet"
                />
                <CompactMetricChip
                  label="Jabar"
                  value={jabarLabCount}
                  tone="amber"
                />
              </div>
            </div>

            <div className="xl:w-auto">
              <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-slate-200 bg-slate-50/85 p-2.5">
                <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 text-[11px] font-medium text-slate-600 shadow-[0_1px_0_rgba(255,255,255,0.5)]">
                    <EnvironmentOutlined className="text-slate-400" />
                    <span className="whitespace-nowrap">{branding.regionLabel}</span>
                </span>
                <ThemeModeToggle
                  size="middle"
                  className="smartmaps-header-action-button"
                />
                <Button
                  href={session.canAccessDashboard ? "/admin" : "/login"}
                  type="primary"
                  size="middle"
                  className="smartmaps-header-action-button rounded-full"
                >
                  {session.canAccessDashboard ? "Dashboard" : "Login"}
                </Button>
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
