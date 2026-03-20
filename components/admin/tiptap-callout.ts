"use client";

import { mergeAttributes, Node } from "@tiptap/core";

export type CalloutVariant = "info" | "success" | "warning";

export const TipTapCallout = Node.create({
  name: "callout",

  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (element) => element.getAttribute("data-variant") || "info",
        renderHTML: (attributes) => ({
          "data-variant": attributes.variant,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-callout]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const variant = String(HTMLAttributes.variant ?? "info");

    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-callout": "true",
        class: `smartmaps-callout smartmaps-callout--${variant}`,
      }),
      0,
    ];
  },
});
