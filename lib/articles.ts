import "server-only";

import { prisma } from "@/lib/prisma";

export function stripHtmlTags(value: string) {
  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function createArticleExcerpt(contentHtml: string, fallbackExcerpt?: string | null) {
  const preferred = String(fallbackExcerpt ?? "").trim();
  if (preferred) {
    return preferred.slice(0, 220);
  }

  const plain = stripHtmlTags(contentHtml);
  return plain ? plain.slice(0, 220) : null;
}

export function slugifyArticleTitle(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\w\s-]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function ensureUniqueArticleSlug(title: string, articleId?: string | null) {
  const baseSlug = slugifyArticleTitle(title) || "artikel";
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.article.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || existing.id === articleId) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

type ResolveRelatedArticleArgs = {
  articleId: string | null;
  eventLabId: string | null;
  isGlobalEvent: boolean;
  viewerLabId?: string | null;
  isAdmin?: boolean;
};

export async function resolveRelatedArticleForEvent({
  articleId,
  eventLabId,
  isGlobalEvent,
  viewerLabId,
  isAdmin = false,
}: ResolveRelatedArticleArgs) {
  if (!articleId) {
    return null;
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      slug: true,
      labId: true,
      isGlobal: true,
    },
  });

  if (!article) {
    throw new Error("Artikel terkait tidak ditemukan.");
  }

  if (!isAdmin) {
    if (!article.isGlobal && article.labId !== viewerLabId) {
      throw new Error("Artikel terkait tidak dapat dipakai oleh akun ini.");
    }
  }

  if (isGlobalEvent) {
    if (!article.isGlobal) {
      throw new Error("Agenda global hanya dapat ditautkan ke artikel global.");
    }

    return article;
  }

  if (!article.isGlobal && article.labId !== eventLabId) {
    throw new Error("Artikel terkait harus berasal dari lab yang sama.");
  }

  return article;
}
