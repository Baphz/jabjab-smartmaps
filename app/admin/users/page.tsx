import { clerkClient } from "@clerk/nextjs/server";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminUsersManager, {
  type ActiveLabUserRow,
  type PendingInvitationRow,
} from "@/components/admin/AdminUsersManager";
import AdminSectionIntro from "@/components/admin/AdminSectionIntro";
import { LAB_ADMIN_ROLE, requireAdminPageAccess } from "@/lib/clerk-auth";
import { prisma } from "@/lib/prisma";

function getPrimaryEmail(user: {
  primaryEmailAddressId: string | null;
  emailAddresses: Array<{ id: string; emailAddress: string }>;
}) {
  return (
    user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId
    )?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "-"
  );
}

export default async function AdminUsersPage() {
  await requireAdminPageAccess();

  const client = await clerkClient();
  const [labs, users, invitations] = await Promise.all([
    prisma.lab.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    client.users.getUserList({ limit: 100 }),
    client.invitations.getInvitationList({ limit: 100 }),
  ]);

  const activeUsers: ActiveLabUserRow[] = users.data
    .filter((user) => user.publicMetadata?.role === LAB_ADMIN_ROLE)
    .map((user) => ({
      id: user.id,
      email: getPrimaryEmail(user),
      labId:
        typeof user.publicMetadata?.lab_id === "string"
          ? user.publicMetadata.lab_id
          : null,
      labName:
        typeof user.publicMetadata?.lab_name === "string"
          ? user.publicMetadata.lab_name
          : null,
      createdAt: new Date(user.createdAt).toISOString(),
    }));

  const pendingInvitations: PendingInvitationRow[] = invitations.data
    .filter((invitation) => invitation.publicMetadata?.role === LAB_ADMIN_ROLE)
    .map((invitation) => ({
      id: invitation.id,
      email: invitation.emailAddress,
      labId:
        typeof invitation.publicMetadata?.lab_id === "string"
          ? invitation.publicMetadata.lab_id
          : null,
      labName:
        typeof invitation.publicMetadata?.lab_name === "string"
          ? invitation.publicMetadata.lab_name
          : null,
      createdAt: new Date(invitation.createdAt).toISOString(),
    }));

  const reservedLabIds = new Set<string>();

  for (const user of activeUsers) {
    if (user.labId) {
      reservedLabIds.add(user.labId);
    }
  }

  for (const invitation of pendingInvitations) {
    if (invitation.labId) {
      reservedLabIds.add(invitation.labId);
    }
  }

  const labOptions = labs.map((lab) => ({
    value: lab.id,
    label: `${lab.name} (${lab.id})`,
    disabled: reservedLabIds.has(lab.id),
  }));

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <AdminHeader isAdmin labName={null} />

        <AdminSectionIntro
          eyebrow="Akses"
          title="Manajemen Akun Labkesda"
          description="Seluruh akun laboratorium dibuat lewat email invitation. Tidak ada sign-up publik di aplikasi ini."
        />

        <AdminUsersManager
          labs={labOptions}
          activeUsers={activeUsers}
          pendingInvitations={pendingInvitations}
        />
      </div>
    </main>
  );
}
