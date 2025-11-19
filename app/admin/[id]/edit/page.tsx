// app/admin/[id]/edit/page.tsx
import { prisma } from "@/lib/prisma";
import LabForm, { LabFormInitial } from "@/components/admin/LabForm";
import { ModalPageLayout } from "@/components/admin/ModalPageLayout";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminEditLabPage({ params }: Params) {
  const { id } = await params;

  const lab = await prisma.lab.findUnique({
    where: { id },
    include: { types: true },
  });

  if (!lab) {
    return (
      <ModalPageLayout title="Data Tidak Ditemukan" backHref="/admin">
        <div className="text-sm text-red-300">
          Data laboratorium tidak ditemukan.
        </div>
      </ModalPageLayout>
    );
  }

  const initial: LabFormInitial = {
    id: lab.id,
    name: lab.name,
    address: lab.address,
    latitude: lab.latitude,
    longitude: lab.longitude,
    labPhotoUrl: lab.labPhotoUrl,
    head1Name: lab.head1Name,
    head1PhotoUrl: lab.head1PhotoUrl,
    head2Name: lab.head2Name,
    head2PhotoUrl: lab.head2PhotoUrl,
    phone: lab.phone,
    websiteUrl: lab.websiteUrl,
    types: lab.types.map((t) => ({ id: t.id, name: t.name })),
  };

  return (
    <ModalPageLayout title="Edit Data Laboratorium" backHref="/admin">
      <LabForm initialData={initial} />
    </ModalPageLayout>
  );
}
