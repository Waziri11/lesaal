import { redirect } from "next/navigation";
import AdminSidebar from "../../../components/admin/AdminSidebar";
import { AdminThemeProvider } from "../../../components/admin/AdminThemeProvider";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";
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
    <AdminThemeProvider>
      <div className="grid min-h-screen grid-cols-1 lg:h-screen lg:grid-cols-[320px_minmax(0,1fr)] lg:overflow-hidden">
        <AdminSidebar admin={admin} />
        <div className="px-4 py-4 sm:px-6 lg:min-h-0 lg:overflow-y-auto">
          <Card className="mb-4 border-[color:var(--ui-border)]">
            <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Admin Dashboard</p>
                <h1 className="text-2xl font-semibold">{`${greeting} ${displayName}`}</h1>
              </div>
              <Badge>{userChip}</Badge>
            </header>
          </Card>
          <main>{children}</main>
        </div>
      </div>
    </AdminThemeProvider>
  );
}
