"use client";

import { mergeAttributes, Node } from "@tiptap/core";

export const TipTapPdfEmbed = Node.create({
  name: "pdfEmbed",

  group: "block",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-src") || "",
        renderHTML: (attributes) => ({
          "data-src": attributes.src,
        }),
      },
      title: {
        default: "Dokumen PDF",
        parseHTML: (element) => element.getAttribute("data-title") || "Dokumen PDF",
        renderHTML: (attributes) => ({
          "data-title": attributes.title || "Dokumen PDF",
        }),
      },
      caption: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-caption") || "",
        renderHTML: (attributes) => ({
          "data-caption": attributes.caption || "",
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-pdf-embed]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const title = String(HTMLAttributes.title ?? "Dokumen PDF");
    const caption = String(HTMLAttributes.caption ?? "").trim();

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-pdf-embed": "true",
        class: "smartmaps-pdf-embed",
        contenteditable: "false",
      }),
      ["span", { class: "smartmaps-pdf-embed-badge" }, "PDF"],
      ["strong", { class: "smartmaps-pdf-embed-title" }, title],
      ...(caption
        ? [["p", { class: "smartmaps-pdf-embed-caption" }, caption] as const]
        : []),
    ];
  },
});
