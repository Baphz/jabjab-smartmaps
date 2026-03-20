import type { Metadata } from "next";
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ReadOutlined,
} from "@ant-design/icons";
import { Button, Tag } from "antd";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleContent from "@/components/article/ArticleContent";
import ArticleOriginMeta from "@/components/article/ArticleOriginMeta";
import ArticleSharePanel from "@/components/article/ArticleSharePanel";
import { formatMediumDate } from "@/lib/activity-calendar";
import { getAppBranding } from "@/lib/app-branding";
import { resolveStoredPhotoUrl } from "@/lib/drive-file";
import { getConfiguredAppBaseUrl } from "@/lib/invitation-url";
import { formatCityName, formatProvinceName } from "@/lib/lab-address";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const articleInclude = {
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
} as const;

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function getPublishedArticle(slug: string) {
  return prisma.article.findFirst({
    where: {
      slug,
      isPublished: true,
    },
    include: articleInclude,
  });
}

async function getRelatedArticles(article: NonNullable<Awaited<ReturnType<typeof getPublishedArticle>>>) {
  const baseWhere = {
    isPublished: true,
    id: { not: article.id },
  } as const;

  const preferredOrConditions: Array<Record<string, unknown>> = [];

  if (article.isGlobal) {
    preferredOrConditions.push({ isGlobal: true });
  }

  if (article.lab?.id) {
    preferredOrConditions.push({ labId: article.lab.id });
  }

  if (article.lab?.provinceName) {
    preferredOrConditions.push({
      lab: {
        provinceName: article.lab.provinceName,
      },
    });
  }

  const preferred = await prisma.article.findMany({
    where: {
      ...baseWhere,
      ...(preferredOrConditions.length > 0 ? { OR: preferredOrConditions } : {}),
    },
    include: articleInclude,
    orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
    take: 3,
  });

  if (preferred.length >= 3) {
    return preferred;
  }

  const preferredIds = preferred.map((item) => item.id);
  const fallback = await prisma.article.findMany({
    where: {
      ...baseWhere,
      ...(preferredIds.length > 0 ? { id: { notIn: [article.id, ...preferredIds] } } : {}),
    },
    include: articleInclude,
    orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
    take: 3 - preferred.length,
  });

  return [...preferred, ...fallback];
}

function buildAbsoluteUrl(value: string, appBaseUrl: string) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const normalizedBase = appBaseUrl.replace(/\/$/, "");
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${normalizedBase}${normalizedPath}`;
}

function formatDate(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(
    value.getUTCDate()
  ).padStart(2, "0")}`;
}

function getPublicationLabel(isGlobal: boolean) {
  return isGlobal ? "Publikasi DPW" : "Publikasi Lab";
}

function getCoverageLabel(args: {
  isGlobal: boolean;
  cityName?: string | null;
  cityType?: "KABUPATEN" | "KOTA" | null;
  provinceName?: string | null;
  regionLabel?: string;
}) {
  const cityLabel = formatCityName(args.cityName, args.cityType);
  const provinceLabel = args.provinceName ? `Provinsi ${formatProvinceName(args.provinceName)}` : "";

  if (cityLabel && provinceLabel) {
    return `${cityLabel} • ${provinceLabel}`;
  }

  if (cityLabel) return cityLabel;
  if (provinceLabel) return provinceLabel;
  if (args.isGlobal) return args.regionLabel ?? "Jawa Barat · DKI Jakarta · Banten";
  return "Terhubung dengan jaringan laboratorium";
}

function ArticleFallbackVisual({
  title,
  brandName,
}: {
  title: string;
  brandName: string;
}) {
  return (
    <div className="smartmaps-article-hero-fallback">
      <div className="smartmaps-overline">Publikasi</div>
      <div className="smartmaps-title-card mt-2 max-w-[20ch]">{title}</div>
      <div className="smartmaps-copy-muted mt-4 max-w-[24ch]">{brandName}</div>
    </div>
  );
}

