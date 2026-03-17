"use client";

import {
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import ArticleRichTextEditor from "@/components/admin/ArticleRichTextEditor";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { formatDateKey, formatMediumDate } from "@/lib/activity-calendar";
import { resolveStoredPhotoUrl } from "@/lib/drive-file";

const { Text: TypographyText } = Typography;
const { Item: FormItem } = Form;
const { TextArea: InputTextArea } = Input;

export type AdminArticleLabOption = {
  value: string;
  label: string;
};

export type AdminArticleRow = {
  id: string;
  labId: string | null;
  labName: string | null;
  isGlobal: boolean;
  title: string;
  slug: string;
  excerpt: string | null;
  contentHtml: string;
  coverImageUrl: string | null;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
};

type ArticleFormValue = {
  labId?: string;
  isGlobal: boolean;
  title: string;
  excerpt?: string;
  coverImageUrl?: string;
  contentHtml: string;
  publishedAt: string;
  isPublished: boolean;
};

type Props = {
  labs: AdminArticleLabOption[];
  articles: AdminArticleRow[];
  canManageAllLabs: boolean;
  fixedLabId?: string | null;
  fixedLabLabel?: string | null;
};

function stripEditorHtml(value: string) {
  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ArticleThumbnail({
  title,
  imageUrl,
}: {
  title: string;
  imageUrl: string | null;
}) {
  const resolved = imageUrl ? resolveStoredPhotoUrl(imageUrl) : "";

  if (!resolved) {
    return (
      <div className="flex h-[64px] w-[88px] items-center justify-center rounded-[14px] border border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        Artikel
      </div>
    );
  }

  return (
    <div className="relative h-[64px] w-[88px] overflow-hidden rounded-[14px] border border-slate-200">
      <Image src={resolved} alt={title} fill sizes="88px" className="object-cover" unoptimized />
    </div>
  );
}

export default function AdminArticlesManager({
  labs,
  articles,
  canManageAllLabs,
  fixedLabId,
  fixedLabLabel,
}: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const [form] = Form.useForm<ArticleFormValue>();
  const [messageApi, contextHolder] = message.useMessage();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const watchedIsGlobal = Form.useWatch("isGlobal", form) ?? false;
  const watchedLabId = Form.useWatch("labId", form);

  const formDefaults = useMemo<ArticleFormValue>(
    () => ({
      labId: fixedLabId ?? labs[0]?.value,
      isGlobal: false,
      title: "",
      excerpt: "",
      coverImageUrl: "",
      contentHtml: "",
      publishedAt: formatDateKey(new Date()),
      isPublished: true,
    }),
    [fixedLabId, labs]
  );

  const effectiveUploadLabId = canManageAllLabs
    ? watchedIsGlobal
      ? null
      : watchedLabId ?? null
    : fixedLabId ?? null;

  const canCreate = canManageAllLabs || Boolean(fixedLabId);

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue(formDefaults);
  };

  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue(formDefaults);
    setIsEditorOpen(true);
  };

  const startEdit = (article: AdminArticleRow) => {
    setEditingId(article.id);
    form.setFieldsValue({
      labId: article.labId ?? undefined,
      isGlobal: article.isGlobal,
      title: article.title,
      excerpt: article.excerpt ?? "",
      coverImageUrl: article.coverImageUrl ?? "",
      contentHtml: article.contentHtml,
      publishedAt: article.publishedAt,
      isPublished: article.isPublished,
    });
    setIsEditorOpen(true);
  };

  const handleDelete = (article: AdminArticleRow) => {
    modal.confirm({
      title: "Hapus artikel?",
      content: article.title,
      okText: "Hapus",
      cancelText: "Batal",
      okButtonProps: {
        danger: true,
      },
      async onOk() {
        const res = await fetch(`/api/articles/${encodeURIComponent(article.id)}`, {
          method: "DELETE",
        });

        const data = (await res.json()) as { error?: string };

        if (!res.ok) {
          throw new Error(data.error ?? "Gagal menghapus artikel.");
        }

        messageApi.success("Artikel berhasil dihapus.");
        router.refresh();
      },
    });
  };

  const handleSubmit = async (values: ArticleFormValue) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const endpoint = editingId ? `/api/articles/${encodeURIComponent(editingId)}` : "/api/articles";
      const method = editingId ? "PUT" : "POST";
      const body = {
        labId: canManageAllLabs ? (values.isGlobal ? undefined : values.labId) : fixedLabId,
        isGlobal: canManageAllLabs ? values.isGlobal : false,
        title: values.title,
        excerpt: values.excerpt,
        coverImageUrl: values.coverImageUrl,
        contentHtml: values.contentHtml,
        publishedAt: values.publishedAt,
        isPublished: values.isPublished,
      };

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal menyimpan artikel.");
      }

      messageApi.success(
        editingId ? "Artikel berhasil diperbarui." : "Artikel berhasil ditambahkan."
      );
      closeEditor();
      router.refresh();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Terjadi kesalahan tidak dikenal.";
      messageApi.error(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnsType<AdminArticleRow> = [
    {
      title: "Artikel",
      dataIndex: "title",
      key: "title",
      render: (_value, row) => (
        <div className="flex items-start gap-3">
          <ArticleThumbnail title={row.title} imageUrl={row.coverImageUrl} />

          <Space orientation="vertical" size={5}>
            <div className="flex flex-wrap gap-1.5">
              <Tag color={row.isGlobal ? "blue" : "green"} variant="filled">
                {row.isGlobal ? "Global" : "Lab"}
              </Tag>
              <Tag color={row.isPublished ? "green" : "default"}>
                {row.isPublished ? "Publik" : "Draft"}
              </Tag>
            </div>

            <TypographyText strong>{row.title}</TypographyText>

            {row.excerpt ? (
              <TypographyText style={{ color: "#64748b" }}>{row.excerpt}</TypographyText>
            ) : null}
          </Space>
        </div>
      ),
    },
    {
      title: "Terbit",
      key: "publishedAt",
      width: 170,
      render: (_value, row) => formatMediumDate(row.publishedAt),
    },
    ...(canManageAllLabs
      ? [
          {
            title: "Lab",
            key: "lab",
            width: 220,
            render: (_value: unknown, row: AdminArticleRow) =>
              row.isGlobal ? "Artikel Global DPW" : row.labName ?? "-",
          },
        ]
      : []),
    {
      title: "Aksi",
      key: "action",
      width: 170,
      align: "right",
      render: (_value, row) =>
        canManageAllLabs || !row.isGlobal ? (
          <Space size={4}>
            <Button type="link" icon={<EditOutlined />} onClick={() => startEdit(row)}>
              Edit
            </Button>
            <Button danger type="link" icon={<DeleteOutlined />} onClick={() => handleDelete(row)}>
              Hapus
            </Button>
          </Space>
        ) : (
          <TypographyText style={{ color: "#94a3b8" }}>Super admin</TypographyText>
        ),
    },
  ];

  return (
    <>
      {contextHolder}

      <Card
        variant="borderless"
        className="rounded-[24px] border border-slate-200 bg-white/96 shadow-[0_18px_38px_rgba(15,23,42,0.05)]"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-900">Artikel</span>
            <Tag icon={<FileTextOutlined />} color="blue">
              {articles.length}
            </Tag>
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            disabled={!canCreate}
          >
            Tulis Artikel
          </Button>
        </div>

        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={articles}
          pagination={{ pageSize: 6, showSizeChanger: false }}
          locale={{ emptyText: "Belum ada artikel." }}
        />
      </Card>

      <Modal
        open={isEditorOpen}
        onCancel={closeEditor}
        title={editingId ? "Edit artikel" : "Artikel baru"}
        width={1120}
        footer={[
          <Button key="cancel" onClick={closeEditor}>
            Batal
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={isSubmitting}
            onClick={() => form.submit()}
          >
            {editingId ? "Simpan" : "Terbitkan"}
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={formDefaults}
          onFinish={handleSubmit}
          requiredMark={false}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                {canManageAllLabs ? (
                  <FormItem label="Cakupan" name="isGlobal" valuePropName="checked">
                    <Switch checkedChildren="Global" unCheckedChildren="Per Lab" />
                  </FormItem>
                ) : (
                  <FormItem label="Lab">
                    <Input value={fixedLabLabel ?? "-"} disabled />
                  </FormItem>
                )}

                {canManageAllLabs && !watchedIsGlobal ? (
                  <FormItem
                    label="Lab"
                    name="labId"
                    rules={[{ required: true, message: "Pilih laboratorium." }]}
                  >
                    <Select
                      options={labs}
                      placeholder="Pilih laboratorium"
                      showSearch
                      optionFilterProp="label"
                    />
                  </FormItem>
                ) : canManageAllLabs ? (
                  <div />
                ) : null}

                <FormItem
                  label="Judul"
                  name="title"
                  className="md:col-span-2"
                  rules={[{ required: true, message: "Judul wajib diisi." }]}
                >
                  <Input placeholder="Judul publikasi" />
                </FormItem>

                <FormItem
                  label="Tanggal terbit"
                  name="publishedAt"
                  rules={[{ required: true, message: "Tanggal terbit wajib diisi." }]}
                >
                  <Input type="date" />
                </FormItem>

                <FormItem label="Publik" name="isPublished" valuePropName="checked">
                  <Switch checkedChildren="Publik" unCheckedChildren="Draft" />
                </FormItem>

                <FormItem label="Ringkasan" name="excerpt" className="md:col-span-2">
                  <InputTextArea
                    rows={3}
                    placeholder="Ringkasan singkat untuk kartu artikel"
                  />
                </FormItem>
              </div>

              <FormItem
                label="Isi artikel"
                name="contentHtml"
                rules={[
                  {
                    validator: async (_rule, value) => {
                      if (stripEditorHtml(String(value ?? ""))) {
                        return;
                      }

                      throw new Error("Isi artikel wajib diisi.");
                    },
                  },
                ]}
              >
                <ArticleRichTextEditor
                  placeholder="Tulis isi artikel yang siap dibaca publik."
                  uploadLabId={effectiveUploadLabId}
                />
              </FormItem>
            </div>

            <div className="space-y-3">
              <FormItem label="Thumbnail / Cover" name="coverImageUrl">
                <ImageUploadField
                  kind="article-cover"
                  bucket="article"
                  labId={effectiveUploadLabId}
                  title="Cover artikel"
                />
              </FormItem>
            </div>
          </div>
        </Form>
      </Modal>
    </>
  );
}
