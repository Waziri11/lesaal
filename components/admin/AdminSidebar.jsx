"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "../../lib/constants";
import { createCsrfHeaders } from "../../lib/csrf-client";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", {
      method: "POST",
      headers: createCsrfHeaders(),
    });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <p>LESAAL</p>
        <span>Admin CMS</span>
      </div>

      <nav className="admin-nav">
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href} className={isActive ? "active" : ""}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button type="button" className="admin-logout-btn" onClick={handleLogout}>
        Logout
      </button>
    </aside>
  );
}
