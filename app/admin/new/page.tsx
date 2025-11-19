// app/admin/new/page.tsx
import { ModalPageLayout } from "@/components/admin/ModalPageLayout";
import LabForm, { LabFormInitial } from "@/components/admin/LabForm";

export default async function AdminNewLabPage() {
  const initial: LabFormInitial = {
    name: "",
    address: "",
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
