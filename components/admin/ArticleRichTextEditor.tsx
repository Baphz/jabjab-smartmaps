"use client";

import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  ClearOutlined,
  ItalicOutlined,
  OrderedListOutlined,
  PictureOutlined,
  RedoOutlined,
  UndoOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import Heading from "@tiptap/extension-heading";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button, Input, Select, Spin, message } from "antd";
import { useEffect, useRef, useState } from "react";
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

export default function ArticleRichTextEditor({
  value,
  onChange,
  placeholder = "Tulis isi artikel di sini...",
  uploadLabId,
  disabled = false,
}: ArticleRichTextEditorProps) {
  const onChangeRef = useRef<(value: string) => void>(onChange ?? (() => {}));
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isImageSelected, setIsImageSelected] = useState(false);
  const [selectedImageCaption, setSelectedImageCaption] = useState("");
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
          blockquote: false,
          codeBlock: false,
          horizontalRule: false,
          underline: {},
        }),
        Heading.configure({
          levels: [1, 2, 3],
        }),
        Image.configure({
          inline: false,
          allowBase64: false,
        }),
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

    const syncSelectedImageState = () => {
      const active = editor.isActive("image");
      setIsImageSelected(active);

      if (!active) {
        setSelectedImageCaption("");
        return;
      }

      const attrs = editor.getAttributes("image") as { title?: string | null };
      setSelectedImageCaption(String(attrs.title ?? ""));
    };

    syncSelectedImageState();
    editor.on("selectionUpdate", syncSelectedImageState);

    return () => {
      editor.off("selectionUpdate", syncSelectedImageState);
    };
  }, [editor]);

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

      <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5">
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
            icon={<span className="text-[11px] font-semibold leading-none">J</span>}
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
            title="Clear formatting"
            disabled={disabled}
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            icon={<ClearOutlined />}
          />
        </div>

        {isImageSelected ? (
          <div className="border-b border-slate-200 bg-white px-3 py-2.5">
            <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
              Caption Gambar
            </div>
            <Input
              size="small"
              disabled={disabled}
              value={selectedImageCaption}
              placeholder="Tulis caption untuk gambar yang dipilih"
              className="mt-2"
              onChange={(event) => {
                const nextCaption = event.target.value;
                setSelectedImageCaption(nextCaption);
                editor
                  .chain()
                  .focus()
                  .updateAttributes("image", {
                    title: nextCaption.trim() || null,
                  })
                  .run();
              }}
            />
          </div>
        ) : null}

        <EditorContent editor={editor} />
      </div>

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
        .smartmaps-article-editor-content img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 1rem 0;
          border-radius: 16px;
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
