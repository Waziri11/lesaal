"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Folder, Plus } from "lucide-react";
import PageState from "../../../../components/shared/PageState";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import { createCsrfHeaders } from "../../../../lib/csrf-client";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";

const PAGE_LIMIT = 50;

function formatDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString();
}

function sortProjectsByRecentUpdate(projects) {
  return projects
    .slice()
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
}

export default function AdminProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingMoreProjects, setLoadingMoreProjects] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return projects;
    }

    return projects.filter((project) => {
      const haystack = `${project.name || ""} ${project.description || ""} ${project.details || ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [projects, searchQuery]);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects({ cursor = null, append = false } = {}) {
    if (append) {
      setLoadingMoreProjects(true);
    } else {
      setLoadingProjects(true);
    }

    setStatusError("");

    try {
      const query = new URLSearchParams({ limit: String(PAGE_LIMIT) });
      if (cursor) {
        query.set("cursor", cursor);
      }

      const response = await fetch(`/api/admin/projects?${query.toString()}`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load projects.");
      }

      const nextProjects = Array.isArray(payload.projects) ? payload.projects : [];
      setNextCursor(payload.nextCursor || null);
      setHasMore(Boolean(payload.hasMore));

      if (append) {
        setProjects((current) => sortProjectsByRecentUpdate([...current, ...nextProjects]));
      } else {
        setProjects(sortProjectsByRecentUpdate(nextProjects));
      }
    } catch (error) {
      setStatusError(error.message || "Unable to load projects.");
    } finally {
      if (append) {
        setLoadingMoreProjects(false);
      } else {
        setLoadingProjects(false);
      }
    }
  }

  async function handleCreateProject() {
    if (creatingProject) return;

    setCreatingProject(true);
    setStatusError("");
    setStatusMessage("");

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
        setStatusMessage("New project created.");
        router.push(`/admin/projects/${payload.project.id}`);
        router.refresh();
      }
    } catch (error) {
      setStatusError(error.message || "Unable to create project.");
      await Swal.fire({
        icon: "error",
        title: "Create failed",
        text: error.message || "Unable to create project.",
      });
    } finally {
      setCreatingProject(false);
    }
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>
            Manage project records from one place. Select any project to open its full editor view.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {statusError ? <p className="text-sm text-[color:var(--ui-destructive)]">{statusError}</p> : null}
          {statusMessage ? <p className="text-sm text-[color:var(--ui-success)]">{statusMessage}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">Project List</CardTitle>
            <Button size="sm" onClick={handleCreateProject} disabled={creatingProject}>
              {creatingProject ? "Adding..." : (
                <>
                  <Plus className="mr-1 h-4 w-4" />
                  New Project
                </>
              )}
            </Button>
          </div>
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search projects"
          />
        </CardHeader>

        <CardContent>
          <PageState
            status={loadingProjects ? "loading" : statusError ? "error" : projects.length ? "loaded" : "empty"}
            resourceLabel="projects"
            errorMessage={statusError}
            onRetry={() => loadProjects()}
            createAction={
              <Button size="sm" onClick={handleCreateProject} disabled={creatingProject}>
                Create Project
              </Button>
            }
          >
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/admin/projects/${project.id}`}
                  className="block rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-3 transition hover:bg-[color:var(--ui-accent)]"
                >
                  <div className="flex items-start gap-3">
                    <Folder className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--ui-muted-foreground)]" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-semibold">{project.name}</p>
                      <p className="line-clamp-2 text-xs text-[color:var(--ui-muted-foreground)]">
                        {project.description || "No description yet."}
                      </p>
                      <p className="text-[11px] text-[color:var(--ui-muted-foreground)]">
                        Updated {formatDateTime(project.updatedAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}

              {hasMore ? (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => loadProjects({ cursor: nextCursor, append: true })}
                    disabled={loadingMoreProjects || !nextCursor}
                  >
                    {loadingMoreProjects ? "Loading..." : "Load More"}
                  </Button>
                </div>
              ) : null}
            </div>
          </PageState>
        </CardContent>
      </Card>
    </section>
  );
}
