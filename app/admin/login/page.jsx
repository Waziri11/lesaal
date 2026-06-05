import { redirect } from "next/navigation";
import AdminLoginForm from "./AdminLoginForm";
import { getAuthenticatedAdminFromCookies } from "../../../lib/auth";
import { getSecurityConfig } from "../../../lib/security-config";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getAuthenticatedAdminFromCookies();

  if (admin) {
    redirect("/admin/dashboard");
  }

  const { turnstileSiteKey } = getSecurityConfig();


  return <AdminLoginForm turnstileSiteKey={turnstileSiteKey} />;
}

