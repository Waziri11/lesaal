"use client";

import Link from "next/link";
import {
  Bell,
  Briefcase,
  CalendarDays,
  ChevronDown,
  FileText,
  Folder,
  Globe,
  Image,
  LayoutDashboard,
  Megaphone,
  Plus,
  Search,
  Settings,
  User,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createCsrfHeaders } from "../../lib/csrf-client";
import AdminThemeToggle from "./AdminThemeToggle";
import { Button } from "../ui/button";

const PRIMARY_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Campaigns", href: "/admin/campaigns", icon: Megaphone },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "Landing Page", href: "/admin/landing-page", icon: Globe },
  { label: "CRM", href: "/admin/crm", icon: Briefcase },
  { label: "Calendar", href: "/admin/calendar", icon: CalendarDays },
  { label: "Profile", href: "/admin/profile", icon: User },
];

const FOLDER_ITEMS = [
  {
    label: "Media",
    href: "",
    icon: Image,
    isEnabled: false,
  },
  {
    label: "Notes",
    href: "/admin/notes",
    icon: FileText,
    isEnabled: true,
  },
  {
    label: "Plan Management",
    href: "",
    icon: Folder,
    isEnabled: false,
  },
];

function getInitials(admin) {
  const first = String(admin?.firstName || "").trim();
  const last = String(admin?.lastName || "").trim();

  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }

  if (first) {
    return first.slice(0, 2).toUpperCase();
  }

  const email = String(admin?.email || "").trim();
  return email ? email.slice(0, 2).toUpperCase() : "AD";
}

export default function AdminSidebar({ admin = null }) {
  const pathname = usePathname();
  const router = useRouter();

  const companyName = String(admin?.companyName || "").trim() || "Lesaal";
  const initials = getInitials(admin);

  async function handleLogout() {
    await fetch("/api/admin/logout", {
      method: "POST",
      headers: createCsrfHeaders(),
    });
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="flex min-h-screen flex-col border-r border-[color:var(--ui-border)] bg-[color:var(--ui-card)]/70 px-3 py-4 lg:h-screen lg:min-h-0 lg:overflow-hidden">
      <div className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2">
        {admin?.profileImageUrl ? (
          <img
            src={admin.profileImageUrl}
            alt={companyName}
            className="h-12 w-12 rounded-full border border-[color:var(--ui-border)] object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-primary-soft)] text-sm font-semibold text-[color:var(--ui-primary)]">
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[22px] font-semibold leading-none text-[color:var(--ui-foreground)]">{companyName}</p>
          <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">Admin workspace</p>
        </div>

        <ChevronDown className="h-4 w-4 text-[color:var(--ui-muted-foreground)]" />
      </div>

      <div className="mb-3 flex items-center justify-end px-2">
        <button
          type="button"
          className="rounded-md p-2 text-[color:var(--ui-muted-foreground)] transition hover:bg-[color:var(--ui-accent)] hover:text-[color:var(--ui-foreground)]"
          aria-label="Search"
          title="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>

      <nav className="space-y-1 px-1">
        {PRIMARY_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Button
              key={item.href}
              variant="ghost"
              className={`h-11 w-full justify-start rounded-xl px-3 text-lg font-medium ${
                isActive
                  ? "bg-[color:var(--ui-accent)] text-[color:var(--ui-foreground)]"
                  : "text-[color:var(--ui-muted-foreground)] hover:text-[color:var(--ui-foreground)]"
              }`}
              asChild
            >
              <Link href={item.href}>
                <Icon className="mr-3 h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </Button>
          );
        })}
      </nav>

      <div className="mt-8 flex items-center justify-between px-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--ui-muted-foreground)]">Folders</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-md p-1.5 text-[color:var(--ui-muted-foreground)] transition hover:bg-[color:var(--ui-accent)] hover:text-[color:var(--ui-foreground)]"
            aria-label="Search folders"
            title="Search folders"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="rounded-md p-1.5 text-[color:var(--ui-muted-foreground)] transition hover:bg-[color:var(--ui-accent)] hover:text-[color:var(--ui-foreground)]"
            aria-label="Create note"
            title="Create note"
            onClick={() => router.push("/admin/notes")}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 space-y-1 px-1">
        {FOLDER_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.isEnabled && pathname === item.href;

          if (!item.isEnabled) {
            return (
              <div
                key={item.label}
                className="flex h-10 items-center rounded-xl px-3 text-base text-[color:var(--ui-muted-foreground)]/60"
              >
                <Icon className="mr-3 h-5 w-5" />
                <span>{item.label}</span>
              </div>
            );
          }

          return (
            <Button
              key={item.label}
              variant="ghost"
              className={`h-10 w-full justify-start rounded-xl px-3 text-base font-medium ${
                isActive
                  ? "bg-[color:var(--ui-accent)] text-[color:var(--ui-foreground)]"
                  : "text-[color:var(--ui-muted-foreground)] hover:text-[color:var(--ui-foreground)]"
              }`}
              asChild
            >
              <Link href={item.href}>
                <Icon className="mr-3 h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </Button>
          );
        })}
      </div>

      <div className="mt-auto border-t border-[color:var(--ui-border)] pt-4">
        <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-3">
          <div className="mb-3 flex items-center gap-2 text-sm text-[color:var(--ui-muted-foreground)]">
            <Settings className="h-4 w-4" />
            <span>Appearance</span>
          </div>
          <AdminThemeToggle />
        </div>

        <Button type="button" variant="outline" className="mt-3 w-full" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </aside>
  );
}
