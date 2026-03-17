// app/admin/[id]/edit/page.tsx
import { redirect } from "next/navigation";
import { Alert } from "antd";
import { prisma } from "@/lib/prisma";
import LabForm, { LabFormInitial } from "@/components/admin/LabForm";
import { ModalPageLayout } from "@/components/admin/ModalPageLayout";
import { requireDashboardPageAccess } from "@/lib/clerk-auth";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminEditLabPage({ params }: Params) {
  const session = await requireDashboardPageAccess();
  const { id } = await params;

  if (session.isLabAdmin && session.labId !== id) {
    redirect("/admin");
  }

  const lab = await prisma.lab.findUnique({
    where: { id },
    include: { types: true },
  });

  if (!lab) {
    return (
      <ModalPageLayout title="Data Tidak Ditemukan" backHref="/admin">
        <Alert
          type="error"
          showIcon
          title="Data laboratorium tidak ditemukan."
        />
      </ModalPageLayout>
    );
  }

  const initial: LabFormInitial = {
    id: lab.id,
    name: lab.name,
    address: lab.address,
    addressDetail: lab.addressDetail,
    provinceId: lab.provinceId,
    provinceName: lab.provinceName,
    cityId: lab.cityId,
    cityName: lab.cityName,
    cityType: lab.cityType,
    districtId: lab.districtId,
    districtName: lab.districtName,
    villageId: lab.villageId,
    villageName: lab.villageName,
    villageType: lab.villageType,
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
