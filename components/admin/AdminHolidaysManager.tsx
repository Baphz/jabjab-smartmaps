"use client";

import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { HolidayType } from "@prisma/client";
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
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatMediumDate } from "@/lib/activity-calendar";

const { Text: TypographyText, Title: TypographyTitle } = Typography;
const { Item: FormItem } = Form;

export type AdminHolidayRow = {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
  source: string | null;
  isActive: boolean;
};

type HolidayFormValue = {
  date: string;
  name: string;
  type: HolidayType;
  source?: string;
  isActive: boolean;
};

type Props = {
  holidays: AdminHolidayRow[];
};

const holidayTypeOptions = [
  {
    value: HolidayType.LIBUR_NASIONAL,
    label: "Libur Nasional",
  },
  {
    value: HolidayType.CUTI_BERSAMA,
    label: "Cuti Bersama",
  },
];

function formatHolidayType(type: HolidayType) {
  return type === HolidayType.CUTI_BERSAMA ? "Cuti Bersama" : "Libur Nasional";
}

export default function AdminHolidaysManager({ holidays }: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const [form] = Form.useForm<HolidayFormValue>();
  const [messageApi, contextHolder] = message.useMessage();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formDefaults = useMemo<HolidayFormValue>(
    () => ({
      date: "",
      name: "",
      type: HolidayType.LIBUR_NASIONAL,
      source: "",
      isActive: true,
    }),
    []
  );

  const resetForm = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue(formDefaults);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setIsEditorOpen(true);
  };

  const startEdit = (holiday: AdminHolidayRow) => {
    setEditingId(holiday.id);
    form.setFieldsValue({
      date: holiday.date,
      name: holiday.name,
      type: holiday.type,
      source: holiday.source ?? "",
      isActive: holiday.isActive,
    });
    setIsEditorOpen(true);
  };

  const handleDelete = (holiday: AdminHolidayRow) => {
    modal.confirm({
      title: "Hapus hari libur ini?",
      content: `${holiday.name} pada ${formatMediumDate(holiday.date)} akan dihapus dari kalender kerja.`,
      okText: "Hapus",
      cancelText: "Batal",
      okButtonProps: {
        danger: true,
      },
      async onOk() {
        const res = await fetch(`/api/holidays/${encodeURIComponent(holiday.id)}`, {
          method: "DELETE",
        });

        const data = (await res.json()) as { error?: string };

        if (!res.ok) {
          throw new Error(data.error ?? "Gagal menghapus hari libur.");
        }

        messageApi.success("Hari libur berhasil dihapus.");
        router.refresh();
      },
    });
  };

  const handleSubmit = async (values: HolidayFormValue) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const endpoint = editingId
        ? `/api/holidays/${encodeURIComponent(editingId)}`
        : "/api/holidays";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error ?? "Gagal menyimpan hari libur.");
      }

      messageApi.success(
        editingId
          ? "Hari libur berhasil diperbarui."
          : "Hari libur berhasil ditambahkan."
      );
      closeEditor();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Terjadi kesalahan tidak dikenal.";
      messageApi.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: ColumnsType<AdminHolidayRow> = [
    {
      title: "Tanggal",
      dataIndex: "date",
      key: "date",
      width: 180,
      render: (value: string) => formatMediumDate(value),
    },
    {
      title: "Nama Hari Libur",
      dataIndex: "name",
      key: "name",
      render: (value: string, row) => (
        <Space orientation="vertical" size={6}>
          <div className="smartmaps-admin-item-title">{value}</div>
          {row.source ? (
            <TypographyText className="smartmaps-admin-item-copy">
              Sumber: {row.source}
            </TypographyText>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Jenis",
      dataIndex: "type",
      key: "type",
      width: 180,
      render: (value: HolidayType) => (
        <Tag color={value === HolidayType.CUTI_BERSAMA ? "gold" : "red"}>
          {formatHolidayType(value)}
        </Tag>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 120,
      render: (_value, row) =>
        row.isActive ? <Tag color="green">Aktif</Tag> : <Tag>Nonaktif</Tag>,
    },
    {
      title: "Aksi",
      key: "action",
      width: 160,
      align: "right",
      render: (_value, row) => (
        <Space size={4}>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => startEdit(row)}
          >
            Edit
          </Button>
          <Button
            danger
            type="link"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(row)}
          >
            Hapus
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      {contextHolder}

      <Space orientation="vertical" size={20} style={{ width: "100%" }}>
        <Card
          variant="borderless"
          className="smartmaps-admin-panel"
          styles={{ body: { padding: 14 } }}
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="smartmaps-admin-kicker">Kalender Nasional</div>
              <TypographyTitle
                level={4}
                className="smartmaps-admin-heading"
                style={{ margin: 0 }}
              >
                Hari Libur
              </TypographyTitle>
            </div>

            <div className="flex items-center gap-2">
              <Button type="primary" icon={<SaveOutlined />} onClick={openCreate}>
                Tambah
              </Button>
              <Tag icon={<CalendarOutlined />} color="gold">
                {holidays.length} item
              </Tag>
            </div>
          </div>

          <Table
            className="smartmaps-admin-table"
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={holidays}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            locale={{ emptyText: "Belum ada hari libur." }}
          />
        </Card>
      </Space>

      <Modal
        className="smartmaps-admin-modal"
        open={isEditorOpen}
        onCancel={closeEditor}
        title={editingId ? "Edit Hari Libur" : "Tambah Hari Libur"}
        width={720}
        footer={[
          <Button key="cancel" onClick={closeEditor}>
            Batal
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<SaveOutlined />}
            loading={isSubmitting}
            onClick={() => form.submit()}
          >
            {editingId ? "Simpan" : "Tambah"}
          </Button>,
        ]}
      >
        <Form
          className="smartmaps-admin-form"
          form={form}
          layout="vertical"
          initialValues={formDefaults}
          onFinish={handleSubmit}
          requiredMark={false}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <FormItem
              label="Tanggal"
              name="date"
              rules={[{ required: true, message: "Tanggal wajib diisi." }]}
            >
              <Input type="date" />
            </FormItem>

            <FormItem
              label="Jenis hari libur"
              name="type"
              rules={[{ required: true, message: "Jenis wajib dipilih." }]}
            >
              <Select options={holidayTypeOptions} />
            </FormItem>

            <FormItem
              label="Nama hari libur"
              name="name"
              rules={[{ required: true, message: "Nama hari libur wajib diisi." }]}
            >
              <Input placeholder="Nama hari libur" />
            </FormItem>

            <FormItem label="Sumber / catatan" name="source">
              <Input placeholder="Sumber atau catatan" />
            </FormItem>
          </div>

          <FormItem
            label="Tampilkan di kalender"
            name="isActive"
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
          </FormItem>
        </Form>
      </Modal>
    </>
  );
}