function RelatedArticleCard({
  article,
}: {
  article: Awaited<ReturnType<typeof getRelatedArticles>>[number];
}) {
  const resolvedCover = article.coverImageUrl ? resolveStoredPhotoUrl(article.coverImageUrl) : "";

  return (
    <Link
      href={`/artikel/${article.slug}`}
      className="smartmaps-article-related-card block rounded-3xl border border-slate-200 bg-white p-3 transition hover:border-sky-200 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]"
    >
      {resolvedCover ? (
        <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200">
          <Image
            src={resolvedCover}
            alt={article.title}
            fill
            sizes="(min-width: 1024px) 28vw, 100vw"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Artikel
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <ArticleOriginMeta
          isGlobal={article.isGlobal}
          labName={article.lab?.name ?? null}
          provinceName={article.lab?.provinceName ?? null}
          cityName={article.lab?.cityName ?? null}
          cityType={article.lab?.cityType ?? null}
          districtName={article.lab?.districtName ?? null}
          villageName={article.lab?.villageName ?? null}
          villageType={article.lab?.villageType ?? null}
        />
      </div>

      <div className="mt-2 text-[12px] text-slate-500">
        {formatMediumDate(formatDate(article.publishedAt))}
      </div>

      <h3 className="smartmaps-title-card mt-1">{article.title}</h3>

      {article.excerpt ? (
        <p
          className="smartmaps-copy-muted mt-2"
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
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [article, branding] = await Promise.all([
    getPublishedArticle(slug),
    getAppBranding(),
  ]);

  if (!article) {
    return {
      title: `Artikel | ${branding.shortName}`,
    };
  }

  const appBaseUrl = getConfiguredAppBaseUrl();
  const articleUrl = `${appBaseUrl}/artikel/${article.slug}`;
  const resolvedCover = article.coverImageUrl
    ? resolveStoredPhotoUrl(article.coverImageUrl)
    : resolveStoredPhotoUrl(branding.logoUrl);
  const previewImageUrl = buildAbsoluteUrl(resolvedCover, appBaseUrl);
  const description = article.excerpt?.trim() || branding.footerTagline;

  return {
    title: `${article.title} | ${branding.shortName}`,
    description,
    alternates: {
      canonical: articleUrl,
    },
    openGraph: {
      type: "article",
      url: articleUrl,
      title: article.title,
      description,
      siteName: branding.appName,
      locale: "id_ID",
      publishedTime: article.publishedAt.toISOString(),
      images: previewImageUrl
        ? [
            {
              url: previewImageUrl,
              alt: article.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: previewImageUrl ? "summary_large_image" : "summary",
      title: article.title,
      description,
      images: previewImageUrl ? [previewImageUrl] : undefined,
    },
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const article = await getPublishedArticle(slug);

  if (!article) {
    notFound();
  }

  const [branding, relatedArticles] = await Promise.all([
    getAppBranding(),
    getRelatedArticles(article),
  ]);

  const resolvedCover = article.coverImageUrl ? resolveStoredPhotoUrl(article.coverImageUrl) : "";
  const articleUrl = `${getConfiguredAppBaseUrl()}/artikel/${article.slug}`;
  const publishLabel = formatMediumDate(formatDate(article.publishedAt));
  const publicationLabel = getPublicationLabel(article.isGlobal);
  const coverageLabel = getCoverageLabel({
    isGlobal: article.isGlobal,
    cityName: article.lab?.cityName ?? null,
    cityType: article.lab?.cityType ?? null,
    provinceName: article.lab?.provinceName ?? null,
    regionLabel: branding.regionLabel,
  });

  return (
    <>
      <main className="min-h-screen px-3 py-4 sm:px-5">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button href="/artikel" icon={<ArrowLeftOutlined />}>
              Semua artikel
            </Button>
            <Button href="/">Kembali ke peta</Button>
          </div>

          <article className="smartmaps-article-page-shell overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_24px_50px_rgba(15,23,42,0.06)]">
            <div className={`grid gap-6 px-5 py-5 sm:px-7 sm:py-7 ${resolvedCover ? "xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] xl:items-center" : "xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]"}`}>
              <div className="min-w-0">
                <div className="smartmaps-overline">Artikel</div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`smartmaps-article-accent-pill ${article.isGlobal ? "is-dpw" : "is-lab"}`}>
                    {publicationLabel}
                  </span>
                  <ArticleOriginMeta
                    isGlobal={article.isGlobal}
                    labName={article.lab?.name ?? null}
                    provinceName={article.lab?.provinceName ?? null}
                    cityName={article.lab?.cityName ?? null}
                    cityType={article.lab?.cityType ?? null}
                    districtName={article.lab?.districtName ?? null}
                    villageName={article.lab?.villageName ?? null}
                    villageType={article.lab?.villageType ?? null}
                    mode="compact"
                  />
                  <Tag icon={<CalendarOutlined />}>{publishLabel}</Tag>
                  <Tag icon={<EnvironmentOutlined />}>{coverageLabel}</Tag>
                </div>

                <div className="smartmaps-article-title-row mt-5">
                  <span className="smartmaps-article-title-accent" aria-hidden="true" />
                  <h1 className="smartmaps-title-display max-w-[14ch] sm:max-w-[18ch]">
                    {article.title}
                  </h1>
                </div>

                {article.excerpt ? (
                  <p className="smartmaps-copy-lead mt-5 max-w-3xl text-[15px] sm:text-[16px]">
                    {article.excerpt}
                  </p>
                ) : (
                  <p className="smartmaps-copy-lead mt-5 max-w-3xl text-[15px] sm:text-[16px]">
                    Publikasi resmi dari {article.isGlobal ? "DPW" : article.lab?.name ?? branding.shortName}.
                  </p>
                )}

                <p className="smartmaps-copy-muted mt-4 max-w-[60ch] text-[13px] sm:text-[14px]">
                  Informasi ini dipublikasikan untuk memperkuat sebaran pengetahuan, pembaruan kegiatan, dan dokumentasi laboratorium kesehatan daerah.
                </p>
              </div>

              <div className="smartmaps-article-hero-media">
                {resolvedCover ? (
                  <div className="relative aspect-video w-full overflow-hidden rounded-[24px] border border-slate-200">
                    <Image
                      src={resolvedCover}
                      alt={article.title}
                      fill
                      sizes="(min-width: 1280px) 34vw, 100vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <ArticleFallbackVisual title={article.title} brandName={branding.appName} />
                )}
              </div>
            </div>
          </article>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_290px] xl:items-start">
            <section className="rounded-[32px] border border-slate-200 bg-white px-5 py-6 shadow-[0_24px_48px_rgba(15,23,42,0.05)] sm:px-7 sm:py-7">
              <div className="mx-auto max-w-[74ch]">
                <ArticleContent html={article.contentHtml} />
              </div>
            </section>

            <aside className="xl:sticky xl:top-6">
              <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_38px_rgba(15,23,42,0.05)]">
                <div className="smartmaps-overline">Ringkasan</div>

                <div className="mt-4 space-y-3">
                  <div className="smartmaps-article-meta-row">
                    <span className="smartmaps-article-meta-icon">
                      <CalendarOutlined />
                    </span>
                    <div>
                      <div className="smartmaps-caption">Tanggal terbit</div>
                      <div className="smartmaps-title-card mt-1 text-[1rem]">{publishLabel}</div>
                    </div>
                  </div>

                  <div className="smartmaps-article-meta-row">
                    <span className="smartmaps-article-meta-icon">
                      <ReadOutlined />
                    </span>
                    <div>
                      <div className="smartmaps-caption">Jenis publikasi</div>
                      <div className="smartmaps-title-card mt-1 text-[1rem]">{publicationLabel}</div>
                    </div>
                  </div>

                  <div className="smartmaps-article-meta-row">
                    <span className="smartmaps-article-meta-icon">
                      <EnvironmentOutlined />
                    </span>
                    <div className="min-w-0 space-y-3">
                      <div>
                        <div className="smartmaps-caption">Sumber publikasi</div>
                        <ArticleOriginMeta
                          isGlobal={article.isGlobal}
                          labName={article.lab?.name ?? null}
                          provinceName={article.lab?.provinceName ?? null}
                          cityName={article.lab?.cityName ?? null}
                          cityType={article.lab?.cityType ?? null}
                          districtName={article.lab?.districtName ?? null}
                          villageName={article.lab?.villageName ?? null}
                          villageType={article.lab?.villageType ?? null}
                          mode="full"
                        />
                      </div>
                      <div>
                        <div className="smartmaps-caption">Fokus wilayah</div>
                        <div className="smartmaps-title-card mt-1 text-[1rem] leading-[1.3]">
                          {coverageLabel}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  <Button href="/artikel" block>
                    Semua artikel
                  </Button>
                  <Button href="/" block>
                    Kembali ke peta
                  </Button>
                </div>
              </div>
            </aside>
          </div>

          {relatedArticles.length > 0 ? (
            <section className="rounded-[32px] border border-slate-200 bg-white px-5 py-5 shadow-[0_20px_42px_rgba(15,23,42,0.05)] sm:px-7 sm:py-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="smartmaps-overline">Lanjut baca</div>
                  <h2 className="smartmaps-title-section mt-1">Artikel Terkait</h2>
                </div>

                <Button href="/artikel">Lihat semua</Button>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {relatedArticles.map((relatedArticle) => (
                  <RelatedArticleCard key={relatedArticle.id} article={relatedArticle} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <ArticleSharePanel
        url={articleUrl}
        title={article.title}
        summary={article.excerpt}
      />
    </>
  );
}
