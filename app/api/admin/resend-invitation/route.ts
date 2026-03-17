import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { LAB_ADMIN_ROLE, requireAdminApiAccess } from "@/lib/clerk-auth";
import { buildInvitationRedirectUrl } from "@/lib/invitation-url";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const authError = await requireAdminApiAccess();

  if (authError) {
    return authError;
  }

  try {
    const body = (await req.json()) as {
      invitationId?: string;
      email?: string;
      labId?: string;
    };

    const invitationId = String(body.invitationId ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const labId = String(body.labId ?? "").trim();

    if (!invitationId || !email || !labId) {
      return NextResponse.json(
        { error: "Data invitation tidak lengkap." },
        { status: 400 }
      );
    }

    const lab = await prisma.lab.findUnique({
      where: { id: labId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!lab) {
      return NextResponse.json(
        { error: "Laboratorium tidak ditemukan." },
        { status: 404 }
      );
    }

    const client = await clerkClient();
    const users = await client.users.getUserList({ limit: 100 });
    const activeUserForEmail = users.data.find((user) =>
      user.emailAddresses.some(
        (emailAddress) => emailAddress.emailAddress.toLowerCase() === email
      )
    );

    if (activeUserForEmail) {
      return NextResponse.json(
        { error: "Email ini sudah dipakai oleh akun aktif." },
        { status: 409 }
      );
    }

    const params = new URLSearchParams({
      lab_id: lab.id,
      lab_name: lab.name,
    });

    try {
      await client.invitations.revokeInvitation(invitationId);
    } catch (error) {
      console.warn("POST /api/admin/resend-invitation revoke warning:", error);
    }

    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      notify: true,
      publicMetadata: {
        role: LAB_ADMIN_ROLE,
        lab_id: lab.id,
        lab_name: lab.name,
      },
      redirectUrl: buildInvitationRedirectUrl(req, params),
    });

    return NextResponse.json(
      {
        ok: true,
        invitationId: invitation.id,
        invitationUrl: invitation.url ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/resend-invitation error:", error);

    const message =
      error instanceof Error ? error.message : "Gagal mengirim ulang undangan.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
