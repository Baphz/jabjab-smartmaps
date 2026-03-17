import { redirect } from "next/navigation";
import { getCurrentClerkSession } from "@/lib/clerk-auth";
import { LoginForm } from "../LoginForm";

export default async function LoginPage() {
  const session = await getCurrentClerkSession();

  if (session.canAccessDashboard) {
    redirect("/admin");
  }

  if (session.userId) {
    redirect("/");
  }

  return <LoginForm />;
}
