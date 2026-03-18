// components/admin/LabForm.tsx
"use client";

import { AimOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
  notification,
} from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import LabCoordinatePicker from "@/components/admin/LabCoordinatePicker";
import useAddressCoordinateAutofill from "@/components/admin/useAddressCoordinateAutofill";
import {
  buildLabAddress,
  formatCityName,
  normalizeWhitespace,
  type LabCityTypeValue,
  type LabVillageTypeValue,
} from "@/lib/lab-address";

const { Paragraph: TypographyParagraph, Text: TypographyText, Title: TypographyTitle } =
  Typography;
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

export type LabTypeChip = {
  id: string;
  name: string;
};

export type LabFormInitial = {
  id?: string;
  name: string;
  address: string;
  addressDetail?: string | null;
  provinceId?: string | null;
  provinceName?: string | null;
  cityId?: string | null;
  cityName?: string | null;
  cityType?: LabCityTypeValue | null;
  districtId?: string | null;
  districtName?: string | null;
  villageId?: string | null;
  villageName?: string | null;
  villageType?: LabVillageTypeValue | null;
  latitude: number;
  longitude: number;
  labPhotoUrl: string;
  head1Name: string | null;
  head1PhotoUrl: string | null;
  head2Name: string | null;
  head2PhotoUrl: string | null;
  phone: string | null;
  websiteUrl: string | null;
  types: LabTypeChip[];
};

type LabFormProps = {
  initialData?: LabFormInitial;
};

type LabFormValue = {
  name: string;
  addressDetail: string;
  villageType?: LabVillageTypeValue;
  latitude: number;
  longitude: number;
  labPhotoUrl: string;
  head1Name?: string;
  head1PhotoUrl?: string;
  head2Name?: string;
  head2PhotoUrl?: string;
  phone?: string;
  websiteUrl?: string;
  types: string[];
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
  return options.some((item) => item.id === selected.id)
    ? options
    : [selected, ...options];
}

