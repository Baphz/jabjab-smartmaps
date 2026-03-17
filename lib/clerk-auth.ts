import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

export const ADMIN_ROLE = "admin";
export const LAB_ADMIN_ROLE = "lab_admin";

export type AppRole = typeof ADMIN_ROLE | typeof LAB_ADMIN_ROLE;

type UserWithMetadata =
  | {
      publicMetadata?: UserPublicMetadata | null;
    }
  | null
  | undefined;

function normalizeRole(value: unknown): AppRole | null {
  if (value === ADMIN_ROLE || value === LAB_ADMIN_ROLE) {
    return value;
  }

  return null;
}

export function getUserRole(user: UserWithMetadata) {
  return normalizeRole(user?.publicMetadata?.role);
}

function getUserLabId(user: UserWithMetadata) {
  const value = user?.publicMetadata?.lab_id;
  return typeof value === "string" && value.trim() ? value : null;
}

function getUserLabName(user: UserWithMetadata) {
  const value = user?.publicMetadata?.lab_name;
  return typeof value === "string" && value.trim() ? value : null;
}

export async function getCurrentClerkSession() {
  const { userId } = await auth();

  if (!userId) {
    return {
      userId: null,
      user: null,
      role: null,
      labId: null,
      labName: null,
      isAdmin: false,
      isLabAdmin: false,
      canAccessDashboard: false,
    };
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const role = getUserRole(user);
  const labId = getUserLabId(user);
  const labName = getUserLabName(user);

  return {
    userId,
    user,
    role,
    labId,
    labName,
    isAdmin: role === ADMIN_ROLE,
    isLabAdmin: role === LAB_ADMIN_ROLE,
    canAccessDashboard: role === ADMIN_ROLE || role === LAB_ADMIN_ROLE,
  };
}

export async function requireAdminApiAccess() {
  const session = await getCurrentClerkSession();

  if (!session.userId) {
    return NextResponse.json(
      { error: "Unauthorized. Silakan login terlebih dahulu." },
      { status: 401 }
    );
  }

  if (!session.isAdmin) {
    return NextResponse.json(
      { error: "Forbidden. Akun ini tidak memiliki akses admin." },
      { status: 403 }
    );
  }

  return null;
}

export async function requireLabWriteApiAccess(labId: string) {
  const session = await getCurrentClerkSession();

  if (!session.userId) {
    return NextResponse.json(
      { error: "Unauthorized. Silakan login terlebih dahulu." },
      { status: 401 }
    );
  }

  if (session.isAdmin) {
    return null;
  }

  if (session.isLabAdmin && session.labId === labId) {
    return null;
  }

  return NextResponse.json(
    { error: "Forbidden. Akun ini tidak memiliki akses ke laboratorium ini." },
    { status: 403 }
  );
}

export async function requireDashboardPageAccess() {
  const session = await getCurrentClerkSession();

  if (!session.userId) {
    redirect("/login?redirect_url=/admin");
  }

  if (!session.canAccessDashboard) {
    redirect("/");
  }

  return session;
}

export async function requireAdminPageAccess() {
  const session = await requireDashboardPageAccess();

  if (!session.isAdmin) {
    redirect("/admin");
  }

  return session;
}
