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

export default function ArticleContent({ html }: ArticleContentProps) {
  return (
    <div
      className="smartmaps-article-content text-[15px] leading-8 text-slate-700"
      dangerouslySetInnerHTML={{ __html: resolveInlineImageSources(html) }}
    />
  );
}
