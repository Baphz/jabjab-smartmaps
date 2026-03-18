import Link from "next/link";
import { Button, Empty, Tag } from "antd";
import Image from "next/image";
import { formatMediumDate } from "@/lib/activity-calendar";
import { resolveStoredPhotoUrl } from "@/lib/drive-file";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function ArticleCard({
  title,
  slug,
  excerpt,
  coverImageUrl,
  publishedAt,
  isGlobal,
  labName,
}: {
  title: string;
  slug: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: Date;
  isGlobal: boolean;
  labName: string | null;
}) {
  const resolvedCover = coverImageUrl ? resolveStoredPhotoUrl(coverImageUrl) : "";

  return (
    <Link
      href={`/artikel/${slug}`}
      className="block rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_18px_38px_rgba(15,23,42,0.04)] transition hover:border-sky-200 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
    >
      {resolvedCover ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[18px] border border-slate-200">
          <Image
            src={resolvedCover}
            alt={title}
            fill
            sizes="(min-width: 1280px) 360px, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Artikel
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Tag color={isGlobal ? "blue" : "green"} variant="filled">
          {isGlobal ? "Global DPW" : labName ?? "Artikel Lab"}
        </Tag>
      </div>

      <div className="mt-2 text-[12px] text-slate-500">
        {formatMediumDate(
          `${publishedAt.getUTCFullYear()}-${String(publishedAt.getUTCMonth() + 1).padStart(2, "0")}-${String(
            publishedAt.getUTCDate()
          ).padStart(2, "0")}`
        )}
      </div>

      <h2 className="mt-1 text-[20px] font-semibold tracking-tight text-slate-950">{title}</h2>

      {excerpt ? (
        <p
          className="mt-2 text-[13px] leading-6 text-slate-600"
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

export default async function ArticlesPage() {
  const articles = await prisma.article.findMany({
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
  });

  return (
    <main className="min-h-screen px-3 py-4 sm:px-5">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <section className="rounded-[24px] border border-sky-100 bg-sky-50/65 px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Artikel
              </div>
              <h1 className="mb-1 mt-1 text-[28px] font-semibold tracking-tight text-slate-950">
                Artikel Labkesda
              </h1>
              <p className="m-0 max-w-3xl text-[13px] leading-6 text-slate-600">
                Kumpulan publikasi terbaru dari DPW dan laboratorium yang terdaftar.
              </p>
            </div>

            <Button href="/">Kembali ke peta</Button>
          </div>
        </section>

        {articles.length === 0 ? (
          <div className="smartmaps-empty-panel rounded-[24px] px-4 py-10 shadow-[0_18px_38px_rgba(15,23,42,0.04)]">
            <Empty
              description="Belum ada artikel."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                title={article.title}
                slug={article.slug}
                excerpt={article.excerpt}
                coverImageUrl={article.coverImageUrl}
                publishedAt={article.publishedAt}
                isGlobal={article.isGlobal}
                labName={article.lab?.name ?? null}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
