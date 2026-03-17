import { requireDashboardPageAccess } from "@/lib/clerk-auth";

type AdminLayoutProps = {
  children: React.ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireDashboardPageAccess();

  return children;
}
