import Link from "next/link";
import { Button, Empty, Tag } from "antd";
import Image from "next/image";
import { resolveStoredPhotoUrl } from "@/lib/drive-file";

type ArticleCardItem = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  publishedAt: Date | string;
  isGlobal: boolean;
  labName: string | null;
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
}: {
  title: string;
  coverImageUrl: string | null;
}) {
  const resolved = coverImageUrl ? resolveStoredPhotoUrl(coverImageUrl) : "";

  if (!resolved) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Artikel
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[18px] border border-slate-200">
      <Image src={resolved} alt={title} fill sizes="(min-width: 1280px) 240px, 100vw" className="object-cover" unoptimized />
    </div>
  );
}

export default function RecentArticlesSection({
  articles,
}: {
  articles: ArticleCardItem[];
}) {
  return (
    <section className="rounded-[24px] border border-sky-100 bg-sky-50/60 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] lg:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Artikel
          </div>
          <h2 className="mb-0 mt-1 text-[22px] font-semibold tracking-tight text-slate-950">
            5 Artikel Terbaru
          </h2>
        </div>

        <Button href="/artikel">Lihat semua artikel</Button>
      </div>

      {articles.length === 0 ? (
        <div className="smartmaps-empty-panel mt-4 rounded-[20px] px-4 py-8">
          <Empty
            description="Belum ada artikel."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/artikel/${article.slug}`}
              className="block rounded-[20px] border border-slate-200 bg-white/90 p-3 transition hover:border-sky-200 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]"
            >
              <ArticleCover title={article.title} coverImageUrl={article.coverImageUrl} />

              <div className="mt-3 flex flex-wrap gap-1.5">
                <Tag color={article.isGlobal ? "blue" : "green"} variant="filled">
                  {article.isGlobal ? "Global DPW" : article.labName ?? "Artikel Lab"}
                </Tag>
              </div>

              <div className="mt-2 text-[11px] text-slate-500">
                {formatPublishedDate(article.publishedAt)}
              </div>

              <h3 className="mt-1 text-[15px] font-semibold leading-6 text-slate-950">
                {article.title}
              </h3>

              {article.excerpt ? (
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
