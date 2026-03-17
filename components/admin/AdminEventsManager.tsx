"use client";

import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
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
import { useEffect, useMemo, useState } from "react";
import LabCoordinatePicker from "@/components/admin/LabCoordinatePicker";
import useAddressCoordinateAutofill from "@/components/admin/useAddressCoordinateAutofill";
import {
  formatCityName,
  normalizeWhitespace,
  type LabCityTypeValue,
  type LabVillageTypeValue,
} from "@/lib/lab-address";
import { formatActivityRange } from "@/lib/activity-calendar";

const { Text: TypographyText } = Typography;
const { Item: FormItem } = Form;
const { TextArea: InputTextArea } = Input;

type ProvinceOption = {
  id: string;
  nama: string;
};

type CityOption = {
  id: string;
  nama: string;
  tipe: LabCityTypeValue;
  namaTampil: string;
};

type DistrictOption = {
  id: string;
  nama: string;
};

type VillageOption = {
  id: string;
  nama: string;
};

export type AdminEventLabOption = {
  value: string;
  label: string;
};

export type AdminEventRow = {
  id: string;
  labId: string | null;
  labName: string | null;
  isGlobal: boolean;
  title: string;
  description: string | null;
  locationName: string | null;
  locationAddress: string | null;
  addressDetail: string | null;
  provinceId: string | null;
  provinceName: string | null;
  cityId: string | null;
  cityName: string | null;
  cityType: LabCityTypeValue | null;
  districtId: string | null;
  districtName: string | null;
  villageId: string | null;
  villageName: string | null;
  villageType: LabVillageTypeValue | null;
  latitude: number | null;
  longitude: number | null;
  startDate: string;
  endDate: string;
  timeLabel: string | null;
  isPublished: boolean;
  createdAt: string;
};

type EventFormValue = {
  labId?: string;
  isGlobal: boolean;
  title: string;
  description?: string;
  locationName: string;
  addressDetail: string;
  villageType?: LabVillageTypeValue;
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  timeLabel?: string;
  isPublished: boolean;
};

type Props = {
  labs: AdminEventLabOption[];
  events: AdminEventRow[];
  canManageAllLabs: boolean;
  fixedLabId?: string | null;
  fixedLabLabel?: string | null;
};

async function fetchJson<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json()) as {
    success?: boolean;
    data?: T;
    message?: string;
  };

  if (!res.ok || data.success === false) {
    throw new Error(data.message ?? "Gagal mengambil data referensi.");
  }

  return data.data ?? ([] as T);
}

function mergeOption<T extends { id: string }>(selected: T | null, options: T[]) {
  if (!selected) return options;
  return options.some((item) => item.id === selected.id) ? options : [selected, ...options];
}

