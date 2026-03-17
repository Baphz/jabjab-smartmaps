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

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

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

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return NextResponse.json({ error: "ID artikel tidak valid." }, { status: 400 });
  }

  const article = await prisma.article.findUnique({
    where: { id },
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
    return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });
  }

  return NextResponse.json(article);
}

export async function PUT(req: Request, context: RouteContext) {
  const session = await getCurrentClerkSession();
  const { id } = await context.params;

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

  if (!id) {
    return NextResponse.json({ error: "ID artikel tidak valid." }, { status: 400 });
  }

  try {
    const existing = await prisma.article.findUnique({
      where: { id },
      select: {
        id: true,
        labId: true,
        isGlobal: true,
        title: true,
        slug: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });
    }

    if (session.isLabAdmin && (existing.isGlobal || session.labId !== existing.labId)) {
      return NextResponse.json(
        { error: "Forbidden. Akun ini hanya bisa mengelola artikel lab miliknya." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as ArticlePayload;
    const requestedLabId = normalizeText(body.labId);
    const isGlobal = session.isAdmin
      ? parseGlobalFlag(body.isGlobal, existing.isGlobal)
      : false;
    const labId = isGlobal
      ? ""
      : session.isAdmin
        ? requestedLabId || existing.labId || ""
        : existing.labId || "";
    const title = normalizeText(body.title);
    const coverImageUrl = normalizeOptionalText(body.coverImageUrl);
    const contentHtml = String(body.contentHtml ?? "").trim();
    const excerpt = createArticleExcerpt(
      contentHtml,
      normalizeOptionalText(body.excerpt)
    );
    const publishedAtKey = normalizeDateKeyInput(body.publishedAt);
    const isPublished = parsePublishedFlag(body.isPublished, true);

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

    if (!isGlobal && !labId) {
      return NextResponse.json(
        { error: "Laboratorium tujuan wajib dipilih." },
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
      title === existing.title
        ? Promise.resolve(existing.slug)
        : ensureUniqueArticleSlug(title, existing.id),
    ]);

    if (!isGlobal && !lab) {
      return NextResponse.json({ error: "Laboratorium tidak ditemukan." }, { status: 404 });
    }

    if (!publishedAt) {
      return NextResponse.json({ error: "Format tanggal tidak valid." }, { status: 400 });
    }

    const updated = await prisma.article.update({
      where: { id },
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/articles/[id] error:", error);

    const message =
      error instanceof Error ? error.message : "Gagal memperbarui artikel.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await getCurrentClerkSession();
  const { id } = await context.params;

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

  if (!id) {
    return NextResponse.json({ error: "ID artikel tidak valid." }, { status: 400 });
  }

  const existing = await prisma.article.findUnique({
    where: { id },
    select: {
      id: true,
      labId: true,
      isGlobal: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });
  }

  if (session.isLabAdmin && (existing.isGlobal || session.labId !== existing.labId)) {
    return NextResponse.json(
      { error: "Forbidden. Akun ini hanya bisa menghapus artikel lab miliknya." },
      { status: 403 }
    );
  }

  await prisma.article.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
