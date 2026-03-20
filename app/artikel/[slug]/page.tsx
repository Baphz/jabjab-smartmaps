import { Button, Tag } from "antd";
import Image from "next/image";
import { notFound } from "next/navigation";
import ArticleContent from "@/components/article/ArticleContent";
import ArticleOriginMeta from "@/components/article/ArticleOriginMeta";
import { formatMediumDate } from "@/lib/activity-calendar";
import { resolveStoredPhotoUrl } from "@/lib/drive-file";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ArticleDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const article = await prisma.article.findFirst({
    where: {
      slug,
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
  });

  if (!article) {
    notFound();
  }

  const resolvedCover = article.coverImageUrl
    ? resolveStoredPhotoUrl(article.coverImageUrl)
    : "";

  return (
    <main className="min-h-screen px-3 py-4 sm:px-5">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Button href="/artikel">Kembali ke artikel</Button>
          <Button href="/">Kembali ke peta</Button>
        </div>

        <article className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)] sm:px-7 sm:py-7">
          <div className={`grid gap-6 ${resolvedCover ? "xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)] xl:items-center" : ""}`}>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-1.5">
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
                <Tag>{formatMediumDate(formatDate(article.publishedAt))}</Tag>
              </div>

              <h1 className="smartmaps-title-display mt-4">
                {article.title}
              </h1>

              {article.excerpt ? (
                <p className="smartmaps-copy-lead mt-4 mb-0 max-w-3xl">
                  {article.excerpt}
                </p>
              ) : null}
            </div>

            {resolvedCover ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-[24px] border border-slate-200">
                <Image
                  src={resolvedCover}
                  alt={article.title}
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : null}
          </div>
        </article>

        <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)] sm:px-7 sm:py-7">
          <div className="mx-auto max-w-[760px]">
            <ArticleContent html={article.contentHtml} />
          </div>
        </section>
      </div>
    </main>
  );
}

function formatDate(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(
    value.getUTCDate()
  ).padStart(2, "0")}`;
}
