"use client";

import { DeleteOutlined, MailOutlined, UserAddOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Table,
  Tag,
  Tabs,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";
import { useState } from "react";

const { Title: TypographyTitle } = Typography;
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
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const closeInvite = () => {
    setIsInviteOpen(false);
    form.resetFields();
  };

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
      closeInvite();
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

      <Card
        variant="borderless"
        className="rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.04)]"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TypographyTitle level={4} style={{ margin: 0 }}>
            Akun Labkesda
          </TypographyTitle>

          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setIsInviteOpen(true)}
          >
            Undang Akun
          </Button>
        </div>

        <Tabs
          size="small"
          items={[
            {
              key: "active",
              label: `Akun Aktif (${activeUsers.length})`,
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  columns={activeColumns}
                  dataSource={activeUsers}
                  pagination={{ pageSize: 8, showSizeChanger: false }}
                  locale={{ emptyText: "Belum ada akun aktif." }}
                />
              ),
            },
            {
              key: "pending",
              label: `Undangan (${pendingInvitations.length})`,
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  columns={pendingColumns}
                  dataSource={pendingInvitations}
                  pagination={{ pageSize: 8, showSizeChanger: false }}
                  locale={{ emptyText: "Tidak ada undangan aktif." }}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={isInviteOpen}
        onCancel={closeInvite}
        title="Undang Akun Labkesda"
        width={720}
        footer={[
          <Button key="cancel" onClick={closeInvite}>
            Batal
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<UserAddOutlined />}
            loading={isSubmitting}
            onClick={() => form.submit()}
          >
            Kirim Undangan
          </Button>,
        ]}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleInvite}
          requiredMark={false}
        >
          <div className="grid gap-4 lg:grid-cols-2">
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
                placeholder="Alamat email resmi"
              />
            </FormItem>

            <FormItem
              label="Laboratorium"
              name="labId"
              rules={[{ required: true, message: "Pilih laboratorium." }]}
            >
              <Select
                placeholder="Pilih laboratorium"
                options={labs}
                showSearch
                optionFilterProp="label"
              />
            </FormItem>
          </div>
        </Form>
      </Modal>
    </>
  );
}
