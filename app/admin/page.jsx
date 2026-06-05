import { redirect } from "next/navigation";
import { getAuthenticatedAdminFromCookies } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminRootPage() {
  const admin = await getAuthenticatedAdminFromCookies();

  if (admin) {
    redirect("/admin/dashboard");
  }

  redirect("/");
}
