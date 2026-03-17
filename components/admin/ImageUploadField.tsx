"use client";

import {
  DeleteOutlined,
  LoadingOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Button,
  Empty,
  Image,
  Space,
  Tag,
  Typography,
  Upload,
  message,
  type UploadProps,
} from "antd";
import { useMemo, useState } from "react";
import {
  extractGoogleDriveFileId,
  isSupabasePublicStorageUrl,
  resolveStoredPhotoUrl,
} from "@/lib/drive-file";

const { Text: TypographyText } = Typography;

type ImageUploadFieldProps = {
  value?: string;
  onChange?: (value: string) => void;
  kind:
    | "lab-photo"
    | "head1-photo"
    | "head2-photo"
    | "article-cover"
    | "article-inline";
  labId?: string | null;
  bucket?: "profile" | "article";
  title?: string;
  disabled?: boolean;
};

export default function ImageUploadField({
  value,
  onChange,
  kind,
  labId,
  bucket = "profile",
  title = "Upload gambar",
  disabled = false,
}: ImageUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const normalizedValue = String(value ?? "").trim();
  const previewUrl = useMemo(
    () => resolveStoredPhotoUrl(normalizedValue),
    [normalizedValue]
  );
  const driveFileId = useMemo(
    () => extractGoogleDriveFileId(normalizedValue),
    [normalizedValue]
  );
  const isSupabaseFile = useMemo(
    () => isSupabasePublicStorageUrl(normalizedValue),
    [normalizedValue]
  );

  const handleUpload: NonNullable<UploadProps["customRequest"]> = async (
    options
  ) => {
    const sourceFile = options.file;

    if (!(sourceFile instanceof Blob)) {
      const error = new Error("File upload tidak valid.");
      options.onError?.(error);
      return;
    }

    const file =
      sourceFile instanceof File
        ? sourceFile
        : new File([sourceFile], "upload-image", {
            type: sourceFile.type || "application/octet-stream",
          });

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", kind);
      formData.append("bucket", bucket);
      if (labId) {
        formData.append("labId", labId);
      }

      const res = await fetch("/api/uploads/image", {
        method: "POST",
        body: formData,
      });

      const payload = (await res.json()) as {
        error?: string;
        fileId?: string;
      };

      if (!res.ok || !payload.fileId) {
        throw new Error(payload.error ?? "Gagal upload gambar.");
      }

      onChange?.(payload.fileId);
      messageApi.success("Gambar berhasil di-upload ke Supabase Storage.");
      options.onSuccess?.(payload);
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Terjadi kesalahan upload.";
      messageApi.error(text);
      options.onError?.(new Error(text));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {contextHolder}

      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-3">
          {previewUrl ? (
            <div className="flex flex-col gap-3">
              <Image
                src={previewUrl}
                alt={title}
                height={180}
                style={{
                  width: "100%",
                  objectFit: "cover",
                  borderRadius: 16,
                }}
              />

              <Space wrap size={[8, 8]}>
                {isSupabaseFile ? (
                  <Tag color="blue">Tersimpan di Supabase Storage</Tag>
                ) : driveFileId ? (
                  <Tag color="gold">Legacy Google Drive</Tag>
                ) : (
                  <Tag>URL eksternal</Tag>
                )}
              </Space>
            </div>
          ) : (
            <div className="py-4">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Belum ada gambar"
              />
            </div>
          )}
        </div>

        <Space wrap size={[8, 8]}>
          <Upload
            accept="image/*"
            showUploadList={false}
            customRequest={handleUpload}
            disabled={disabled || isUploading}
          >
            <Button
              icon={isUploading ? <LoadingOutlined /> : <UploadOutlined />}
              loading={isUploading}
              disabled={disabled}
            >
              {normalizedValue ? "Ganti Gambar" : "Upload Gambar"}
            </Button>
          </Upload>

          {normalizedValue ? (
            <Button
              icon={<DeleteOutlined />}
              danger
              onClick={() => onChange?.("")}
              disabled={disabled || isUploading}
            >
              Kosongkan
            </Button>
          ) : null}
        </Space>

        <TypographyText style={{ color: "#64748b" }}>
          File di-upload langsung ke Supabase Storage. Pengguna cukup pilih file, tidak perlu menempel link manual.
        </TypographyText>
      </Space>
    </>
  );
}
