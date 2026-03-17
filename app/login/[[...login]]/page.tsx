import { redirect } from "next/navigation";
import { getCurrentClerkSession, isClerkConfigured } from "@/lib/clerk-auth";
import { LoginForm } from "../LoginForm";

export default async function LoginPage() {
  if (!isClerkConfigured()) {
    return <LoginForm clerkEnabled={false} />;
  }

  const session = await getCurrentClerkSession();

  if (session.canAccessDashboard) {
    redirect("/admin");
  }

  if (session.userId) {
    redirect("/");
  }

  return <LoginForm clerkEnabled />;
}
