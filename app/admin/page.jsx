import { redirect } from "next/navigation";
import PageState from "../../components/shared/PageState";
import { getAuthenticatedAdminFromCookies } from "../../lib/auth";
import { isAdminProfileComplete } from "../../lib/admin-profile";

export const dynamic = "force-dynamic";

export default async function AdminRootPage() {
  try {
    const admin = await getAuthenticatedAdminFromCookies();

    if (admin) {
      redirect(isAdminProfileComplete(admin) ? "/admin/dashboard" : "/admin/profile?setup=1");
    }

    redirect("/");
  } catch (error) {
    return <PageState status="error" errorMessage={error?.message || "Unable to load admin page."} />;
  }
}
