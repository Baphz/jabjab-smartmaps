import { redirect } from "next/navigation";
import { getAppBranding } from "@/lib/app-branding";
import { getCurrentClerkSession } from "@/lib/clerk-auth";
import { LoginForm } from "../LoginForm";

export default async function LoginPage() {
  const branding = await getAppBranding();
  const session = await getCurrentClerkSession();

  if (session.canAccessDashboard) {
    redirect("/admin");
  }

  if (session.userId) {
    redirect("/");
  }

  return <LoginForm branding={branding} />;
}
