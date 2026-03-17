"use client";

import { DeleteOutlined, MailOutlined, UserAddOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import { useState } from "react";

const { Paragraph: TypographyParagraph, Title: TypographyTitle } = Typography;
const { Item: FormItem } = Form;

export type InviteLabOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type ActiveLabUserRow = {
  id: string;
  email: string;
  labId: string | null;
  labName: string | null;
  createdAt: string;
};

export type PendingInvitationRow = {
  id: string;
  email: string;
  labId: string | null;
  labName: string | null;
  createdAt: string;
};

type InviteFormValue = {
  email: string;
  labId: string;
};

type Props = {
  labs: InviteLabOption[];
  activeUsers: ActiveLabUserRow[];
  pendingInvitations: PendingInvitationRow[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminUsersManager({
  labs,
  activeUsers,
  pendingInvitations,
}: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const [form] = Form.useForm<InviteFormValue>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const handleCancelInvitation = (invitationId: string) => {
    modal.confirm({
      title: "Batalkan undangan ini?",
      content: "Tautan aktivasi untuk email tersebut tidak akan bisa dipakai lagi.",
      okText: "Batalkan Undangan",
      cancelText: "Tutup",
      okButtonProps: { danger: true },
      async onOk() {
        const res = await fetch("/api/admin/cancel-invitation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ invitationId }),
        });

        const data = (await res.json()) as { error?: string };

        if (!res.ok) {
          throw new Error(data.error ?? "Gagal membatalkan undangan.");
        }

        messageApi.success("Undangan dibatalkan.");
        router.refresh();
      },
    });
  };

  const activeColumns: ColumnsType<ActiveLabUserRow> = [
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Laboratorium",
      key: "labName",
      render: (_, row) => row.labName ?? "-",
    },
    {
      title: "Status",
      key: "status",
      width: 140,
      render: () => <Tag color="green">Aktif</Tag>,
    },
    {
      title: "Dibuat",
      key: "createdAt",
      width: 190,
      render: (_, row) => formatDate(row.createdAt),
    },
  ];

  const pendingColumns: ColumnsType<PendingInvitationRow> = [
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Laboratorium",
      key: "labName",
      render: (_, row) => row.labName ?? "-",
    },
    {
      title: "Status",
      key: "status",
      width: 160,
      render: () => <Tag color="blue">Menunggu Aktivasi</Tag>,
    },
    {
      title: "Dikirim",
      key: "createdAt",
      width: 190,
      render: (_, row) => formatDate(row.createdAt),
    },
    {
      title: "Aksi",
      key: "action",
      width: 120,
      render: (_, row) => (
        <Button
          danger
          type="text"
          icon={<DeleteOutlined />}
          onClick={() => handleCancelInvitation(row.id)}
        >
          Batalkan
        </Button>
      ),
    },
  ];

  const handleInvite = async (values: InviteFormValue) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/invite-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal mengirim undangan.");
      }

      messageApi.success("Undangan berhasil dikirim.");
      form.resetFields();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengirim undangan.";
      messageApi.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}

      <Space orientation="vertical" size={20} style={{ width: "100%" }}>
        <Card variant="borderless">
          <Space orientation="vertical" size={18} style={{ width: "100%" }}>
            <div>
              <TypographyTitle level={4} style={{ marginBottom: 4 }}>
                Undang Akun Labkesda
              </TypographyTitle>
              <TypographyParagraph
                style={{ marginBottom: 0, color: "#64748b" }}
              >
                Super admin mengirim undangan email ke tiap lab. User hanya bisa
                membuat password lewat link invitation, bukan daftar mandiri.
              </TypographyParagraph>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleInvite}
              requiredMark={false}
            >
              <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_auto]">
                <FormItem
                  label="Email akun"
                  name="email"
                  rules={[
                    { required: true, message: "Email wajib diisi." },
                    { type: "email", message: "Format email tidak valid." },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="mis. labkesda.kabupaten@email.go.id"
                  />
                </FormItem>

                <FormItem
                  label="Laboratorium"
                  name="labId"
                  rules={[{ required: true, message: "Pilih laboratorium." }]}
                >
                  <Select
                    placeholder="Pilih laboratorium dari daftar"
                    options={labs}
                    showSearch
                    optionFilterProp="label"
                  />
                </FormItem>

                <FormItem
                  label=" "
                  style={{ alignSelf: "end", marginBottom: 24 }}
                >
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<UserAddOutlined />}
                    loading={isSubmitting}
                  >
                    Kirim Undangan
                  </Button>
                </FormItem>
              </div>
            </Form>

            <TypographyParagraph
              style={{ marginBottom: 0, color: "#94a3b8", fontSize: 12 }}
            >
              Opsi laboratorium yang sudah memiliki akun aktif atau invitation
              aktif akan tampil nonaktif di daftar.
            </TypographyParagraph>
          </Space>
        </Card>

        <Card variant="borderless">
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <div>
              <TypographyTitle level={4} style={{ marginBottom: 4 }}>
                Akun Labkesda Aktif
              </TypographyTitle>
              <TypographyParagraph
                style={{ marginBottom: 0, color: "#64748b" }}
              >
                User yang sudah menyelesaikan aktivasi invitation.
              </TypographyParagraph>
            </div>

            <Table
              rowKey="id"
              columns={activeColumns}
              dataSource={activeUsers}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              locale={{ emptyText: "Belum ada akun labkesda aktif." }}
            />
          </Space>
        </Card>

        <Card variant="borderless">
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <div>
              <TypographyTitle level={4} style={{ marginBottom: 4 }}>
                Undangan Menunggu Aktivasi
              </TypographyTitle>
              <TypographyParagraph
                style={{ marginBottom: 0, color: "#64748b" }}
              >
                Invitation yang sudah dikirim tetapi belum dipakai untuk membuat
                password.
              </TypographyParagraph>
            </div>

            <Table
              rowKey="id"
              columns={pendingColumns}
              dataSource={pendingInvitations}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              locale={{ emptyText: "Tidak ada invitation yang masih aktif." }}
            />
          </Space>
        </Card>
      </Space>
    </>
  );
}
