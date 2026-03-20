import { resolveStoredPhotoUrl } from "@/lib/drive-file";

type ArticleContentProps = {
  html: string;
};

function resolveInlineImageSources(html: string) {
  return html.replace(
    /<img\b([^>]*?)>/gi,
    (match, attributes) => {
      const srcMatch = attributes.match(/\bsrc=(['"])(.*?)\1/i);
      const titleMatch = attributes.match(/\btitle=(['"])(.*?)\1/i);

      if (!srcMatch) {
        return match;
      }

      const resolvedSrc = resolveStoredPhotoUrl(srcMatch[2]);
      const updatedTag = match
        .replace(srcMatch[0], `src=${srcMatch[1]}${resolvedSrc}${srcMatch[1]}`)
        .replace(/\s+title=(['"])(.*?)\1/i, "");

      const caption = titleMatch?.[2]?.trim();

      if (!caption) {
        return updatedTag;
      }

      const escapedCaption = caption
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      return `<figure class="smartmaps-article-figure">${updatedTag}<figcaption class="smartmaps-article-figcaption">${escapedCaption}</figcaption></figure>`;
    }
  );
}

function buildPdfViewerSrc(value: string) {
  const [base] = value.split("#");
  return `${base}#toolbar=0&navpanes=0&view=FitH`;
}

function escapeAttributeValue(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeTextValue(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function linkifyPlainUrls(html: string) {
  const parts = html.split(/(<[^>]+>)/g);
  let anchorDepth = 0;

  return parts
    .map((part) => {
      if (!part) return part;

      if (part.startsWith("<")) {
        if (/^<a\b/i.test(part) && !/^<\/a/i.test(part) && !/\/>$/.test(part)) {
          anchorDepth += 1;
        }

        if (/^<\/a/i.test(part)) {
          anchorDepth = Math.max(0, anchorDepth - 1);
        }

        return part;
      }

      if (anchorDepth > 0) {
        return part;
      }

      return part.replace(/((?:https?:\/\/|www\.)[^\s<]+)/gi, (rawMatch) => {
        let cleanUrl = rawMatch;
        let trailing = "";

        while (/[),.!?;:]$/.test(cleanUrl)) {
          trailing = cleanUrl.slice(-1) + trailing;
          cleanUrl = cleanUrl.slice(0, -1);
        }

        if (!cleanUrl) {
          return rawMatch;
        }

        const href = cleanUrl.startsWith("www.") ? `https://${cleanUrl}` : cleanUrl;

        return `<a href="${escapeAttributeValue(
          href
        )}" target="_blank" rel="noopener noreferrer nofollow">${escapeTextValue(
          cleanUrl
        )}</a>${trailing}`;
      });
    })
    .join("");
}

function renderPdfEmbeds(html: string) {
  return html.replace(
    /<div\b([^>]*?)data-pdf-embed=(['"])true\2([^>]*)>[\s\S]*?<\/div>/gi,
    (match, beforeDataFlag, _quote, afterDataFlag) => {
      const attributes = `${beforeDataFlag}${afterDataFlag}`;
      const srcMatch = attributes.match(/\bdata-src=(['"])(.*?)\1/i);
      const titleMatch = attributes.match(/\bdata-title=(['"])(.*?)\1/i);
      const captionMatch = attributes.match(/\bdata-caption=(['"])(.*?)\1/i);

      if (!srcMatch) {
        return match;
      }

      const resolvedSrc = resolveStoredPhotoUrl(srcMatch[2]);
      const viewerSrc = buildPdfViewerSrc(resolvedSrc);
      const title = titleMatch?.[2]?.trim() || "Dokumen PDF";
      const caption = captionMatch?.[2]?.trim() || "";

      return `<figure class="smartmaps-article-pdf"><div class="smartmaps-article-pdf-head"><span class="smartmaps-article-pdf-badge">PDF</span><strong class="smartmaps-article-pdf-title">${escapeTextValue(
        title
      )}</strong>${
        caption
          ? `<p class="smartmaps-article-pdf-caption">${escapeTextValue(caption)}</p>`
          : ""
      }</div><div class="smartmaps-article-pdf-frame"><iframe src="${escapeAttributeValue(
        viewerSrc
      )}" title="${escapeAttributeValue(
        title
      )}" loading="lazy"></iframe></div><div class="smartmaps-article-pdf-actions"><a href="${escapeAttributeValue(
        resolvedSrc
      )}" target="_blank" rel="noopener noreferrer nofollow">Buka PDF</a></div></figure>`;
    }
  );
}

function wrapConsecutiveImagesInGallery(html: string) {
  return html.replace(
    /((?:\s*(?:<figure\b[\s\S]*?<\/figure>|<img\b[^>]*>)\s*){2,})/gi,
    (match) => {
      const items = match.match(/<figure\b[\s\S]*?<\/figure>|<img\b[^>]*>/gi) ?? [];

      if (items.length < 2) {
        return match;
      }

      const wrappedItems = items
        .map(
          (item) =>
            `<div class="smartmaps-article-gallery-item">${item}</div>`
        )
        .join("");

      return `<div class="smartmaps-article-gallery">${wrappedItems}</div>`;
    }
  );
}

export default function ArticleContent({ html }: ArticleContentProps) {
  const normalizedHtml = renderPdfEmbeds(
    wrapConsecutiveImagesInGallery(linkifyPlainUrls(resolveInlineImageSources(html)))
  );

  return (
    <div
      className="smartmaps-article-content text-[16px] leading-8 text-slate-700 sm:text-[17px]"
      dangerouslySetInnerHTML={{ __html: normalizedHtml }}
    />
  );
}
