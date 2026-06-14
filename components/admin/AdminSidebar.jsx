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
  Trash2,
  User,
  Users,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createCsrfHeaders } from "../../lib/csrf-client";
import AdminThemeToggle from "./AdminThemeToggle";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Spinner } from "../ui/spinner";
import Swal from "sweetalert2";
import { useEffect, useMemo, useRef, useState } from "react";

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

const PROJECT_PAGE_LIMIT = 50;

function sortProjectsByRecentUpdate(projects) {
  return projects
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
}

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
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState(null);
  const [projectsError, setProjectsError] = useState("");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const projectSearchInputRef = useRef(null);

  const companyName = String(admin?.companyName || "").trim() || "Lesaal";
  const initials = getInitials(admin);
  const filteredProjects = useMemo(() => {
    const normalizedQuery = projectSearchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return projects;
    }

    return projects.filter((project) => {
      const haystack = `${project.name || ""} ${project.description || ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [projects, projectSearchQuery]);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setIsLoadingProjects(true);
    setProjectsError("");

    try {
      const response = await fetch(`/api/admin/projects?limit=${PROJECT_PAGE_LIMIT}`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load projects.");
      }

      const nextProjects = Array.isArray(payload.projects) ? payload.projects : [];
      setProjects(sortProjectsByRecentUpdate(nextProjects));
    } catch (error) {
      setProjectsError(error.message || "Unable to load projects.");
    } finally {
      setIsLoadingProjects(false);
    }
  }

  async function handleCreateProject() {
    if (isCreatingProject) return;

    setIsCreatingProject(true);
    setProjectsError("");

    try {
      const response = await fetch("/api/admin/projects", {
        method: "POST",
        headers: createCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          name: "Untitled project",
          description: "",
          details: "",
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to create project.");
      }

      if (payload.project) {
        setProjects((current) =>
          sortProjectsByRecentUpdate([payload.project, ...current.filter((project) => project.id !== payload.project.id)])
        );
        router.push(`/admin/projects/${payload.project.id}`);
        router.refresh();
      }
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Create failed",
        text: error.message || "Unable to create project.",
      });
    } finally {
      setIsCreatingProject(false);
    }
  }

  async function handleDeleteProject(project) {
    if (!project || deletingProjectId) return;

    const decision = await Swal.fire({
      icon: "warning",
      title: "Delete project?",
      text: `Delete "${project.name}"?`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
      focusCancel: true,
    });

    if (!decision.isConfirmed) {
      return;
    }

    setDeletingProjectId(project.id);
    setProjectsError("");

    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: "DELETE",
        headers: createCsrfHeaders(),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete project.");
      }

      setProjects((current) => current.filter((item) => item.id !== project.id));

      if (pathname === `/admin/projects/${project.id}` || pathname.startsWith(`/admin/projects/${project.id}/`)) {
        router.push("/admin/projects");
        router.refresh();
      }
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: error.message || "Unable to delete project.",
      });
    } finally {
      setDeletingProjectId(null);
    }
  }

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
        headers: createCsrfHeaders(),
      });

      if (!response.ok) {
        throw new Error("Unable to logout. Please try again.");
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Logout failed",
        text: error.message || "Unable to logout. Please try again.",
      });
      setIsLoggingOut(false);
    }
  }

  return (
    <aside className="flex min-h-screen flex-col border-r border-[color:var(--ui-border)] bg-[color:var(--ui-card)]/70 px-2.5 py-3 lg:h-screen lg:min-h-0 lg:overflow-hidden">
      <div className="mb-1 flex items-center gap-2.5 rounded-xl px-1.5 py-1.5">
        {admin?.profileImageUrl ? (
          <img
            src={admin.profileImageUrl}
            alt={companyName}
            className="h-10 w-10 rounded-full border border-[color:var(--ui-border)] object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-primary-soft)] text-xs font-semibold text-[color:var(--ui-primary)]">
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-[20px] font-semibold leading-none text-[color:var(--ui-foreground)]">{companyName}</p>
          <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">Admin workspace</p>
        </div>

        <ChevronDown className="h-4 w-4 text-[color:var(--ui-muted-foreground)]" />
      </div>

      <div className="mb-2 flex items-center justify-end px-1">
        <button
          type="button"
          className="rounded-md p-1.5 text-[color:var(--ui-muted-foreground)] transition hover:bg-[color:var(--ui-accent)] hover:text-[color:var(--ui-foreground)]"
          aria-label="Search"
          title="Search"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      <nav className="space-y-0.5 px-0.5">
        {PRIMARY_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Button
              key={item.href}
              variant="ghost"
              className={`h-10 w-full justify-start rounded-lg px-2.5 text-base font-medium ${
                isActive
                  ? "bg-[color:var(--ui-accent)] text-[color:var(--ui-foreground)]"
                  : "text-[color:var(--ui-muted-foreground)] hover:text-[color:var(--ui-foreground)]"
              }`}
              asChild
            >
              <Link href={item.href}>
                <Icon className="mr-2.5 h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </Button>
          );
        })}
      </nav>

      <div className="mt-5 flex items-center justify-between px-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ui-muted-foreground)]">Projects</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-md p-1 text-[color:var(--ui-muted-foreground)] transition hover:bg-[color:var(--ui-accent)] hover:text-[color:var(--ui-foreground)]"
            aria-label="Search projects"
            title="Search projects"
            onClick={() => projectSearchInputRef.current?.focus()}
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-[color:var(--ui-muted-foreground)] transition hover:bg-[color:var(--ui-accent)] hover:text-[color:var(--ui-foreground)] disabled:opacity-60"
            aria-label="Create project"
            title="Create project"
            onClick={handleCreateProject}
            disabled={isCreatingProject}
          >
            {isCreatingProject ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mt-2 px-2">
        <Input
          ref={projectSearchInputRef}
          value={projectSearchQuery}
          onChange={(event) => setProjectSearchQuery(event.target.value)}
          placeholder="Search projects"
          className="h-8 text-xs"
        />
      </div>

      <div className="mt-2 max-h-56 space-y-1 overflow-y-auto px-0.5 pr-1">
        {isLoadingProjects ? (
          <div className="flex h-9 items-center rounded-lg px-2.5 text-xs text-[color:var(--ui-muted-foreground)]">
            Loading projects...
          </div>
        ) : projectsError ? (
          <div className="rounded-lg border border-[color:var(--ui-destructive)]/30 bg-[color:var(--ui-destructive)]/5 px-2.5 py-2">
            <p className="text-xs text-[color:var(--ui-destructive)]">{projectsError}</p>
            <Button type="button" size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={loadProjects}>
              Retry
            </Button>
          </div>
        ) : filteredProjects.length ? (
          filteredProjects.map((project) => {
            const isActive = pathname === `/admin/projects/${project.id}` || pathname.startsWith(`/admin/projects/${project.id}/`);
            const isDeleting = deletingProjectId === project.id;

            return (
              <div key={project.id} className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  className={`h-9 flex-1 justify-start rounded-lg px-2.5 text-sm font-medium ${
                    isActive
                      ? "bg-[color:var(--ui-accent)] text-[color:var(--ui-foreground)]"
                      : "text-[color:var(--ui-muted-foreground)] hover:text-[color:var(--ui-foreground)]"
                  }`}
                  asChild
                >
                  <Link href={`/admin/projects/${project.id}`}>
                    <Folder className="mr-2.5 h-4 w-4" />
                    <span className="truncate">{project.name}</span>
                  </Link>
                </Button>
                <button
                  type="button"
                  className="rounded-md p-1 text-[color:var(--ui-muted-foreground)] transition hover:bg-[color:var(--ui-accent)] hover:text-[color:var(--ui-destructive)] disabled:opacity-60"
                  aria-label={`Delete ${project.name}`}
                  title={`Delete ${project.name}`}
                  onClick={() => handleDeleteProject(project)}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Spinner className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            );
          })
        ) : (
          <div className="flex h-9 items-center rounded-lg px-2.5 text-xs text-[color:var(--ui-muted-foreground)]">
            {projectSearchQuery.trim() ? "No projects match your search." : "No projects yet. Create your first one."}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between px-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--ui-muted-foreground)]">Folders</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="rounded-md p-1 text-[color:var(--ui-muted-foreground)] transition hover:bg-[color:var(--ui-accent)] hover:text-[color:var(--ui-foreground)]"
            aria-label="Search folders"
            title="Search folders"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            type="button"
            className="rounded-md p-1 text-[color:var(--ui-muted-foreground)] transition hover:bg-[color:var(--ui-accent)] hover:text-[color:var(--ui-foreground)]"
            aria-label="Create note"
            title="Create note"
            onClick={() => router.push("/admin/notes")}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-2 space-y-0.5 px-0.5">
        {FOLDER_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.isEnabled && pathname === item.href;

          if (!item.isEnabled) {
            return (
              <div
                key={item.label}
                className="flex h-9 items-center rounded-lg px-2.5 text-sm text-[color:var(--ui-muted-foreground)]/60"
              >
                <Icon className="mr-2.5 h-4 w-4" />
                <span>{item.label}</span>
              </div>
            );
          }

          return (
            <Button
              key={item.label}
              variant="ghost"
              className={`h-9 w-full justify-start rounded-lg px-2.5 text-sm font-medium ${
                isActive
                  ? "bg-[color:var(--ui-accent)] text-[color:var(--ui-foreground)]"
                  : "text-[color:var(--ui-muted-foreground)] hover:text-[color:var(--ui-foreground)]"
              }`}
              asChild
            >
              <Link href={item.href}>
                <Icon className="mr-2.5 h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </Button>
          );
        })}
      </div>

      <div className="mt-auto border-t border-[color:var(--ui-border)] pt-3">
        <div className="mt-2 flex items-center gap-2">
          <Button type="button" variant="outline" className="h-9 flex-1" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                logging out
              </>
            ) : (
              "Logout"
            )}
          </Button>
          <AdminThemeToggle />
        </div>
      </div>
    </aside>
  );
}
