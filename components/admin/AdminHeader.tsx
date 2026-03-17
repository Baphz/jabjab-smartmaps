"use client";

import {
  AppstoreOutlined,
  CalendarOutlined,
  FieldTimeOutlined,
  HomeOutlined,
  LogoutOutlined,
  PlusOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { App, Button, Card, Space, Tag, Typography } from "antd";
import { useClerk } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

const { Paragraph: TypographyParagraph, Title: TypographyTitle } = Typography;

type AdminHeaderProps = {
  isAdmin: boolean;
  labName?: string | null;
};

export default function AdminHeader({ isAdmin, labName }: AdminHeaderProps) {
  const { signOut } = useClerk();
  const { modal } = App.useApp();
  const pathname = usePathname();
  const navigationItems = [
    {
      href: "/admin",
      icon: <AppstoreOutlined />,
      label: "Dashboard",
      active: pathname === "/admin",
    },
    {
      href: "/admin/events",
      icon: <CalendarOutlined />,
      label: "Agenda",
      active: pathname.startsWith("/admin/events"),
    },
    ...(isAdmin
      ? [
          {
            href: "/admin/holidays",
            icon: <FieldTimeOutlined />,
            label: "Hari Libur",
            active: pathname.startsWith("/admin/holidays"),
          },
          {
            href: "/admin/users",
            icon: <TeamOutlined />,
            label: "Akun Lab",
            active: pathname === "/admin/users",
          },
        ]
      : []),
  ];

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
      className="rounded-[24px] border border-sky-100 bg-sky-50/70 shadow-[0_18px_38px_rgba(15,23,42,0.05)]"
      styles={{ body: { padding: 18 } }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <Space orientation="vertical" size={8}>
            <Space wrap size={[8, 8]}>
              <Tag color={isAdmin ? "blue" : "green"} variant="filled">
              {isAdmin ? "Super Admin" : "Akun Labkesda"}
              </Tag>
              {labName ? (
                <Tag color="green" variant="filled">
                  {labName}
                </Tag>
              ) : null}
            </Space>

            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Workspace
              </div>
              <TypographyTitle level={2} style={{ marginTop: 4, marginBottom: 4 }}>
                Dashboard Smart Maps
              </TypographyTitle>
              <TypographyParagraph
                style={{ marginBottom: 0, color: "#64748b", maxWidth: 720 }}
              >
                {isAdmin
                  ? "Kelola laboratorium, akun Labkesda, agenda, dan kalender kerja dalam satu workspace yang lebih ringkas."
                  : "Kelola laboratorium yang ditautkan ke akun Anda, pantau agenda, dan pastikan data publik selalu mutakhir."}
              </TypographyParagraph>
            </div>
          </Space>

          <Space wrap size={[8, 8]} className="justify-end">
            <Button href="/" icon={<HomeOutlined />}>
              Peta Publik
            </Button>
            {isAdmin ? (
              <Button href="/admin/new" icon={<PlusOutlined />} type="primary">
                Tambah Laboratorium
              </Button>
            ) : null}
            <Button icon={<LogoutOutlined />} onClick={handleConfirmLogout}>
              Keluar
            </Button>
          </Space>
        </div>

        <div className="flex flex-wrap gap-2">
          {navigationItems.map((item) => (
            <Button
              key={item.href}
              href={item.href}
              icon={item.icon}
              type={item.active ? "primary" : "default"}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}
