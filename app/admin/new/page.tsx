// app/admin/new/page.tsx
import { ModalPageLayout } from "@/components/admin/ModalPageLayout";
import LabForm, { LabFormInitial } from "@/components/admin/LabForm";
import { requireAdminPageAccess } from "@/lib/clerk-auth";

export default async function AdminNewLabPage() {
  await requireAdminPageAccess();

  const initial: LabFormInitial = {
    name: "",
    address: "",
    addressDetail: null,
    provinceId: null,
    provinceName: null,
    cityId: null,
    cityName: null,
    cityType: null,
    districtId: null,
    districtName: null,
    villageId: null,
    villageName: null,
    villageType: null,
    latitude: -6.9,
    longitude: 107.6,
    labPhotoUrl: "",
    head1Name: null,
    head1PhotoUrl: null,
    head2Name: null,
    head2PhotoUrl: null,
    phone: null,
    websiteUrl: null,
    types: [],
  };

  return (
    <ModalPageLayout title="Tambah Laboratorium Baru" backHref="/admin">
      <LabForm initialData={initial} />
    </ModalPageLayout>
  );
}