export default function LabForm({ initialData }: LabFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initialData?.id);
  const [form] = Form.useForm<LabFormValue>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificationApi, contextHolder] = notification.useNotification();

  const [provinceOptions, setProvinceOptions] = useState<ProvinceOption[]>([]);
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<DistrictOption[]>([]);
  const [villageOptions, setVillageOptions] = useState<VillageOption[]>([]);

  const [provinceSearch, setProvinceSearch] = useState(initialData?.provinceName ?? "");
  const [citySearch, setCitySearch] = useState(initialData?.cityName ?? "");
  const [districtSearch, setDistrictSearch] = useState(initialData?.districtName ?? "");
  const [villageSearch, setVillageSearch] = useState(initialData?.villageName ?? "");

  const [selectedProvince, setSelectedProvince] = useState<ProvinceOption | null>(
    initialData?.provinceId && initialData?.provinceName
      ? {
          id: initialData.provinceId,
          nama: initialData.provinceName,
        }
      : null
  );
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(
    initialData?.cityId && initialData?.cityName
      ? {
          id: initialData.cityId,
          nama: initialData.cityName,
          tipe: initialData.cityType ?? "KABUPATEN",
          namaTampil: formatCityName(initialData.cityName, initialData.cityType),
        }
      : null
  );
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictOption | null>(
    initialData?.districtId && initialData?.districtName
      ? {
          id: initialData.districtId,
          nama: initialData.districtName,
        }
      : null
  );
  const [selectedVillage, setSelectedVillage] = useState<VillageOption | null>(
    initialData?.villageId && initialData?.villageName
      ? {
          id: initialData.villageId,
          nama: initialData.villageName,
        }
      : null
  );

  const [loadingProvince, setLoadingProvince] = useState(false);
  const [loadingCity, setLoadingCity] = useState(false);
  const [loadingDistrict, setLoadingDistrict] = useState(false);
  const [loadingVillage, setLoadingVillage] = useState(false);

  const title = useMemo(
    () => (isEdit ? "Edit Laboratorium" : "Tambah Laboratorium"),
    [isEdit]
  );

  const initialValues = useMemo<LabFormValue>(
    () => ({
      name: initialData?.name ?? "",
      addressDetail: initialData?.addressDetail ?? "",
      villageType: initialData?.villageType ?? undefined,
      latitude: initialData?.latitude ?? -6.9,
      longitude: initialData?.longitude ?? 107.6,
      labPhotoUrl: initialData?.labPhotoUrl ?? "",
      head1Name: initialData?.head1Name ?? undefined,
      head1PhotoUrl: initialData?.head1PhotoUrl ?? undefined,
      head2Name: initialData?.head2Name ?? undefined,
      head2PhotoUrl: initialData?.head2PhotoUrl ?? undefined,
      phone: initialData?.phone ?? undefined,
      websiteUrl: initialData?.websiteUrl ?? undefined,
      types: initialData?.types.map((type) => type.name) ?? [],
    }),
    [initialData]
  );

  const watchedAddressDetail = Form.useWatch("addressDetail", form);
  const watchedVillageType = Form.useWatch("villageType", form);
  const watchedLatitude = Form.useWatch("latitude", form);
  const watchedLongitude = Form.useWatch("longitude", form);

  const {
    canResolve: canAutoLocate,
    hasResolvedOnce: hasAutoLocated,
    isResolving: isAutoLocating,
  } = useAddressCoordinateAutofill({
    resetKey: initialData?.id ?? "create-lab",
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

  const addressPreview = useMemo(
    () =>
      buildLabAddress({
        addressDetail: watchedAddressDetail,
        provinceName: selectedProvince?.nama ?? null,
        cityName: selectedCity?.namaTampil ?? null,
        cityType: selectedCity?.tipe ?? null,
        districtName: selectedDistrict?.nama ?? null,
        villageName: selectedVillage?.nama ?? null,
        villageType: watchedVillageType ?? null,
        fallbackAddress: initialData?.address ?? null,
      }),
    [
      initialData?.address,
      selectedCity?.namaTampil,
      selectedCity?.tipe,
      selectedDistrict?.nama,
      selectedProvince?.nama,
      selectedVillage?.nama,
      watchedAddressDetail,
      watchedVillageType,
    ]
  );

  const coordinatePreview = useMemo(
    () => ({
      latitude:
        typeof watchedLatitude === "number" && Number.isFinite(watchedLatitude)
          ? watchedLatitude
          : initialValues.latitude,
      longitude:
        typeof watchedLongitude === "number" && Number.isFinite(watchedLongitude)
          ? watchedLongitude
          : initialValues.longitude,
    }),
    [initialValues.latitude, initialValues.longitude, watchedLatitude, watchedLongitude]
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingProvince(true);

    fetchJson<ProvinceOption[]>(
      `/api/wilayah/provinsi?search=${encodeURIComponent(provinceSearch)}`
    )
      .then((data) => {
        if (!cancelled) {
          setProvinceOptions(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Gagal memuat provinsi:", error);
          setProvinceOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingProvince(false);
        }
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
        if (!cancelled) {
          setCityOptions(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Gagal memuat kabupaten/kota:", error);
          setCityOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCity(false);
        }
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
        if (!cancelled) {
          setDistrictOptions(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Gagal memuat kecamatan:", error);
          setDistrictOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDistrict(false);
        }
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
        if (!cancelled) {
          setVillageOptions(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Gagal memuat kelurahan/desa:", error);
          setVillageOptions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingVillage(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDistrict?.id, villageSearch]);

  const openError = (message: string, description: string) => {
    notificationApi.error({
      message,
      description,
    });
  };

  const handleSubmit = async (values: LabFormValue) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const latitude = Number(values.latitude);
      const longitude = Number(values.longitude);

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        openError(
          "Data tidak valid",
          "Latitude dan longitude harus berupa angka yang valid."
        );
        setIsSubmitting(false);
        return;
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        openError(
          "Koordinat tidak valid",
          "Pastikan latitude berada di antara -90 sampai 90 dan longitude di antara -180 sampai 180."
        );
        setIsSubmitting(false);
        return;
      }

      const addressDetail = normalizeWhitespace(values.addressDetail ?? "");
      const address = buildLabAddress({
        addressDetail,
        provinceName: selectedProvince?.nama ?? null,
        cityName: selectedCity?.namaTampil ?? null,
        cityType: selectedCity?.tipe ?? null,
        districtName: selectedDistrict?.nama ?? null,
        villageName: selectedVillage?.nama ?? null,
        villageType: values.villageType ?? null,
      });

      const body = {
        name: values.name.trim(),
        address,
        addressDetail: addressDetail || null,
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
        latitude,
        longitude,
        labPhotoUrl: values.labPhotoUrl.trim(),
        head1Name: values.head1Name?.trim() || null,
        head1PhotoUrl: values.head1PhotoUrl?.trim() || null,
        head2Name: values.head2Name?.trim() || null,
        head2PhotoUrl: values.head2PhotoUrl?.trim() || null,
        phone: values.phone?.trim() || null,
        websiteUrl: values.websiteUrl?.trim() || null,
        types: (values.types ?? [])
          .map((type) => type.trim())
          .filter(Boolean),
      };

      if (!body.name || !addressDetail) {
        openError(
          "Data belum lengkap",
          "Nama laboratorium dan detail alamat wajib diisi."
        );
        setIsSubmitting(false);
        return;
      }

      if (!selectedProvince || !selectedCity || !selectedDistrict) {
        openError(
          "Wilayah belum lengkap",
          "Pilih minimal provinsi, kabupaten/kota, dan kecamatan dari referensi wilayah."
        );
        setIsSubmitting(false);
        return;
      }

      const endpoint = isEdit
        ? `/api/labs/${encodeURIComponent(String(initialData?.id))}`
        : "/api/labs";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let message = "Gagal menyimpan data laboratorium.";

        try {
          const data: unknown = await res.json();
          if (
            data &&
            typeof data === "object" &&
            "error" in data &&
            typeof (data as { error: unknown }).error === "string"
          ) {
            message = (data as { error: string }).error;
          }
        } catch {
          // abaikan error parse JSON
        }

        openError("Gagal menyimpan", message);
        setIsSubmitting(false);
        return;
      }

      notificationApi.success({
        message: isEdit ? "Perubahan disimpan" : "Laboratorium ditambahkan",
        description: "Data laboratorium berhasil disimpan.",
      });
      router.push("/admin");
      router.refresh();
    } catch (err: unknown) {
      const detail =
        err instanceof Error ? err.message : "Terjadi kesalahan tidak diketahui";
      console.error("LabForm submit error:", err);

      openError("Gagal menyimpan", `Terjadi kesalahan: ${detail}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={handleSubmit}
        requiredMark={false}
        className="space-y-6"
      >
        <Space orientation="vertical" size={4}>
          <TypographyTitle level={4} style={{ marginBottom: 0 }}>
            {title}
          </TypographyTitle>
          <TypographyParagraph
            style={{ marginBottom: 0, color: "#64748b" }}
          >
            Isi data dasar, alamat terstruktur berbasis referensi wilayah, kontak, profil pimpinan, dan koordinat laboratorium.
          </TypographyParagraph>
        </Space>

        <Row gutter={[20, 20]}>
          <Col xs={24} xl={12}>
            <Card variant="borderless" title="Informasi Umum">
              <FormItem
                label="Nama laboratorium"
                name="name"
                rules={[{ required: true, message: "Nama laboratorium wajib diisi." }]}
              >
                <Input placeholder="Nama laboratorium" />
              </FormItem>

              <FormItem
                label="Detail alamat"
                name="addressDetail"
                rules={[{ required: true, message: "Detail alamat wajib diisi." }]}
                extra="Isi jalan, nomor, kompleks, RT/RW, dusun, dan kode pos. Wilayah administratif dipilih dari referensi di bawah."
              >
                <InputTextArea rows={4} placeholder="Jl. ..., RT/RW ..., kode pos ..." />
              </FormItem>

              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <FormItem label="Provinsi" required>
                    <Select
                      showSearch
                      allowClear
                      placeholder="Cari provinsi"
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
                      onSelect={(value, option) => {
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
                </Col>

                <Col xs={24} md={12}>
                  <FormItem label="Kabupaten / Kota" required>
                    <Select
                      showSearch
                      allowClear
                      placeholder="Cari kabupaten / kota"
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
                      onSelect={(value, option) => {
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
                </Col>

                <Col xs={24} md={12}>
                  <FormItem label="Kecamatan" required>
                    <Select
                      showSearch
                      allowClear
                      placeholder="Cari kecamatan"
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
                      onSelect={(value, option) => {
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
                </Col>

                <Col xs={24} md={12}>
                  <FormItem label="Kelurahan / Desa">
                    <div className="grid gap-2 sm:grid-cols-[144px_minmax(0,1fr)]">
                      <FormItem name="villageType" noStyle>
                        <Select
                          allowClear
                          placeholder="Jenis"
                          disabled={!selectedDistrict}
                          options={[
                            { value: "KELURAHAN", label: "Kelurahan" },
                            { value: "DESA", label: "Desa" },
                          ]}
                        />
                      </FormItem>

                      <Select
                        showSearch
                        allowClear
                        placeholder={
                          watchedVillageType === "DESA"
                            ? "Cari nama desa"
                            : watchedVillageType === "KELURAHAN"
                              ? "Cari nama kelurahan"
                              : "Cari nama kelurahan / desa"
                        }
                        filterOption={false}
                        loading={loadingVillage}
                        disabled={!selectedDistrict}
                        value={selectedVillage?.id}
                        onSearch={setVillageSearch}
                        onClear={() => {
                          setSelectedVillage(null);
                          setVillageSearch("");
                        }}
                        onSelect={(value, option) => {
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
                    </div>
                  </FormItem>
                </Col>
              </Row>

              <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Alamat Lengkap
                </div>
                <TypographyText style={{ color: "#334155" }}>
                  {addressPreview || "-"}
                </TypographyText>
              </div>
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card variant="borderless" title="Kontak Instansi">
              <FormItem label="Nomor telepon" name="phone">
                <Input placeholder="mis. (022) 1234567 / 0812xxxxxxx" />
              </FormItem>

              <FormItem label="Website resmi" name="websiteUrl">
                <Input placeholder="mis. labkesda.jabarprov.go.id" />
              </FormItem>
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card variant="borderless" title="Foto & Pimpinan">
              <FormItem label="Foto laboratorium" name="labPhotoUrl">
                <ImageUploadField
                  kind="lab-photo"
                  labId={initialData?.id}
                  title="Foto laboratorium"
                  disabled={isSubmitting}
                />
              </FormItem>

              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <FormItem label="Nama Kepala Lab" name="head1Name">
                    <Input placeholder="Nama kepala laboratorium" />
                  </FormItem>
                  <FormItem label="Foto Kepala Lab" name="head1PhotoUrl">
                    <ImageUploadField
                      kind="head1-photo"
                      labId={initialData?.id}
                      title="Foto Kepala Lab"
                      disabled={isSubmitting}
                    />
                  </FormItem>
                </Col>

                <Col xs={24} md={12}>
                  <FormItem label="Nama KaSubBag Tata Usaha" name="head2Name">
                    <Input placeholder="Nama KaSubBag Tata Usaha" />
                  </FormItem>
                  <FormItem label="Foto Kasubbag TU" name="head2PhotoUrl">
                    <ImageUploadField
                      kind="head2-photo"
                      labId={initialData?.id}
                      title="Foto Kasubbag TU"
                      disabled={isSubmitting}
                    />
                  </FormItem>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card variant="borderless" title="Koordinat Peta">
              <Space orientation="vertical" size={12} style={{ width: "100%", marginBottom: 16 }}>
                <div className="flex items-center gap-2 text-[12px] text-slate-500">
                  <AimOutlined className="text-slate-400" />
                  <span>
                    {isAutoLocating
                      ? "Menyesuaikan titik dari alamat..."
                      : hasAutoLocated
                      ? "Titik sudah mengikuti alamat. Geser pin bila perlu."
                      : canAutoLocate
                      ? "Titik akan mengikuti alamat yang dipilih."
                      : "Isi wilayah sampai kecamatan dan kelurahan/desa agar titik ikut bergerak."}
                  </span>
                </div>

                <LabCoordinatePicker
                  latitude={coordinatePreview.latitude}
                  longitude={coordinatePreview.longitude}
                  onChange={(nextLatitude, nextLongitude) => {
                    form.setFieldsValue({
                      latitude: nextLatitude,
                      longitude: nextLongitude,
                    });
                  }}
                />
              </Space>

              <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                  <FormItem
                    label="Latitude"
                    name="latitude"
                    rules={[{ required: true, message: "Latitude wajib diisi." }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      step={0.000001}
                      placeholder="-6.900000"
                    />
                  </FormItem>
                </Col>

                <Col xs={24} md={12}>
                  <FormItem
                    label="Longitude"
                    name="longitude"
                    rules={[{ required: true, message: "Longitude wajib diisi." }]}
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      step={0.000001}
                      placeholder="107.600000"
                    />
                  </FormItem>
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24}>
            <Card variant="borderless" title="Tipe Laboratorium">
              <FormItem
                label="Daftar tipe"
                name="types"
                extra="Gunakan Enter untuk menambahkan tipe baru. Contoh: BLUD, LABKESMAS, RS, SWASTA."
              >
                <Select
                  mode="tags"
                  tokenSeparators={[","]}
                  placeholder="Tambah tipe laboratorium"
                  options={[]}
                />
              </FormItem>
            </Card>
          </Col>
        </Row>

        <div className="flex justify-end gap-2">
          <Button onClick={() => router.push("/admin")}>Batal</Button>
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            {isSubmitting
              ? isEdit
                ? "Menyimpan..."
                : "Membuat..."
              : isEdit
              ? "Simpan Perubahan"
              : "Tambah Laboratorium"}
          </Button>
        </div>
      </Form>
    </>
  );
}
