import { redirect } from "next/navigation";
import AdminSidebar from "../../../components/admin/AdminSidebar";
import { getAuthenticatedAdminFromCookies } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }) {
  const admin = await getAuthenticatedAdminFromCookies();

  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content">
        <header className="admin-header">
          <div>
            <p className="admin-header-eyebrow">Admin Dashboard</p>
            <h1>Welcome back</h1>
          </div>
          <div className="admin-user-chip">{admin.email}</div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
