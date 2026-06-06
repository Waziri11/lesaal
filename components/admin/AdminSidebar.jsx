"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_NAV_ITEMS } from "../../lib/constants";
import { createCsrfHeaders } from "../../lib/csrf-client";
import AdminThemeToggle from "./AdminThemeToggle";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Separator } from "../ui/separator";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", {
      method: "POST",
      headers: createCsrfHeaders(),
    });
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="border-r border-[color:var(--ui-border)] bg-[color:var(--ui-card)]/70 px-4 py-4 lg:sticky lg:top-0 lg:min-h-screen">
      <Card>
        <CardHeader className="pb-2">
          <p className="text-sm font-semibold tracking-wide">LESAAL</p>
          <span className="text-xs text-[color:var(--ui-muted-foreground)]">Admin CMS</span>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <nav className="grid gap-2">
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Button key={item.href} variant={isActive ? "secondary" : "ghost"} className="justify-start" asChild>
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              );
            })}
          </nav>
          <Separator />
          <AdminThemeToggle />
          <Button type="button" variant="outline" className="w-full" onClick={handleLogout}>
            Logout
          </Button>
        </CardContent>
      </Card>
    </aside>
  );
}
