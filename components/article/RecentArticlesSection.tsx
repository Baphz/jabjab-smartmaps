import Link from "next/link";
import { Button, Empty } from "antd";
import Image from "next/image";
import ArticleOriginMeta from "@/components/article/ArticleOriginMeta";
import { resolveStoredPhotoUrl } from "@/lib/drive-file";
import { type LabCityTypeValue, type LabVillageTypeValue } from "@/lib/lab-address";
import { siteContent } from "@/lib/site-content";

type ArticleCardItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: Date | string;
  isGlobal: boolean;
  labName: string | null;
  provinceName: string | null;
  cityName: string | null;
  cityType: LabCityTypeValue | null;
  districtName: string | null;
  villageName: string | null;
  villageType: LabVillageTypeValue | null;
};

function formatPublishedDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function ArticleCover({
  title,
  coverImageUrl,
  compact = false,
}: {
  title: string;
  coverImageUrl: string | null;
  compact?: boolean;
}) {
  const resolved = coverImageUrl ? resolveStoredPhotoUrl(coverImageUrl) : "";

  if (!resolved) {
    return (
      <div
        className={`flex items-center justify-center border border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 ${
          compact ? "aspect-[1.9/1] rounded-2xl" : "aspect-video rounded-[18px]"
        }`}
      >
        {siteContent.publicHome.articles.fallbackCoverLabel}
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden border border-slate-200 ${
        compact ? "aspect-[1.9/1] rounded-2xl" : "aspect-video rounded-[18px]"
      }`}
    >
      <Image
        src={resolved}
        alt={title}
        fill
        sizes={compact ? "(min-width: 1536px) 230px, (min-width: 1280px) 30vw, 100vw" : "(min-width: 1280px) 240px, 100vw"}
        className="object-cover"
        unoptimized
      />
    </div>
  );
}

export default function RecentArticlesSection({
  articles,
  compact = false,
}: {
  articles: ArticleCardItem[];
  compact?: boolean;
}) {
  const sectionClass = compact
    ? "rounded-3xl border border-sky-200 bg-sky-50/82 px-3 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:px-3.5"
    : "rounded-3xl border border-sky-200 bg-sky-50/82 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:px-5";
  const headerTitleClass = compact
    ? "mt-0.5 text-[1.05rem] font-semibold leading-tight tracking-[-0.03em] text-slate-900 sm:text-[1.15rem]"
    : "smartmaps-title-section mt-1";
  const headerWrapClass = compact
    ? "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
    : "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between";
  const actionButtonClass = compact ? "rounded-full px-3 py-1 text-[12px] font-medium" : "";
  const emptyPanelClass = compact
    ? "smartmaps-empty-panel mt-3 rounded-3xl px-4 py-6"
    : "smartmaps-empty-panel mt-4 rounded-[20px] px-4 py-8";
  const gridClass = compact
    ? "mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    : "mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5";

  return (
    <section className={sectionClass}>
      <div className={headerWrapClass}>
        <div>
          <div className="smartmaps-overline">
            {siteContent.publicHome.sections.articlesEyebrow}
          </div>
          <h2 className={headerTitleClass}>
            {siteContent.publicHome.sections.articlesTitle}
          </h2>
        </div>

        <Button href="/artikel" className={actionButtonClass}>
          {siteContent.publicHome.sections.articlesActionLabel}
        </Button>
      </div>

      {articles.length === 0 ? (
        <div className={emptyPanelClass}>
          <Empty
            description={siteContent.publicHome.articles.emptyLabel}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : (
        <div className={gridClass}>
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/artikel/${article.slug}`}
              className={`block border border-slate-200 bg-white transition hover:border-sky-200 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)] ${
                compact ? "rounded-3xl p-2.5" : "rounded-[20px] p-3"
              }`}
            >
              <ArticleCover
                title={article.title}
                coverImageUrl={article.coverImageUrl}
                compact={compact}
              />

              <div className={compact ? "mt-2.5" : "mt-3"}>
                <ArticleOriginMeta
                  isGlobal={article.isGlobal}
                  labName={article.labName}
                  provinceName={article.provinceName}
                  cityName={article.cityName}
                  cityType={article.cityType}
                  districtName={article.districtName}
                  villageName={article.villageName}
                  villageType={article.villageType}
                />
              </div>

              <div className={compact ? "mt-1.5 text-[10.5px] text-slate-500" : "mt-2 text-[11px] text-slate-500"}>
                {formatPublishedDate(article.publishedAt)}
              </div>

              <h3
                className={compact ? "mt-1 text-[15px] font-semibold leading-[1.25] tracking-[-0.025em] text-slate-900" : "smartmaps-title-card mt-1"}
                style={
                  compact
                    ? {
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }
                    : undefined
                }
              >
                {article.title}
              </h3>

              {!compact && article.excerpt ? (
                <p
                  className="mt-1.5 text-[12px] leading-5 text-slate-600"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {article.excerpt}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
