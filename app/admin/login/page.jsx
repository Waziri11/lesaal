import { redirect } from "next/navigation";
import AdminLoginForm from "./AdminLoginForm";
import PageState from "../../../components/shared/PageState";
import { getAuthenticatedAdminFromCookies } from "../../../lib/auth";
import { getSecurityConfig } from "../../../lib/security-config";
import { isAdminProfileComplete } from "../../../lib/admin-profile";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const admin = await getAuthenticatedAdminFromCookies();

  if (admin) {
    redirect(isAdminProfileComplete(admin) ? "/admin/dashboard" : "/admin/profile?setup=1");
  }

  try {
    const { turnstileSiteKey } = getSecurityConfig();

    return <AdminLoginForm turnstileSiteKey={turnstileSiteKey} />;
  } catch (error) {
    return <PageState status="error" errorMessage={error?.message || "Unable to load login page."} />;
  }
}
