import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/clerk-auth";

export async function POST(req: Request) {
  const authError = await requireAdminApiAccess();

  if (authError) {
    return authError;
  }

  try {
    const body = (await req.json()) as {
      invitationId?: string;
    };

    const invitationId = String(body.invitationId ?? "").trim();

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID wajib diisi." },
        { status: 400 }
      );
    }

    const client = await clerkClient();
    await client.invitations.revokeInvitation(invitationId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/admin/cancel-invitation error:", error);

    const message =
      error instanceof Error ? error.message : "Gagal membatalkan undangan.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
