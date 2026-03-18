import { Button, Tag } from "antd";
import Image from "next/image";
import { notFound } from "next/navigation";
import ArticleContent from "@/components/article/ArticleContent";
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
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Button href="/artikel">Kembali ke artikel</Button>
          <Button href="/">Kembali ke peta</Button>
        </div>

        <article className="rounded-[26px] border border-slate-200 bg-white px-5 py-5 shadow-[0_18px_42px_rgba(15,23,42,0.05)] sm:px-7 sm:py-7">
          <div className="flex flex-wrap gap-1.5">
            <Tag color={article.isGlobal ? "blue" : "green"} variant="filled">
              {article.isGlobal ? "Global DPW" : article.lab?.name ?? "Artikel Lab"}
            </Tag>
            <Tag>{formatMediumDate(formatDate(article.publishedAt))}</Tag>
          </div>

          <h1 className="mt-3 text-[30px] font-semibold tracking-tight text-slate-950 sm:text-[38px]">
            {article.title}
          </h1>

          {article.excerpt ? (
            <p className="mt-3 mb-0 text-[15px] leading-7 text-slate-600">
              {article.excerpt}
            </p>
          ) : null}

          {resolvedCover ? (
            <div className="relative mt-5 aspect-video w-full overflow-hidden rounded-[22px] border border-slate-200">
              <Image
                src={resolvedCover}
                alt={article.title}
                fill
                sizes="(min-width: 1024px) 896px, 100vw"
                className="object-cover"
                unoptimized
              />
            </div>
          ) : null}

          <div className="mt-6">
            <ArticleContent html={article.contentHtml} />
          </div>
        </article>
      </div>
    </main>
  );
}

function formatDate(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(
    value.getUTCDate()
  ).padStart(2, "0")}`;
}