export default function AdminEventsManager({
  labs,
  events,
  canManageAllLabs,
  fixedLabId,
  fixedLabLabel,
}: Props) {
  const router = useRouter();
  const { modal } = App.useApp();
  const [form] = Form.useForm<EventFormValue>();
  const [messageApi, contextHolder] = message.useMessage();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const watchedIsGlobal = Form.useWatch("isGlobal", form) ?? false;
  const watchedAddressDetail = Form.useWatch("addressDetail", form);
  const watchedVillageType = Form.useWatch("villageType", form);
  const watchedLatitude = Form.useWatch("latitude", form);
  const watchedLongitude = Form.useWatch("longitude", form);

  const [provinceOptions, setProvinceOptions] = useState<ProvinceOption[]>([]);
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<DistrictOption[]>([]);
  const [villageOptions, setVillageOptions] = useState<VillageOption[]>([]);

  const [provinceSearch, setProvinceSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [villageSearch, setVillageSearch] = useState("");

  const [selectedProvince, setSelectedProvince] = useState<ProvinceOption | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictOption | null>(null);
  const [selectedVillage, setSelectedVillage] = useState<VillageOption | null>(null);

  const [loadingProvince, setLoadingProvince] = useState(false);
  const [loadingCity, setLoadingCity] = useState(false);
  const [loadingDistrict, setLoadingDistrict] = useState(false);
  const [loadingVillage, setLoadingVillage] = useState(false);

  const formDefaults = useMemo<EventFormValue>(
    () => ({
      labId: fixedLabId ?? labs[0]?.value,
      isGlobal: false,
      title: "",
      description: "",
      locationName: "",
      addressDetail: "",
      villageType: undefined,
      latitude: -6.9,
      longitude: 107.6,
      startDate: "",
      endDate: "",
      timeLabel: "",
      isPublished: true,
    }),
    [fixedLabId, labs]
  );

  const coordinatePreview = useMemo(
    () => ({
      latitude:
        typeof watchedLatitude === "number" && Number.isFinite(watchedLatitude)
          ? watchedLatitude
          : formDefaults.latitude,
      longitude:
        typeof watchedLongitude === "number" && Number.isFinite(watchedLongitude)
          ? watchedLongitude
          : formDefaults.longitude,
    }),
    [formDefaults.latitude, formDefaults.longitude, watchedLatitude, watchedLongitude]
  );

  const {
    canResolve: canAutoLocate,
    hasResolvedOnce: hasAutoLocated,
    isResolving: isAutoLocating,
  } = useAddressCoordinateAutofill({
    resetKey: isEditorOpen ? editingId ?? "create-event" : "closed-event",
    enabled: isEditorOpen,
    addressDetail: watchedAddressDetail,
    provinceName: selectedProvince?.nama ?? null,
    cityName: selectedCity?.namaTampil ?? null,
    cityType: selectedCity?.tipe ?? null,
    districtName: selectedDistrict?.nama ?? null,
    villageName: selectedVillage?.nama ?? null,
    villageType: watchedVillageType ?? null,
    onCoordinatesResolved: (latitude, longitude) => {
      form.setFieldsValue({
        latitude,
        longitude,
      });
    },
  });

  useEffect(() => {
    if (!isEditorOpen && !editingId) {
      form.setFieldsValue(formDefaults);
    }
  }, [editingId, form, formDefaults, isEditorOpen]);

  useEffect(() => {
    let cancelled = false;
    setLoadingProvince(true);

    fetchJson<ProvinceOption[]>(
      `/api/wilayah/provinsi?search=${encodeURIComponent(provinceSearch)}`
    )
      .then((data) => {
        if (!cancelled) setProvinceOptions(data);
      })
      .catch(() => {
        if (!cancelled) setProvinceOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProvince(false);
      });

    return () => {
      cancelled = true;
    };
  }, [provinceSearch]);

  useEffect(() => {
    if (!selectedProvince?.id) {
      setCityOptions([]);
      return;
    }

    let cancelled = false;
    setLoadingCity(true);

    fetchJson<CityOption[]>(
      `/api/wilayah/kabkota?provinceId=${encodeURIComponent(selectedProvince.id)}&search=${encodeURIComponent(citySearch)}`
    )
      .then((data) => {
        if (!cancelled) setCityOptions(data);
      })
      .catch(() => {
        if (!cancelled) setCityOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingCity(false);
      });

    return () => {
      cancelled = true;
    };
  }, [citySearch, selectedProvince?.id]);

  useEffect(() => {
    if (!selectedCity?.id) {
      setDistrictOptions([]);
      return;
    }

    let cancelled = false;
    setLoadingDistrict(true);

    fetchJson<DistrictOption[]>(
      `/api/wilayah/kecamatan?kabKotaId=${encodeURIComponent(selectedCity.id)}&search=${encodeURIComponent(districtSearch)}`
    )
      .then((data) => {
        if (!cancelled) setDistrictOptions(data);
      })
      .catch(() => {
        if (!cancelled) setDistrictOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDistrict(false);
      });

    return () => {
      cancelled = true;
    };
  }, [districtSearch, selectedCity?.id]);

  useEffect(() => {
    if (!selectedDistrict?.id) {
      setVillageOptions([]);
      return;
    }

    let cancelled = false;
    setLoadingVillage(true);

    fetchJson<VillageOption[]>(
      `/api/wilayah/kelurahan?kecamatanId=${encodeURIComponent(selectedDistrict.id)}&search=${encodeURIComponent(villageSearch)}`
    )
      .then((data) => {
        if (!cancelled) setVillageOptions(data);
      })
      .catch(() => {
        if (!cancelled) setVillageOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingVillage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDistrict?.id, villageSearch]);

  const resetLocationState = () => {
    setSelectedProvince(null);
    setSelectedCity(null);
    setSelectedDistrict(null);
    setSelectedVillage(null);
    form.setFieldsValue({ villageType: undefined });
    setProvinceSearch("");
    setCitySearch("");
    setDistrictSearch("");
    setVillageSearch("");
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue(formDefaults);
    resetLocationState();
  };

  const openCreate = () => {
    setEditingId(null);
    resetLocationState();
    form.resetFields();
    form.setFieldsValue(formDefaults);
    setIsEditorOpen(true);
  };

  const startEdit = (event: AdminEventRow) => {
    setEditingId(event.id);
    setSelectedProvince(
      event.provinceId && event.provinceName ? { id: event.provinceId, nama: event.provinceName } : null
    );
    setSelectedCity(
      event.cityId && event.cityName
        ? {
            id: event.cityId,
            nama: event.cityName,
            tipe: event.cityType ?? "KABUPATEN",
            namaTampil: formatCityName(event.cityName, event.cityType),
          }
        : null
    );
    setSelectedDistrict(
      event.districtId && event.districtName ? { id: event.districtId, nama: event.districtName } : null
    );
    setSelectedVillage(
      event.villageId && event.villageName ? { id: event.villageId, nama: event.villageName } : null
    );
    setProvinceSearch(event.provinceName ?? "");
    setCitySearch(event.cityName ?? "");
    setDistrictSearch(event.districtName ?? "");
    setVillageSearch(event.villageName ?? "");

    form.setFieldsValue({
      labId: event.labId ?? undefined,
      isGlobal: event.isGlobal,
      title: event.title,
      description: event.description ?? "",
      locationName: event.locationName ?? "",
      addressDetail: event.addressDetail ?? "",
      villageType: event.villageType ?? undefined,
      latitude: event.latitude ?? formDefaults.latitude,
      longitude: event.longitude ?? formDefaults.longitude,
      startDate: event.startDate,
      endDate: event.endDate,
      timeLabel: event.timeLabel ?? "",
      isPublished: event.isPublished,
    });

    setIsEditorOpen(true);
  };

  const handleDelete = (event: AdminEventRow) => {
    modal.confirm({
      title: "Hapus agenda?",
      content: event.title,
      okText: "Hapus",
      cancelText: "Batal",
      okButtonProps: {
        danger: true,
      },
      async onOk() {
        const res = await fetch(`/api/events/${encodeURIComponent(event.id)}`, {
          method: "DELETE",
        });

        const data = (await res.json()) as { error?: string };

        if (!res.ok) {
          throw new Error(data.error ?? "Gagal menghapus agenda.");
        }

        messageApi.success("Agenda berhasil dihapus.");
        router.refresh();
      },
    });
  };

  const handleSubmit = async (values: EventFormValue) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const endpoint = editingId ? `/api/events/${encodeURIComponent(editingId)}` : "/api/events";
      const method = editingId ? "PUT" : "POST";
      const body = {
        labId: canManageAllLabs ? (values.isGlobal ? undefined : values.labId) : fixedLabId,
        isGlobal: canManageAllLabs ? values.isGlobal : false,
        title: values.title,
        description: values.description,
        locationName: values.locationName,
        addressDetail: normalizeWhitespace(values.addressDetail ?? ""),
        provinceId: selectedProvince?.id ?? null,
        provinceName: selectedProvince?.nama ?? null,
        cityId: selectedCity?.id ?? null,
        cityName: selectedCity?.namaTampil ?? null,
        cityType: selectedCity?.tipe ?? null,
        districtId: selectedDistrict?.id ?? null,
        districtName: selectedDistrict?.nama ?? null,
        villageId: selectedVillage?.id ?? null,
        villageName: selectedVillage?.nama ?? null,
        villageType: values.villageType ?? null,
        latitude: values.latitude,
        longitude: values.longitude,
        startDate: values.startDate,
        endDate: values.endDate,
        timeLabel: values.timeLabel,
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
        throw new Error(data.error ?? "Gagal menyimpan agenda.");
      }

      messageApi.success(
        editingId ? "Agenda berhasil diperbarui." : "Agenda berhasil ditambahkan."
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

  const canCreate = canManageAllLabs || Boolean(fixedLabId);

  const columns: ColumnsType<AdminEventRow> = [
    {
      title: "Agenda",
      dataIndex: "title",
      key: "title",
      render: (_value, row) => (
        <Space orientation="vertical" size={4}>
          <div className="flex flex-wrap gap-1.5">
            <Tag color={row.isGlobal ? "blue" : "green"} variant="filled">
              {row.isGlobal ? "Global" : "Lab"}
            </Tag>
            <Tag color={row.isPublished ? "green" : "default"}>
              {row.isPublished ? "Publik" : "Draft"}
            </Tag>
          </div>
          <TypographyText strong>{row.title}</TypographyText>
          {row.locationName ? (
            <TypographyText style={{ color: "#64748b" }}>{row.locationName}</TypographyText>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Tanggal",
      key: "date",
      width: 230,
      render: (_value, row) => (
        <TypographyText>{formatActivityRange(row.startDate, row.endDate, row.timeLabel)}</TypographyText>
      ),
    },
    ...(canManageAllLabs
      ? [
          {
            title: "Lab",
            key: "lab",
            width: 190,
            render: (_value: unknown, row: AdminEventRow) =>
              row.isGlobal ? "Agenda Global DPW" : row.labName ?? "-",
          },
        ]
      : []),
    {
      title: "Aksi",
      key: "action",
      width: 150,
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
            <span className="text-lg font-semibold text-slate-900">Agenda</span>
            <Tag icon={<CalendarOutlined />} color="blue">
              {events.length}
            </Tag>
          </div>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreate}
            disabled={!canCreate}
          >
            Tambah Agenda
          </Button>
        </div>

        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={events}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          locale={{ emptyText: "Belum ada agenda." }}
        />
      </Card>

      <Modal
        open={isEditorOpen}
        onCancel={closeEditor}
        title={editingId ? "Edit agenda" : "Agenda baru"}
        width={960}
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
            {editingId ? "Simpan" : "Tambah"}
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
              <Input placeholder="Judul kegiatan" />
            </FormItem>

            <FormItem
              label="Lokasi"
              name="locationName"
              rules={[{ required: true, message: "Lokasi wajib diisi." }]}
            >
              <Input placeholder="Nama lokasi kegiatan" />
            </FormItem>

            <FormItem label="Waktu" name="timeLabel">
              <Input placeholder="08.00 - selesai" />
            </FormItem>

            <FormItem
              label="Mulai"
              name="startDate"
              rules={[{ required: true, message: "Tanggal mulai wajib diisi." }]}
            >
              <Input type="date" />
            </FormItem>

            <FormItem
              label="Selesai"
              name="endDate"
              rules={[{ required: true, message: "Tanggal selesai wajib diisi." }]}
            >
              <Input type="date" />
            </FormItem>

            <FormItem
              label="Alamat"
              name="addressDetail"
              className="md:col-span-2"
              rules={[{ required: true, message: "Alamat wajib diisi." }]}
            >
              <InputTextArea rows={3} placeholder="Alamat lengkap lokasi kegiatan" />
            </FormItem>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <FormItem label="Provinsi" required>
              <Select
                showSearch
                allowClear
                placeholder="Provinsi"
                filterOption={false}
                loading={loadingProvince}
                value={selectedProvince?.id}
                onSearch={setProvinceSearch}
                onClear={() => {
                  setSelectedProvince(null);
                  setSelectedCity(null);
                  setSelectedDistrict(null);
                  setSelectedVillage(null);
                  form.setFieldsValue({ villageType: undefined });
                  setProvinceSearch("");
                  setCitySearch("");
                  setDistrictSearch("");
                  setVillageSearch("");
                }}
                onSelect={(_value, option) => {
                  const item = (option as { item: ProvinceOption }).item;
                  setSelectedProvince(item);
                  setProvinceSearch(item.nama);
                  setSelectedCity(null);
                  setSelectedDistrict(null);
                  setSelectedVillage(null);
                  form.setFieldsValue({ villageType: undefined });
                  setCitySearch("");
                  setDistrictSearch("");
                  setVillageSearch("");
                }}
                options={mergeOption(selectedProvince, provinceOptions).map((item) => ({
                  value: item.id,
                  label: item.nama,
                  item,
                }))}
              />
            </FormItem>

            <FormItem label="Kabupaten / Kota" required>
              <Select
                showSearch
                allowClear
                placeholder="Kabupaten / Kota"
                filterOption={false}
                loading={loadingCity}
                disabled={!selectedProvince}
                value={selectedCity?.id}
                onSearch={setCitySearch}
                onClear={() => {
                  setSelectedCity(null);
                  setSelectedDistrict(null);
                  setSelectedVillage(null);
                  form.setFieldsValue({ villageType: undefined });
                  setCitySearch("");
                  setDistrictSearch("");
                  setVillageSearch("");
                }}
                onSelect={(_value, option) => {
                  const item = (option as { item: CityOption }).item;
                  setSelectedCity(item);
                  setCitySearch(item.namaTampil);
                  setSelectedDistrict(null);
                  setSelectedVillage(null);
                  form.setFieldsValue({ villageType: undefined });
                  setDistrictSearch("");
                  setVillageSearch("");
                }}
                options={mergeOption(selectedCity, cityOptions).map((item) => ({
                  value: item.id,
                  label: item.namaTampil,
                  item,
                }))}
              />
            </FormItem>

            <FormItem label="Kecamatan" required>
              <Select
                showSearch
                allowClear
                placeholder="Kecamatan"
                filterOption={false}
                loading={loadingDistrict}
                disabled={!selectedCity}
                value={selectedDistrict?.id}
                onSearch={setDistrictSearch}
                onClear={() => {
                  setSelectedDistrict(null);
                  setSelectedVillage(null);
                  form.setFieldsValue({ villageType: undefined });
                  setDistrictSearch("");
                  setVillageSearch("");
                }}
                onSelect={(_value, option) => {
                  const item = (option as { item: DistrictOption }).item;
                  setSelectedDistrict(item);
                  setDistrictSearch(item.nama);
                  setSelectedVillage(null);
                  form.setFieldsValue({ villageType: undefined });
                  setVillageSearch("");
                }}
                options={mergeOption(selectedDistrict, districtOptions).map((item) => ({
                  value: item.id,
                  label: item.nama,
                  item,
                }))}
              />
            </FormItem>

            <FormItem label="Kelurahan / Desa">
              <Select
                showSearch
                allowClear
                placeholder="Kelurahan / Desa"
                filterOption={false}
                loading={loadingVillage}
                disabled={!selectedDistrict}
                value={selectedVillage?.id}
                onSearch={setVillageSearch}
                onClear={() => {
                  setSelectedVillage(null);
                  form.setFieldsValue({ villageType: undefined });
                  setVillageSearch("");
                }}
                onSelect={(_value, option) => {
                  const item = (option as { item: VillageOption }).item;
                  setSelectedVillage(item);
                  setVillageSearch(item.nama);
                }}
                options={mergeOption(selectedVillage, villageOptions).map((item) => ({
                  value: item.id,
                  label: item.nama,
                  item,
                }))}
              />
            </FormItem>

            <FormItem label="Label alamat" name="villageType">
              <Select
                allowClear
                placeholder={selectedVillage ? "Kelurahan atau Desa" : "Pilih wilayah dulu"}
                disabled={!selectedVillage}
                options={[
                  { value: "KELURAHAN", label: "Kelurahan" },
                  { value: "DESA", label: "Desa" },
                ]}
              />
            </FormItem>

            <FormItem label="Publik" name="isPublished" valuePropName="checked">
              <Switch checkedChildren="Publik" unCheckedChildren="Draft" />
            </FormItem>
          </div>

          <div className="mt-1 grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[12px] text-slate-500">
                <span>
                  {isAutoLocating
                    ? "Menyesuaikan titik..."
                    : hasAutoLocated
                    ? "Titik sudah mengikuti alamat."
                    : canAutoLocate
                    ? "Titik akan mengikuti alamat."
                    : "Lengkapi wilayah untuk menggeser titik otomatis."}
                </span>
              </div>

              <LabCoordinatePicker
                latitude={coordinatePreview.latitude}
                longitude={coordinatePreview.longitude}
                height={250}
                showOverlay={false}
                showCoordinateBadge={false}
                resetLabel="Reset titik"
                onChange={(nextLatitude, nextLongitude) => {
                  form.setFieldsValue({
                    latitude: nextLatitude,
                    longitude: nextLongitude,
                  });
                }}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <FormItem
                label="Latitude"
                name="latitude"
                rules={[{ required: true, message: "Latitude wajib diisi." }]}
              >
                <InputNumber style={{ width: "100%" }} step={0.000001} placeholder="-6.900000" />
              </FormItem>

              <FormItem
                label="Longitude"
                name="longitude"
                rules={[{ required: true, message: "Longitude wajib diisi." }]}
              >
                <InputNumber style={{ width: "100%" }} step={0.000001} placeholder="107.600000" />
              </FormItem>
            </div>
          </div>

          <FormItem label="Catatan" name="description" style={{ marginTop: 12, marginBottom: 0 }}>
            <InputTextArea rows={3} placeholder="Ringkasan kegiatan" />
          </FormItem>
        </Form>
      </Modal>
    </>
  );
}
