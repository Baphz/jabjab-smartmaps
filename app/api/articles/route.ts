import { NextResponse } from "next/server";
import { getCurrentClerkSession } from "@/lib/clerk-auth";
import {
  dateKeyToUtcDate,
  normalizeDateKeyInput,
  normalizeOptionalText,
  normalizeText,
} from "@/lib/activity-server";
import {
  createArticleExcerpt,
  ensureUniqueArticleSlug,
  stripHtmlTags,
} from "@/lib/articles";
import { prisma } from "@/lib/prisma";

type ArticlePayload = {
  labId?: string;
  isGlobal?: boolean;
  title?: string;
  excerpt?: string;
  coverImageUrl?: string;
  contentHtml?: string;
  publishedAt?: string;
  isPublished?: boolean;
};

function parsePublishedFlag(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function parseGlobalFlag(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const labId = normalizeText(url.searchParams.get("labId"));
  const publishedOnly = url.searchParams.get("published") !== "0";

  const articles = await prisma.article.findMany({
    where: {
      ...(labId ? { OR: [{ labId }, { isGlobal: true }] } : null),
      ...(publishedOnly ? { isPublished: true } : null),
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

  return NextResponse.json(articles);
}

export async function POST(req: Request) {
  const session = await getCurrentClerkSession();

  if (!session.userId) {
    return NextResponse.json(
      { error: "Unauthorized. Silakan login terlebih dahulu." },
      { status: 401 }
    );
  }

  if (!session.canAccessDashboard) {
    return NextResponse.json(
      { error: "Forbidden. Akun ini tidak memiliki akses dashboard." },
      { status: 403 }
    );
  }

  try {
    const body = (await req.json()) as ArticlePayload;
    const requestedLabId = normalizeText(body.labId);
    const isGlobal = session.isAdmin ? parseGlobalFlag(body.isGlobal, false) : false;
    const labId = isGlobal ? "" : session.isAdmin ? requestedLabId : session.labId ?? "";
    const title = normalizeText(body.title);
    const coverImageUrl = normalizeOptionalText(body.coverImageUrl);
    const contentHtml = String(body.contentHtml ?? "").trim();
    const excerpt = createArticleExcerpt(
      contentHtml,
      normalizeOptionalText(body.excerpt)
    );
    const publishedAtKey = normalizeDateKeyInput(body.publishedAt);
    const isPublished = parsePublishedFlag(body.isPublished, true);

    if (!isGlobal && !labId) {
      return NextResponse.json(
        { error: "Laboratorium tujuan wajib dipilih." },
        { status: 400 }
      );
    }

    if (session.isLabAdmin && session.labId !== labId) {
      return NextResponse.json(
        { error: "Forbidden. Akun ini hanya bisa menulis artikel lab miliknya." },
        { status: 403 }
      );
    }

    if (!title) {
      return NextResponse.json({ error: "Judul artikel wajib diisi." }, { status: 400 });
    }

    if (!stripHtmlTags(contentHtml)) {
      return NextResponse.json({ error: "Isi artikel wajib diisi." }, { status: 400 });
    }

    if (!publishedAtKey) {
      return NextResponse.json(
        { error: "Tanggal terbit artikel wajib diisi." },
        { status: 400 }
      );
    }

    const [lab, publishedAt, slug] = await Promise.all([
      isGlobal
        ? Promise.resolve(null)
        : prisma.lab.findUnique({
            where: { id: labId },
            select: { id: true },
          }),
      Promise.resolve(dateKeyToUtcDate(publishedAtKey)),
      ensureUniqueArticleSlug(title),
    ]);

    if (!isGlobal && !lab) {
      return NextResponse.json({ error: "Laboratorium tidak ditemukan." }, { status: 404 });
    }

    if (!publishedAt) {
      return NextResponse.json({ error: "Format tanggal tidak valid." }, { status: 400 });
    }

    const created = await prisma.article.create({
      data: {
        labId: isGlobal ? null : labId,
        isGlobal,
        title,
        slug,
        excerpt,
        contentHtml,
        coverImageUrl,
        isPublished,
        publishedAt,
        createdByUserId: session.userId,
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

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/articles error:", error);

    const message =
      error instanceof Error ? error.message : "Gagal membuat artikel baru.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
