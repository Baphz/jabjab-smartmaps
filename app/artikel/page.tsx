import Link from "next/link";
import { Button, Empty } from "antd";
import Image from "next/image";
import ArticleOriginMeta from "@/components/article/ArticleOriginMeta";
import { formatMediumDate } from "@/lib/activity-calendar";
import { getAppBranding } from "@/lib/app-branding";
import { resolveStoredPhotoUrl } from "@/lib/drive-file";
import { type LabCityTypeValue, type LabVillageTypeValue } from "@/lib/lab-address";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(
    value.getUTCDate()
  ).padStart(2, "0")}`;
}

function ArticleCard({
  title,
  slug,
  excerpt,
  coverImageUrl,
  publishedAt,
  isGlobal,
  labName,
  provinceName,
  cityName,
  cityType,
  districtName,
  villageName,
  villageType,
}: {
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: Date;
  isGlobal: boolean;
  labName: string | null;
  provinceName: string | null;
  cityName: string | null;
  cityType: LabCityTypeValue | null;
  districtName: string | null;
  villageName: string | null;
  villageType: LabVillageTypeValue | null;
}) {
  const resolvedCover = coverImageUrl ? resolveStoredPhotoUrl(coverImageUrl) : "";

  return (
    <Link
      href={`/artikel/${slug}`}
      className="group block rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_38px_rgba(15,23,42,0.04)] transition hover:border-sky-300 hover:shadow-[0_20px_42px_rgba(15,23,42,0.08)]"
    >
      {resolvedCover ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-[18px] border border-slate-200">
          <Image
            src={resolvedCover}
            alt={title}
            fill
            sizes="(min-width: 1280px) 360px, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            unoptimized
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Artikel
        </div>
      )}

      <div className="mt-3">
        <ArticleOriginMeta
          isGlobal={isGlobal}
          labName={labName}
          provinceName={provinceName}
          cityName={cityName}
          cityType={cityType}
          districtName={districtName}
          villageName={villageName}
          villageType={villageType}
        />
      </div>

      <div className="mt-2 text-[12px] text-slate-500">
        {formatMediumDate(
          `${publishedAt.getUTCFullYear()}-${String(publishedAt.getUTCMonth() + 1).padStart(2, "0")}-${String(
            publishedAt.getUTCDate()
          ).padStart(2, "0")}`
        )}
      </div>

      <h2 className="smartmaps-title-card mt-1 transition-colors group-hover:text-sky-700">
        {title}
      </h2>

      {excerpt ? (
        <p
          className="smartmaps-copy-muted mt-2"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {excerpt}
        </p>
      ) : null}
    </Link>
  );
}

function FeaturedArticleCard({
  title,
  slug,
  excerpt,
  coverImageUrl,
  publishedAt,
  isGlobal,
  labName,
  provinceName,
  cityName,
  cityType,
  districtName,
  villageName,
  villageType,
}: {
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: Date;
  isGlobal: boolean;
  labName: string | null;
  provinceName: string | null;
  cityName: string | null;
  cityType: LabCityTypeValue | null;
  districtName: string | null;
  villageName: string | null;
  villageType: LabVillageTypeValue | null;
}) {
  const resolvedCover = coverImageUrl ? resolveStoredPhotoUrl(coverImageUrl) : "";

  return (
    <Link
      href={`/artikel/${slug}`}
      className="group grid gap-5 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] transition hover:border-sky-300 hover:shadow-[0_20px_44px_rgba(15,23,42,0.08)] lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center"
    >
      <div className="min-w-0">
        <ArticleOriginMeta
          isGlobal={isGlobal}
          labName={labName}
          provinceName={provinceName}
          cityName={cityName}
          cityType={cityType}
          districtName={districtName}
          villageName={villageName}
          villageType={villageType}
        />

        <div className="smartmaps-copy-muted mt-3">
          {formatMediumDate(formatDate(publishedAt))}
        </div>

        <h2 className="smartmaps-title-page mt-2 transition-colors group-hover:text-sky-700">
          {title}
        </h2>

        {excerpt ? (
          <p className="smartmaps-copy-lead mt-3 max-w-2xl">
            {excerpt}
          </p>
        ) : null}
      </div>

      {resolvedCover ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-[22px] border border-slate-200">
          <Image
            src={resolvedCover}
            alt={title}
            fill
            sizes="(min-width: 1024px) 38vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            unoptimized
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-[22px] border border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Artikel
        </div>
      )}
    </Link>
  );
}

export default async function ArticlesPage() {
  const [articles, branding] = await Promise.all([
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
    }),
    getAppBranding(),
  ]);

  const [featuredArticle, ...otherArticles] = articles;
  const globalArticleCount = articles.filter((article) => article.isGlobal).length;
  const labArticleCount = articles.length - globalArticleCount;

  return (
    <main className="min-h-screen px-3 py-4 sm:px-5">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
        <section className="smartmaps-article-directory-hero rounded-[32px] border border-slate-200 bg-white px-5 py-5 shadow-[0_20px_44px_rgba(15,23,42,0.05)] sm:px-7 sm:py-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="smartmaps-overline">Artikel</div>
              <h1 className="smartmaps-title-page mt-1 mb-1">Ruang Publikasi Labkesda</h1>
              <p className="smartmaps-copy-lead max-w-3xl">
                Rilis dan publikasi dari DPW serta laboratorium yang terhubung di {branding.shortName}.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="smartmaps-article-directory-stats">
                <span className="smartmaps-article-directory-stat is-total">
                  <strong>{articles.length}</strong>
                  <span>Artikel</span>
                </span>
                <span className="smartmaps-article-directory-stat is-global">
                  <strong>{globalArticleCount}</strong>
                  <span>DPW</span>
                </span>
                <span className="smartmaps-article-directory-stat is-lab">
                  <strong>{labArticleCount}</strong>
                  <span>Lab</span>
                </span>
              </div>

              <Button href="/">Kembali ke peta</Button>
            </div>
          </div>
        </section>

        {articles.length === 0 ? (
          <div className="smartmaps-empty-panel rounded-3xl px-4 py-10 shadow-[0_18px_38px_rgba(15,23,42,0.04)]">
            <Empty
              description="Belum ada artikel."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <>
            {featuredArticle ? (
              <FeaturedArticleCard
                title={featuredArticle.title}
                slug={featuredArticle.slug}
                excerpt={featuredArticle.excerpt}
                coverImageUrl={featuredArticle.coverImageUrl}
                publishedAt={featuredArticle.publishedAt}
                isGlobal={featuredArticle.isGlobal}
                labName={featuredArticle.lab?.name ?? null}
                provinceName={featuredArticle.lab?.provinceName ?? null}
                cityName={featuredArticle.lab?.cityName ?? null}
                cityType={featuredArticle.lab?.cityType ?? null}
                districtName={featuredArticle.lab?.districtName ?? null}
                villageName={featuredArticle.lab?.villageName ?? null}
                villageType={featuredArticle.lab?.villageType ?? null}
              />
            ) : null}

            {otherArticles.length > 0 ? (
              <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {otherArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    title={article.title}
                    slug={article.slug}
                    excerpt={article.excerpt}
                    coverImageUrl={article.coverImageUrl}
                    publishedAt={article.publishedAt}
                    isGlobal={article.isGlobal}
                    labName={article.lab?.name ?? null}
                    provinceName={article.lab?.provinceName ?? null}
                    cityName={article.lab?.cityName ?? null}
                    cityType={article.lab?.cityType ?? null}
                    districtName={article.lab?.districtName ?? null}
                    villageName={article.lab?.villageName ?? null}
                    villageType={article.lab?.villageType ?? null}
                  />
                ))}
              </section>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
