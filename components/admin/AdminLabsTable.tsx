"use client";

import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { App, Button, Space, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useRouter } from "next/navigation";

const { Text: TypographyText } = Typography;

export type AdminLabRow = {
  id: string;
  name: string;
  address: string;
  types: { id: string; name: string }[];
};

type Props = {
  labs: AdminLabRow[];
  canDelete: boolean;
};

export default function AdminLabsTable({ labs, canDelete }: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const [messageApi, contextHolder] = message.useMessage();

  const handleDelete = (lab: AdminLabRow) => {
    modal.confirm({
      title: "Hapus laboratorium ini?",
      content: `Data "${lab.name}" akan dihapus permanen.`,
      okText: "Hapus",
      cancelText: "Batal",
      okButtonProps: {
        danger: true,
      },
      async onOk() {
        const res = await fetch(`/api/labs/${encodeURIComponent(lab.id)}`, {
          method: "DELETE",
        });

        let payload: { error?: string } | null = null;
        try {
          payload = (await res.json()) as { error?: string };
        } catch {
          payload = null;
        }

        if (!res.ok) {
          throw new Error(payload?.error ?? "Gagal menghapus data laboratorium.");
        }

        messageApi.success(`Laboratorium "${lab.name}" berhasil dihapus.`);
        router.refresh();
      },
    });
  };

  const columns: ColumnsType<AdminLabRow> = [
    {
      title: "Nama Laboratorium",
      dataIndex: "name",
      key: "name",
      render: (value: string) => (
        <TypographyText strong>{value}</TypographyText>
      ),
    },
    {
      title: "Alamat",
      dataIndex: "address",
      key: "address",
      responsive: ["md"],
      render: (value: string) => (
        <TypographyText style={{ color: "#475569" }}>{value}</TypographyText>
      ),
    },
    {
      title: "Tipe",
      key: "types",
      width: 220,
      render: (_, row) =>
        row.types.length > 0 ? (
          <Space wrap size={[6, 6]}>
            {row.types.map((type) => (
              <Tag key={type.id} color="blue">
                {type.name}
              </Tag>
            ))}
          </Space>
        ) : (
          <TypographyText type="secondary">Belum diset</TypographyText>
        ),
    },
    {
      title: "Aksi",
      key: "action",
      width: canDelete ? 170 : 90,
      align: "right",
      render: (_, row) => (
        <Space size={8}>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => router.push(`/admin/${row.id}/edit`)}
          >
            Edit
          </Button>
          {canDelete ? (
            <Button
              danger
              type="link"
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(row)}
            >
              Hapus
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      <Table
        rowKey="id"
        columns={columns}
        dataSource={labs}
        pagination={{ pageSize: 8, showSizeChanger: false }}
        locale={{ emptyText: "Belum ada data laboratorium." }}
      />
    </>
  );
}
