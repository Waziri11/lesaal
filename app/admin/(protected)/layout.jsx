import { redirect } from "next/navigation";
import AdminSidebar from "../../../components/admin/AdminSidebar";
import { AdminThemeProvider } from "../../../components/admin/AdminThemeProvider";
import { getAuthenticatedAdminFromCookies } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }) {
  const admin = await getAuthenticatedAdminFromCookies();

  if (!admin) {
    redirect("/");
  }

  return (
    <AdminThemeProvider>
      <div className="grid min-h-screen grid-cols-1 lg:h-screen lg:grid-cols-[272px_minmax(0,1fr)] lg:overflow-hidden">
        <AdminSidebar admin={admin} />
        <div className="px-4 py-4 sm:px-6 lg:min-h-0 lg:overflow-y-auto">
          <main>{children}</main>
        </div>
      </div>
    </AdminThemeProvider>
  );
}
