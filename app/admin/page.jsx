import { redirect } from "next/navigation";
import { getAuthenticatedAdminFromCookies } from "../../lib/auth";
import { isAdminProfileComplete } from "../../lib/admin-profile";

export const dynamic = "force-dynamic";

export default async function AdminRootPage() {
  const admin = await getAuthenticatedAdminFromCookies();

  if (admin) {
    redirect(isAdminProfileComplete(admin) ? "/admin/dashboard" : "/admin/profile?setup=1");
  }

  redirect("/admin/login");
}
