"use client";

import { EditOutlined, PictureOutlined, SaveOutlined } from "@ant-design/icons";
import { App, Button, Card, Form, Input, Modal, Typography, message } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import type { AppBranding } from "@/lib/app-branding";

const { Item: FormItem } = Form;
const { Text: TypographyText, Title: TypographyTitle } = Typography;

type AppSettingsFormValues = {
  appName: string;
  shortName: string;
  logoUrl: string;
  logoAlt: string;
  faviconUrl: string;
  regionLabel: string;
  organizationName: string;
  footerTagline: string;
};

type Props = {
  branding: AppBranding;
};

export default function AdminAppSettingsManager({ branding }: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const [form] = Form.useForm<AppSettingsFormValues>();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const initialValues: AppSettingsFormValues = {
    appName: branding.appName,
    shortName: branding.shortName,
    logoUrl: branding.logoUrl,
    logoAlt: branding.logoAlt,
    faviconUrl: branding.faviconUrl === "/favicon.ico" ? "" : branding.faviconUrl,
    regionLabel: branding.regionLabel,
    organizationName: branding.organizationName,
    footerTagline: branding.footerTagline,
  };

  const openEditor = () => {
    form.setFieldsValue(initialValues);
    setIsOpen(true);
  };

  const closeEditor = () => {
    setIsOpen(false);
  };

  const handleSubmit = async (values: AppSettingsFormValues) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/app-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal menyimpan pengaturan aplikasi.");
      }

      messageApi.success("Pengaturan aplikasi diperbarui.");
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan pengaturan.";
      messageApi.error(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    modal.confirm({
      title: "Reset form ke nilai saat ini?",
      content: "Perubahan yang belum disimpan akan dibatalkan.",
      okText: "Reset",
      cancelText: "Tutup",
      async onOk() {
        form.setFieldsValue(initialValues);
      },
    });
  };

  return (
    <>
      {contextHolder}

      <Card
        variant="borderless"
        className="rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.04)]"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <TypographyTitle level={4} style={{ margin: 0 }}>
              Identitas Aplikasi
            </TypographyTitle>
            <TypographyText style={{ color: "#64748b" }}>
              Logo, favicon, dan identitas brand yang tampil di halaman publik dan login.
            </TypographyText>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Nama Aplikasi
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{branding.appName}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Short Name
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{branding.shortName}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Region
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{branding.regionLabel}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Footer
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{branding.footerTagline}</div>
              </div>
            </div>
          </div>

          <Button type="primary" icon={<EditOutlined />} onClick={openEditor}>
            Ubah Identitas
          </Button>
        </div>
      </Card>

      <Modal
        open={isOpen}
        onCancel={closeEditor}
        title="Pengaturan Aplikasi"
        width={880}
        footer={[
          <Button key="reset" onClick={handleReset}>
            Reset
          </Button>,
          <Button key="cancel" onClick={closeEditor}>
            Tutup
          </Button>,
          <Button
            key="save"
            type="primary"
            icon={<SaveOutlined />}
            loading={isSubmitting}
            onClick={() => form.submit()}
          >
            Simpan
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={initialValues}
          onFinish={handleSubmit}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <FormItem label="Nama aplikasi" name="appName">
              <Input placeholder="Smart Maps Labkesda" />
            </FormItem>

            <FormItem label="Nama singkat" name="shortName">
              <Input placeholder="Smart Maps" />
            </FormItem>

            <FormItem label="Teks alternatif logo" name="logoAlt">
              <Input placeholder="Logo Smart Maps Labkesda" />
            </FormItem>

            <FormItem label="Label wilayah" name="regionLabel">
              <Input placeholder="Jawa Barat · DKI Jakarta · Banten" />
            </FormItem>

            <FormItem label="Nama organisasi" name="organizationName">
              <Input placeholder="ASLABKESDA DPW Jawa Barat-DKI Jakarta-Banten" />
            </FormItem>

            <FormItem label="Tagline footer" name="footerTagline">
              <Input placeholder="Smart Maps • Direktori laboratorium kesehatan daerah" />
            </FormItem>
          </div>

          <div className="mt-1 grid gap-4 lg:grid-cols-2">
            <FormItem label="Logo aplikasi" name="logoUrl">
              <ImageUploadField
                kind="app-logo"
                bucket="branding"
                title="Logo aplikasi"
              />
            </FormItem>

            <FormItem label="Favicon" name="faviconUrl">
              <ImageUploadField
                kind="app-favicon"
                bucket="branding"
                title="Favicon aplikasi"
              />
            </FormItem>
          </div>

          <div className="mt-2 flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
            <PictureOutlined className="mt-0.5 text-slate-400" />
            <span>
              Logo dan favicon yang disimpan di sini dipakai di halaman publik, login, dan metadata
              browser setelah halaman direfresh atau deployment direload.
            </span>
          </div>
        </Form>
      </Modal>
    </>
  );
}
