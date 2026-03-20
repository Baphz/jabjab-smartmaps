"use client";

import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BgColorsOutlined,
  BoldOutlined,
  ClearOutlined,
  DeleteOutlined,
  EditOutlined,
  FilePdfOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PictureOutlined,
  PlusOutlined,
  RedoOutlined,
  TableOutlined,
  UndoOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import Heading from "@tiptap/extension-heading";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button, Input, Modal, Select, Spin, message } from "antd";
import { useEffect, useRef, useState } from "react";
import { type CalloutVariant, TipTapCallout } from "@/components/admin/tiptap-callout";
import { TipTapPdfEmbed } from "@/components/admin/tiptap-pdf-embed";
import { prepareImageForUpload } from "@/lib/client-image-upload";
import { resolveStoredPhotoUrl } from "@/lib/drive-file";

type ArticleRichTextEditorProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  uploadLabId?: string | null;
  disabled?: boolean;
};

function resolveInlineImageSources(html: string) {
  return html.replace(
    /<img\b([^>]*?)\bsrc=(['"])(.*?)\2([^>]*)>/gi,
    (_match, beforeSrc, quote, src, afterSrc) => {
      const resolvedSrc = resolveStoredPhotoUrl(src);
      return `<img${beforeSrc}src=${quote}${resolvedSrc}${quote}${afterSrc}>`;
    }
  );
}

function normalizeLinkUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function ToolbarButton({
  active = false,
  disabled = false,
  title,
  onClick,
  icon,
}: {
  active?: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Button
      type={active ? "primary" : "default"}
      size="small"
      disabled={disabled}
      title={title}
      onClick={onClick}
      icon={icon}
    />
  );
}

function AlignJustifyIcon() {
  return (
    <span className="inline-flex h-[14px] w-[14px] items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 14 14" width="14" height="14" fill="none">
        <path
          d="M1.5 3h11M1.5 5.8h11M1.5 8.6h11M1.5 11.4h11"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function QuoteIcon() {
  return (
    <span className="inline-flex h-[14px] w-[14px] items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 14 14" width="14" height="14" fill="none">
        <path
          d="M3.4 4.2c-.93.44-1.72 1.32-1.72 2.65 0 1.5 1.07 2.45 2.33 2.45 1.3 0 2.18-.95 2.18-2.24 0-1.03-.6-1.83-1.55-2.18.22-.62.72-1.1 1.44-1.46l-.42-.86c-.9.31-1.69.77-2.26 1.64Zm5.1 0c-.93.44-1.72 1.32-1.72 2.65 0 1.5 1.07 2.45 2.33 2.45 1.3 0 2.18-.95 2.18-2.24 0-1.03-.6-1.83-1.55-2.18.22-.62.72-1.1 1.44-1.46l-.42-.86c-.9.31-1.69.77-2.26 1.64Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

function findActiveNodePos(editor: NonNullable<ReturnType<typeof useEditor>>, nodeName: string) {
  const { $from } = editor.state.selection;

  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === nodeName) {
      return depth === 0 ? 0 : $from.before(depth);
    }
  }

  return null;
}

export default function ArticleRichTextEditor({
  value,
  onChange,
  placeholder = "Tulis isi artikel di sini...",
  uploadLabId,
  disabled = false,
}: ArticleRichTextEditorProps) {
  const onChangeRef = useRef<(value: string) => void>(onChange ?? (() => {}));
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const pdfUploadModeRef = useRef<"insert" | "replace">("insert");
  const selectedImagePosRef = useRef<number | null>(null);
  const selectedPdfPosRef = useRef<number | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [isPdfSelected, setIsPdfSelected] = useState(false);
  const [selectedImageCaption, setSelectedImageCaption] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("Dokumen PDF");
  const [selectedPdfCaption, setSelectedPdfCaption] = useState("");
  const [captionDraft, setCaptionDraft] = useState("");
  const [isCaptionModalOpen, setIsCaptionModalOpen] = useState(false);
  const [pdfTitleDraft, setPdfTitleDraft] = useState("");
  const [pdfCaptionDraft, setPdfCaptionDraft] = useState("");
  const [isPdfMetaModalOpen, setIsPdfMetaModalOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    onChangeRef.current = onChange ?? (() => {});
  }, [onChange]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: false,
          blockquote: {},
          codeBlock: false,
          horizontalRule: false,
          link: {
            openOnClick: false,
            autolink: true,
            defaultProtocol: "https",
          },
          underline: {},
        }),
        Heading.configure({
          levels: [1, 2, 3],
        }),
        Image.configure({
          inline: false,
          allowBase64: false,
        }),
        TipTapCallout,
        TipTapPdfEmbed,
        Table.configure({
          resizable: true,
          lastColumnResizable: false,
        }),
        TableRow,
        TableHeader,
        TableCell,
        Placeholder.configure({
          placeholder,
        }),
        TextAlign.configure({
          types: ["heading", "paragraph", "image"],
          alignments: ["left", "center", "right", "justify"],
          defaultAlignment: "left",
        }),
      ],
      content: resolveInlineImageSources(value || ""),
      editorProps: {
        attributes: {
          class:
            "smartmaps-article-editor-content min-h-[340px] px-4 py-4 text-[14px] leading-7 text-slate-700 outline-none",
        },
      },
      onUpdate: ({ editor }) => {
        onChangeRef.current(editor.getHTML());
      },
    },
    []
  );

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const nextContent = resolveInlineImageSources(value || "");
    if (nextContent !== current) {
      editor.commands.setContent(nextContent, { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;

    const syncSelectionState = () => {
      const active = editor.isActive("image");

      if (!active && isCaptionModalOpen && selectedImagePosRef.current !== null) {
        setIsImageSelected(true);
      } else {
        setIsImageSelected(active);

        if (!active) {
          selectedImagePosRef.current = null;
          setSelectedImageCaption("");
        } else {
          selectedImagePosRef.current = editor.state.selection.from;
          const attrs = editor.getAttributes("image") as { title?: string | null };
          setSelectedImageCaption(String(attrs.title ?? ""));
        }
      }

      const pdfPos = findActiveNodePos(editor, "pdfEmbed");
      const pdfActive = pdfPos !== null;

      if (!pdfActive && isPdfMetaModalOpen && selectedPdfPosRef.current !== null) {
        setIsPdfSelected(true);
        return;
      }

      setIsPdfSelected(pdfActive);

      if (!pdfActive) {
        selectedPdfPosRef.current = null;
        setSelectedPdfTitle("Dokumen PDF");
        setSelectedPdfCaption("");
        return;
      }

      selectedPdfPosRef.current = pdfPos;
      const pdfNode = editor.state.doc.nodeAt(pdfPos);
      setSelectedPdfTitle(String(pdfNode?.attrs?.title ?? "Dokumen PDF"));
      setSelectedPdfCaption(String(pdfNode?.attrs?.caption ?? ""));
    };

    syncSelectionState();
    editor.on("selectionUpdate", syncSelectionState);

    return () => {
      editor.off("selectionUpdate", syncSelectionState);
    };
  }, [editor, isCaptionModalOpen, isPdfMetaModalOpen]);

  if (!editor) {
    return (
      <>
        {contextHolder}

        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
          <div className="flex min-h-80 items-center justify-center text-slate-400">
            <Spin description="Memuat editor..." />
          </div>
        </div>
      </>
    );
  }

  async function handleImageUpload(file: File) {
    if (disabled || isUploadingImage) {
      return;
    }

    setIsUploadingImage(true);

    try {
      const preparedFile = await prepareImageForUpload(file);
      const formData = new FormData();
      formData.append("file", preparedFile);
      formData.append("kind", "article-inline");
      formData.append("bucket", "article");

      if (uploadLabId) {
        formData.append("labId", uploadLabId);
      }

      const res = await fetch("/api/uploads/image", {
        method: "POST",
        body: formData,
      });

      const payload = (await res.json()) as {
        error?: string;
        fileId?: string;
        previewUrl?: string;
      };

      if (!res.ok || !payload.fileId) {
        throw new Error(payload.error ?? "Gagal upload gambar artikel.");
      }

      if (!editor) {
        throw new Error("Editor belum siap.");
      }

      editor
        .chain()
        .focus()
        .setImage({
          src: payload.previewUrl ?? payload.fileId,
          alt: preparedFile.name,
        })
        .run();
      messageApi.success("Gambar berhasil dimasukkan ke artikel.");
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Terjadi kesalahan upload gambar.";
      messageApi.error(detail);
    } finally {
      setIsUploadingImage(false);

      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  async function handlePdfUpload(file: File) {
    if (disabled || isUploadingPdf) {
      return;
    }

    setIsUploadingPdf(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "article-pdf");
      formData.append("bucket", "article");

      if (uploadLabId) {
        formData.append("labId", uploadLabId);
      }

      const res = await fetch("/api/uploads/file", {
        method: "POST",
        body: formData,
      });

      const payload = (await res.json()) as {
        error?: string;
        fileId?: string;
        previewUrl?: string;
      };

      if (!res.ok || !payload.fileId) {
        throw new Error(payload.error ?? "Gagal upload PDF artikel.");
      }

      if (!editor) {
        throw new Error("Editor belum siap.");
      }

      const nextTitle = file.name.replace(/\.pdf$/i, "") || "Dokumen PDF";
      const nextSrc = payload.previewUrl ?? payload.fileId;

      if (pdfUploadModeRef.current === "replace" && selectedPdfPosRef.current !== null) {
        const pdfNode = editor.state.doc.nodeAt(selectedPdfPosRef.current);

        if (!pdfNode || pdfNode.type.name !== "pdfEmbed") {
          throw new Error("Blok PDF yang dipilih tidak ditemukan.");
        }

        const transaction = editor.state.tr.setNodeMarkup(
          selectedPdfPosRef.current,
          undefined,
          {
            ...pdfNode.attrs,
            src: nextSrc,
            title: nextTitle,
            caption: String(pdfNode.attrs.caption ?? ""),
          }
        );

        editor.view.dispatch(transaction);
        setSelectedPdfTitle(nextTitle);
        messageApi.success("PDF berhasil diganti.");
      } else {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "pdfEmbed",
            attrs: {
              src: nextSrc,
              title: nextTitle,
              caption: "",
            },
          })
          .run();

        messageApi.success("PDF berhasil dimasukkan ke artikel.");
      }
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Terjadi kesalahan upload PDF.";
      messageApi.error(detail);
    } finally {
      setIsUploadingPdf(false);
      pdfUploadModeRef.current = "insert";

      if (pdfInputRef.current) {
        pdfInputRef.current.value = "";
      }
    }
  }

  function updateSelectedImageCaption(nextCaption: string) {
    if (!editor) return;

    const imagePos = selectedImagePosRef.current;
    if (imagePos === null) return;

    const imageNode = editor.state.doc.nodeAt(imagePos);

    if (!imageNode || imageNode.type.name !== "image") {
      return;
    }

    const transaction = editor.state.tr.setNodeMarkup(imagePos, undefined, {
      ...imageNode.attrs,
      title: nextCaption.trim() || null,
    });

    editor.view.dispatch(transaction);
  }

  function openCaptionModal() {
    if (!isImageSelected || selectedImagePosRef.current === null) {
      return;
    }

    setCaptionDraft(selectedImageCaption);
    setIsCaptionModalOpen(true);
  }

  function closeCaptionModal() {
    setIsCaptionModalOpen(false);

    if (!editor || !editor.isActive("image")) {
      selectedImagePosRef.current = null;
      setIsImageSelected(false);
      setSelectedImageCaption("");
    }
  }

  function updateSelectedPdfMeta(nextTitle: string, nextCaption: string) {
    if (!editor) return;

    const pdfPos = selectedPdfPosRef.current;
    if (pdfPos === null) return;

    const pdfNode = editor.state.doc.nodeAt(pdfPos);

    if (!pdfNode || pdfNode.type.name !== "pdfEmbed") {
      return;
    }

    const transaction = editor.state.tr.setNodeMarkup(pdfPos, undefined, {
      ...pdfNode.attrs,
      title: nextTitle.trim() || "Dokumen PDF",
      caption: nextCaption.trim() || "",
    });

    editor.view.dispatch(transaction);
  }

  function openPdfMetaModal() {
    if (!isPdfSelected || selectedPdfPosRef.current === null) {
      return;
    }

    setPdfTitleDraft(selectedPdfTitle);
    setPdfCaptionDraft(selectedPdfCaption);
    setIsPdfMetaModalOpen(true);
  }

  function closePdfMetaModal() {
    setIsPdfMetaModalOpen(false);

    if (!editor || findActiveNodePos(editor, "pdfEmbed") === null) {
      selectedPdfPosRef.current = null;
      setIsPdfSelected(false);
      setSelectedPdfTitle("Dokumen PDF");
      setSelectedPdfCaption("");
    }
  }

  function replaceSelectedPdf() {
    if (!isPdfSelected || selectedPdfPosRef.current === null) {
      return;
    }

    pdfUploadModeRef.current = "replace";
    pdfInputRef.current?.click();
  }

  function removeSelectedPdf() {
    if (!editor) return;

    const pdfPos = selectedPdfPosRef.current;
    if (pdfPos === null) return;

    const pdfNode = editor.state.doc.nodeAt(pdfPos);
    if (!pdfNode || pdfNode.type.name !== "pdfEmbed") {
      return;
    }

    const transaction = editor.state.tr.delete(
      pdfPos,
      pdfPos + pdfNode.nodeSize
    );

    editor.view.dispatch(transaction);
    selectedPdfPosRef.current = null;
    setIsPdfSelected(false);
    setSelectedPdfTitle("Dokumen PDF");
    setSelectedPdfCaption("");
    setIsPdfMetaModalOpen(false);
    messageApi.success("PDF berhasil dihapus dari artikel.");
  }

  function openLinkModal() {
    if (!editor) return;

    const href = String((editor.getAttributes("link") as { href?: string | null }).href ?? "");
    setLinkDraft(href);
    setIsLinkModalOpen(true);
  }

  function closeLinkModal() {
    setIsLinkModalOpen(false);
    setLinkDraft("");
  }

  function saveLink() {
    if (!editor) return;

    const href = normalizeLinkUrl(linkDraft);

    if (!href) {
      messageApi.warning("Masukkan URL tautan terlebih dahulu.");
      return;
    }

    const { from, empty } = editor.state.selection;

    if (empty && !editor.isActive("link")) {
      const text = href;
      editor
        .chain()
        .focus()
        .insertContent(text)
        .setTextSelection({ from, to: from + text.length })
        .setLink({
          href,
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        })
        .run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({
          href,
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        })
        .run();
    }

    closeLinkModal();
  }

  function removeLink() {
    if (!editor) return;

    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    closeLinkModal();
  }

  function insertCallout(variant: CalloutVariant = "info") {
    if (!editor) return;

    editor
      .chain()
      .focus()
      .insertContent({
        type: "callout",
        attrs: { variant },
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Tulis informasi penting di sini." }],
          },
        ],
      })
      .run();
  }

  function getActiveCalloutVariant(): CalloutVariant {
    if (!editor) return "info";

    const calloutPos = findActiveNodePos(editor, "callout");
    const activeNode = calloutPos !== null ? editor.state.doc.nodeAt(calloutPos) : null;
    const variant = String(activeNode?.attrs?.variant ?? "info");

    if (variant === "success" || variant === "warning") {
      return variant;
    }

    return "info";
  }

  function updateCalloutVariant(variant: CalloutVariant) {
    if (!editor) return;

    const calloutPos = findActiveNodePos(editor, "callout");
    if (calloutPos === null) return;

    const activeNode = editor.state.doc.nodeAt(calloutPos);
    if (!activeNode || activeNode.type.name !== "callout") {
      return;
    }

    const transaction = editor.state.tr.setNodeMarkup(calloutPos, undefined, {
      ...activeNode.attrs,
      variant,
    });

    editor.view.dispatch(transaction);
  }

  function removeActiveCallout() {
    if (!editor) return;

    const calloutPos = findActiveNodePos(editor, "callout");
    if (calloutPos === null) return;

    const activeNode = editor.state.doc.nodeAt(calloutPos);
    if (!activeNode || activeNode.type.name !== "callout") {
      return;
    }

    const transaction = editor.state.tr.replaceWith(
      calloutPos,
      calloutPos + activeNode.nodeSize,
      activeNode.content
    );

    editor.view.dispatch(transaction);
  }

  const headingValue = editor.isActive("heading", { level: 1 })
    ? "h1"
    : editor.isActive("heading", { level: 2 })
    ? "h2"
    : editor.isActive("heading", { level: 3 })
    ? "h3"
    : "paragraph";

  return (
    <>
      {contextHolder}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleImageUpload(file);
          }
        }}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handlePdfUpload(file);
          }
        }}
      />

      <div className="smartmaps-article-editor-shell rounded-[18px] border border-slate-200 bg-white">
        <div className="smartmaps-article-editor-toolbar flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
          <ToolbarButton
            title="Undo"
            disabled={disabled || !editor.can().chain().focus().undo().run()}
            onClick={() => editor.chain().focus().undo().run()}
            icon={<UndoOutlined />}
          />
          <ToolbarButton
            title="Redo"
            disabled={disabled || !editor.can().chain().focus().redo().run()}
            onClick={() => editor.chain().focus().redo().run()}
            icon={<RedoOutlined />}
          />

          <Select
            size="small"
            value={headingValue}
            style={{ width: 120 }}
            disabled={disabled}
            onChange={(nextValue) => {
              const chain = editor.chain().focus();

              if (nextValue === "paragraph") chain.setParagraph().run();
              if (nextValue === "h1") chain.setHeading({ level: 1 }).run();
              if (nextValue === "h2") chain.setHeading({ level: 2 }).run();
              if (nextValue === "h3") chain.setHeading({ level: 3 }).run();
            }}
            options={[
              { value: "paragraph", label: "Paragraf" },
              { value: "h1", label: "Judul 1" },
              { value: "h2", label: "Judul 2" },
              { value: "h3", label: "Judul 3" },
            ]}
          />

          <ToolbarButton
            title="Bold"
            disabled={disabled}
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            icon={<BoldOutlined />}
          />
          <ToolbarButton
            title="Italic"
            disabled={disabled}
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            icon={<ItalicOutlined />}
          />
          <ToolbarButton
            title="Underline"
            disabled={disabled}
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            icon={<UnderlineOutlined />}
          />
          <ToolbarButton
            title="Tautan"
            disabled={disabled}
            active={editor.isActive("link")}
            onClick={openLinkModal}
            icon={<LinkOutlined />}
          />
          <ToolbarButton
            title="Blockquote"
            disabled={disabled}
            active={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            icon={<QuoteIcon />}
          />
          <ToolbarButton
            title="Callout"
            disabled={disabled}
            active={editor.isActive("callout")}
            onClick={() => insertCallout()}
            icon={<BgColorsOutlined />}
          />
          {editor.isActive("callout") ? (
            <>
              <Select
                size="small"
                value={getActiveCalloutVariant()}
                style={{ width: 112 }}
                disabled={disabled}
                onChange={(nextValue) => updateCalloutVariant(nextValue as CalloutVariant)}
                options={[
                  { value: "info", label: "Info" },
                  { value: "success", label: "Sukses" },
                  { value: "warning", label: "Penting" },
                ]}
              />
              <Button
                size="small"
                danger
                disabled={disabled}
                onClick={removeActiveCallout}
              >
                Lepas
              </Button>
            </>
          ) : null}
          <ToolbarButton
            title="Rata kiri"
            disabled={disabled}
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            icon={<AlignLeftOutlined />}
          />
          <ToolbarButton
            title="Rata tengah"
            disabled={disabled}
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            icon={<AlignCenterOutlined />}
          />
          <ToolbarButton
            title="Rata kanan"
            disabled={disabled}
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            icon={<AlignRightOutlined />}
          />
          <ToolbarButton
            title="Rata kiri-kanan"
            disabled={disabled}
            active={editor.isActive({ textAlign: "justify" })}
            onClick={() => editor.chain().focus().setTextAlign("justify").run()}
            icon={<AlignJustifyIcon />}
          />
          <ToolbarButton
            title="Bullet list"
            disabled={disabled}
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            icon={<UnorderedListOutlined />}
          />
          <ToolbarButton
            title="Ordered list"
            disabled={disabled}
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            icon={<OrderedListOutlined />}
          />
          <ToolbarButton
            title="Upload gambar"
            disabled={disabled || isUploadingImage}
            onClick={() => imageInputRef.current?.click()}
            icon={<PictureOutlined />}
          />
          <ToolbarButton
            title="Sisipkan PDF"
            disabled={disabled || isUploadingPdf}
            onClick={() => {
              pdfUploadModeRef.current = "insert";
              pdfInputRef.current?.click();
            }}
            icon={<FilePdfOutlined />}
          />
          {isPdfSelected ? (
            <>
              <ToolbarButton
                title="Detail PDF"
                disabled={disabled}
                active={isPdfMetaModalOpen}
                onClick={openPdfMetaModal}
                icon={<EditOutlined />}
              />
              <Button
                size="small"
                disabled={disabled || isUploadingPdf}
                onClick={replaceSelectedPdf}
              >
                Ganti PDF
              </Button>
              <Button
                size="small"
                danger
                disabled={disabled}
                onClick={removeSelectedPdf}
                icon={<DeleteOutlined />}
              >
                Hapus PDF
              </Button>
            </>
          ) : null}
          <ToolbarButton
            title="Tabel"
            disabled={disabled}
            active={editor.isActive("table")}
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            icon={<TableOutlined />}
          />
          {editor.isActive("table") ? (
            <>
              <Button
                size="small"
                disabled={disabled}
                icon={<PlusOutlined />}
                onClick={() => editor.chain().focus().addRowAfter().run()}
              >
                Baris
              </Button>
              <Button
                size="small"
                disabled={disabled}
                icon={<PlusOutlined />}
                onClick={() => editor.chain().focus().addColumnAfter().run()}
              >
                Kolom
              </Button>
              <Button
                size="small"
                disabled={disabled}
                onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              >
                Header
              </Button>
              <Button
                size="small"
                danger
                disabled={disabled}
                icon={<DeleteOutlined />}
                onClick={() => editor.chain().focus().deleteTable().run()}
              >
                Hapus
              </Button>
            </>
          ) : null}
          <ToolbarButton
            title="Caption gambar"
            disabled={disabled || !isImageSelected}
            active={isCaptionModalOpen}
            onClick={openCaptionModal}
            icon={<EditOutlined />}
          />
          <ToolbarButton
            title="Clear formatting"
            disabled={disabled}
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            icon={<ClearOutlined />}
          />
        </div>

        <div className="smartmaps-article-editor-body">
          <EditorContent editor={editor} />
        </div>
      </div>

      <Modal
        open={isCaptionModalOpen}
        title="Caption gambar"
        okText="Simpan"
        cancelText="Batal"
        onCancel={closeCaptionModal}
        onOk={() => {
          updateSelectedImageCaption(captionDraft);
          setSelectedImageCaption(captionDraft);
          closeCaptionModal();
        }}
      >
        <Input
          autoFocus
          value={captionDraft}
          placeholder="Tulis caption untuk gambar yang dipilih"
          onChange={(event) => setCaptionDraft(event.target.value)}
        />
      </Modal>

      <Modal
        open={isPdfMetaModalOpen}
        title="Detail PDF"
        okText="Simpan"
        cancelText="Batal"
        onCancel={closePdfMetaModal}
        onOk={() => {
          updateSelectedPdfMeta(pdfTitleDraft, pdfCaptionDraft);
          setSelectedPdfTitle(pdfTitleDraft.trim() || "Dokumen PDF");
          setSelectedPdfCaption(pdfCaptionDraft.trim());
          closePdfMetaModal();
        }}
      >
        <div className="flex flex-col gap-3">
          <Input
            autoFocus
            value={pdfTitleDraft}
            placeholder="Judul PDF"
            onChange={(event) => setPdfTitleDraft(event.target.value)}
          />
          <Input.TextArea
            value={pdfCaptionDraft}
            placeholder="Caption PDF (opsional)"
            autoSize={{ minRows: 3, maxRows: 6 }}
            onChange={(event) => setPdfCaptionDraft(event.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={isLinkModalOpen}
        title="Tautan artikel"
        okText="Simpan"
        cancelText="Batal"
        onCancel={closeLinkModal}
        onOk={saveLink}
        footer={[
          editor.isActive("link") ? (
            <Button key="unlink" danger onClick={removeLink}>
              Hapus tautan
            </Button>
          ) : null,
          <Button key="cancel" onClick={closeLinkModal}>
            Batal
          </Button>,
          <Button key="submit" type="primary" onClick={saveLink}>
            Simpan
          </Button>,
        ]}
      >
        <Input
          autoFocus
          value={linkDraft}
          placeholder="https://contoh.com/artikel"
          onChange={(event) => setLinkDraft(event.target.value)}
        />
      </Modal>

      <style jsx global>{`
        .smartmaps-article-editor-content p {
          margin: 0 0 0.9rem;
        }
        .smartmaps-article-editor-content p:last-child {
          margin-bottom: 0;
        }
        .smartmaps-article-editor-content h1,
        .smartmaps-article-editor-content h2,
        .smartmaps-article-editor-content h3 {
          margin: 1.1rem 0 0.65rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.3;
        }
        .smartmaps-article-editor-content h1 {
          font-size: 1.5rem;
        }
        .smartmaps-article-editor-content h2 {
          font-size: 1.25rem;
        }
        .smartmaps-article-editor-content h3 {
          font-size: 1.1rem;
        }
        .smartmaps-article-editor-content ul,
        .smartmaps-article-editor-content ol {
          margin: 0 0 1rem;
          padding-left: 1.3rem;
        }
        .smartmaps-article-editor-content blockquote {
          margin: 1rem 0;
          padding: 0.9rem 1rem;
          border-left: 4px solid #2563eb;
          border-radius: 0 16px 16px 0;
          background: linear-gradient(180deg, rgba(239, 246, 255, 0.92), rgba(248, 250, 252, 0.96));
          color: #334155;
        }
        .smartmaps-article-editor-content .smartmaps-callout {
          margin: 1rem 0;
          padding: 1rem 1rem 0.15rem;
          border-radius: 18px;
          border: 1px solid rgba(191, 219, 254, 0.92);
          background: rgba(239, 246, 255, 0.84);
        }
        .smartmaps-article-editor-content .smartmaps-callout--success {
          border-color: rgba(110, 231, 183, 0.9);
          background: rgba(220, 252, 231, 0.84);
        }
        .smartmaps-article-editor-content .smartmaps-callout--warning {
          border-color: rgba(252, 211, 77, 0.9);
          background: rgba(254, 243, 199, 0.88);
        }
        .smartmaps-article-editor-content table {
          width: 100%;
          margin: 1rem 0;
          border-collapse: collapse;
          table-layout: fixed;
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid rgba(226, 232, 240, 0.92);
        }
        .smartmaps-article-editor-content th,
        .smartmaps-article-editor-content td {
          min-width: 96px;
          padding: 0.7rem 0.8rem;
          border: 1px solid rgba(226, 232, 240, 0.92);
          vertical-align: top;
        }
        .smartmaps-article-editor-content th {
          background: rgba(239, 246, 255, 0.86);
          color: #0f172a;
          font-weight: 700;
        }
        .smartmaps-article-editor-content img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 1rem 0;
          border-radius: 16px;
        }
        .smartmaps-article-editor-content [data-pdf-embed] {
          position: relative;
          display: block;
          margin: 1rem 0;
          border-radius: 18px;
          border: 1px solid rgba(96, 165, 250, 0.28);
          background: linear-gradient(180deg, rgba(239, 246, 255, 0.92), rgba(255, 255, 255, 0.98));
          padding: 1rem 1rem 0.95rem;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
        }
        .smartmaps-article-editor-content .smartmaps-pdf-embed-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 22px;
          border-radius: 999px;
          border: 1px solid rgba(59, 130, 246, 0.22);
          background: #eef4ff;
          padding: 0 9px;
          font-size: 10px;
          font-weight: 800;
          line-height: 1;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #1d4ed8;
        }
        .smartmaps-article-editor-content .smartmaps-pdf-embed-title {
          display: block;
          margin-top: 0.75rem;
          font-size: 14px;
          line-height: 1.55;
          font-weight: 700;
          color: #0f172a;
          white-space: normal;
          overflow-wrap: anywhere;
        }
        .smartmaps-article-editor-content .smartmaps-pdf-embed-caption {
          margin: 0.42rem 0 0;
          font-size: 12px;
          line-height: 1.6;
          color: #64748b;
          white-space: normal;
          overflow-wrap: anywhere;
        }
        html.theme-dark .smartmaps-article-editor-content [data-pdf-embed] {
          border-color: rgba(125, 172, 255, 0.22);
          background: linear-gradient(180deg, rgba(19, 35, 61, 0.98), rgba(15, 23, 42, 0.98));
          box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.08);
        }
        html.theme-dark .smartmaps-article-editor-content .smartmaps-pdf-embed-badge {
          border-color: rgba(125, 172, 255, 0.28);
          background: rgba(39, 68, 116, 0.86);
          color: #dbeafe;
        }
        html.theme-dark .smartmaps-article-editor-content .smartmaps-pdf-embed-title {
          color: #e8f1fd;
        }
        html.theme-dark .smartmaps-article-editor-content .smartmaps-pdf-embed-caption {
          color: #a6b6cc;
        }
        .smartmaps-article-editor-content img[style*="text-align: center"] {
          margin-left: auto;
          margin-right: auto;
        }
        .smartmaps-article-editor-content img[style*="text-align: right"] {
          margin-left: auto;
        }
        .smartmaps-article-editor-content [style*="text-align: center"] img {
          margin-left: auto;
          margin-right: auto;
        }
        .smartmaps-article-editor-content [style*="text-align: right"] img {
          margin-left: auto;
        }
        .smartmaps-article-editor-content li {
          margin: 0.2rem 0;
        }
        .smartmaps-article-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #94a3b8;
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </>
  );
}
