"use client";

import {
  HomeOutlined,
  LogoutOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { App, Button, Card, Space, Tag, Typography } from "antd";
import { useClerk } from "@clerk/nextjs";
import Image from "next/image";
import ThemeModeToggle from "@/components/theme/ThemeModeToggle";

const { Text: TypographyText, Title: TypographyTitle } = Typography;

type AdminHeaderProps = {
  isAdmin: boolean;
  labName?: string | null;
  appName?: string;
  logoUrl?: string;
  logoAlt?: string;
};

export default function AdminHeader({
  isAdmin,
  labName,
  appName,
  logoUrl,
  logoAlt,
}: AdminHeaderProps) {
  const { signOut } = useClerk();
  const { modal } = App.useApp();

  const handleConfirmLogout = () => {
    modal.confirm({
      title: "Keluar dari dashboard?",
      content: "Sesi Anda akan diakhiri dan perlu login ulang untuk masuk kembali.",
      okText: "Keluar",
      cancelText: "Batal",
      async onOk() {
        await signOut({ redirectUrl: "/login" });
      },
    });
  };

  return (
    <Card
      variant="borderless"
      className="smartmaps-admin-panel smartmaps-admin-panel-soft-blue"
      styles={{ body: { padding: 14 } }}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Space wrap size={[6, 6]}>
            <Tag color={isAdmin ? "blue" : "green"} variant="filled">
              {isAdmin ? "Super Admin" : "Akun Lab"}
            </Tag>
            {labName ? (
              <Tag color="green" variant="filled">
                {labName}
              </Tag>
            ) : null}
          </Space>

          <div className="mt-2">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <div
                  className="smartmaps-logo-frame relative h-10 w-10 overflow-hidden rounded-xl"
                >
                  <Image
                    src={logoUrl}
                    alt={logoAlt ?? appName ?? "Logo aplikasi"}
                    fill
                    sizes="40px"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                {appName ? (
                  <TypographyText style={{ fontSize: 12 }}>
                    {appName}
                  </TypographyText>
                ) : null}
                <TypographyTitle level={3} style={{ margin: 0 }}>
                  Dashboard
                </TypographyTitle>
              </div>
            </div>
          </div>
        </div>

        <Space wrap size={[8, 8]} className="justify-end">
          <ThemeModeToggle className="smartmaps-header-toggle-button" />
          <Button size="small" href="/" icon={<HomeOutlined />}>
            Peta
          </Button>
          {isAdmin ? (
            <Button size="small" href="/admin/new" icon={<PlusOutlined />} type="primary">
              Tambah Lab
            </Button>
          ) : null}
          <Button size="small" icon={<LogoutOutlined />} onClick={handleConfirmLogout}>
            Keluar
          </Button>
        </Space>
      </div>
    </Card>
  );
}
