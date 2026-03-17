import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { LAB_ADMIN_ROLE, requireAdminApiAccess } from "@/lib/clerk-auth";
import { prisma } from "@/lib/prisma";

function normalizeBaseUrl(value?: string | null) {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return null;
  }

  const withProtocol =
    raw.startsWith("http://") || raw.startsWith("https://")
      ? raw
      : `https://${raw}`;

  try {
    const url = new URL(withProtocol);
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function getBaseUrl(req: Request) {
  const envCandidates = [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of envCandidates) {
    const normalized = normalizeBaseUrl(candidate);

    if (!normalized) {
      continue;
    }

    const hostname = new URL(normalized).hostname;

    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return normalized;
    }
  }

  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") ?? "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  for (const candidate of envCandidates) {
    const normalized = normalizeBaseUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  const authError = await requireAdminApiAccess();

  if (authError) {
    return authError;
  }

  try {
    const body = (await req.json()) as {
      email?: string;
      labId?: string;
    };

    const email = String(body.email ?? "").trim().toLowerCase();
    const labId = String(body.labId ?? "").trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email wajib diisi." },
        { status: 400 }
      );
    }

    if (!labId) {
      return NextResponse.json(
        { error: "Laboratorium wajib dipilih." },
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
    const [users, invitations] = await Promise.all([
      client.users.getUserList({ limit: 100 }),
      client.invitations.getInvitationList({ limit: 100 }),
    ]);

    const activeUserForLab = users.data.find(
      (user) => user.publicMetadata?.lab_id === lab.id
    );

    if (activeUserForLab) {
      return NextResponse.json(
        { error: "Laboratorium ini sudah memiliki akun aktif." },
        { status: 409 }
      );
    }

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

    const pendingInvitation = invitations.data.find(
      (invitation) =>
        invitation.emailAddress.toLowerCase() === email ||
        invitation.publicMetadata?.lab_id === lab.id
    );

    if (pendingInvitation) {
      return NextResponse.json(
        { error: "Sudah ada invitation aktif untuk email atau laboratorium ini." },
        { status: 409 }
      );
    }

    const params = new URLSearchParams({
      lab_id: lab.id,
      lab_name: lab.name,
    });

    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: {
        role: LAB_ADMIN_ROLE,
        lab_id: lab.id,
        lab_name: lab.name,
      },
      redirectUrl: `${getBaseUrl(req)}/accept-invitation?${params.toString()}`,
    });

    return NextResponse.json(
      {
        ok: true,
        invitationId: invitation.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/admin/invite-user error:", error);

    const message =
      error instanceof Error ? error.message : "Gagal mengirim undangan.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
