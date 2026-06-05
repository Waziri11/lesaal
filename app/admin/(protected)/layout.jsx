import { redirect } from "next/navigation";
import AdminSidebar from "../../../components/admin/AdminSidebar";
import { getAuthenticatedAdminFromCookies } from "../../../lib/auth";
import { getGreetingForTime } from "../../../lib/admin-profile";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({ children }) {
  const admin = await getAuthenticatedAdminFromCookies();

  if (!admin) {
    redirect("/");
  }

  const greeting = getGreetingForTime();
  const displayName = String(admin.firstName || admin.email?.split("@")?.[0] || "there").trim();
  const userChip = admin.firstName && admin.lastName ? `${admin.firstName} ${admin.lastName}` : admin.email;

  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content">
        <header className="admin-header">
          <div>
            <p className="admin-header-eyebrow">Admin Dashboard</p>
            <h1>{`${greeting} ${displayName}`}</h1>
          </div>
          <div className="admin-user-chip">{userChip}</div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
