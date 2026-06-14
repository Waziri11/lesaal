"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Folder } from "lucide-react";
import PageState from "../../../../../components/shared/PageState";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card";
import { Input } from "../../../../../components/ui/input";
import { Textarea } from "../../../../../components/ui/textarea";
import { createCsrfHeaders } from "../../../../../lib/csrf-client";
import Swal from "sweetalert2";

function formatDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString();
}

export default function AdminProjectDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const rawProjectId = params?.projectId;
  const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : String(rawProjectId || "");

  const [project, setProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [savingProject, setSavingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [editorDraft, setEditorDraft] = useState({
    name: "",
    description: "",
    details: "",
  });

  useEffect(() => {
    if (!projectId) {
      setStatusError("Project id is missing.");
      setLoadingProject(false);
      return;
    }

    loadProject(projectId);
  }, [projectId]);

  useEffect(() => {
    if (!project) {
      setEditorDraft({
        name: "",
        description: "",
        details: "",
      });
      return;
    }

    setEditorDraft({
      name: project.name || "",
      description: project.description || "",
      details: project.details || "",
    });
  }, [project]);

  async function loadProject(nextProjectId) {
    setLoadingProject(true);
    setStatusError("");

    try {
      const response = await fetch(`/api/admin/projects/${nextProjectId}`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load project.");
      }

      setProject(payload.project || null);
    } catch (error) {
      setProject(null);
      setStatusError(error.message || "Unable to load project.");
    } finally {
      setLoadingProject(false);
    }
  }

  async function handleSaveProject() {
    if (!project || savingProject) return;

    setSavingProject(true);
    setStatusError("");
    setStatusMessage("");

    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: "PUT",
        headers: createCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          name: editorDraft.name,
          description: editorDraft.description,
          details: editorDraft.details,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update project.");
      }

      if (payload.project) {
        setProject(payload.project);
      }
      setStatusMessage("Project saved.");
      router.refresh();
    } catch (error) {
      setStatusError(error.message || "Unable to update project.");
      await Swal.fire({
        icon: "error",
        title: "Save failed",
        text: error.message || "Unable to update project.",
      });
    } finally {
      setSavingProject(false);
    }
  }

  async function handleDeleteProject() {
    if (!project || deletingProject) return;

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

    setDeletingProject(true);
    setStatusError("");
    setStatusMessage("");

    try {
      const response = await fetch(`/api/admin/projects/${project.id}`, {
        method: "DELETE",
        headers: createCsrfHeaders(),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete project.");
      }

      await Swal.fire({
        icon: "success",
        title: "Deleted",
        text: "Project deleted successfully.",
        timer: 1200,
        showConfirmButton: false,
      });

      router.push("/admin/projects");
      router.refresh();
    } catch (error) {
      setStatusError(error.message || "Unable to delete project.");
      await Swal.fire({
        icon: "error",
        title: "Delete failed",
        text: error.message || "Unable to delete project.",
      });
    } finally {
      setDeletingProject(false);
    }
  }

  if (loadingProject) {
    return <PageState status="loading" resourceLabel="project" />;
  }

  if (!project) {
    return (
      <PageState
        status="error"
        resourceLabel="project"
        errorMessage={statusError || "Project not found."}
        onRetry={() => loadProject(projectId)}
        createAction={
          <Button asChild>
            <Link href="/admin/projects">Back to Projects</Link>
          </Button>
        }
      />
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Link>
        </Button>
        <Badge variant="secondary">Last updated {formatDateTime(project.updatedAt)}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            {project.name}
          </CardTitle>
          <CardDescription>
            Project view for editing and reviewing project information. Additional modules can be added here later.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {statusError ? <p className="text-sm text-[color:var(--ui-destructive)]">{statusError}</p> : null}
          {statusMessage ? <p className="text-sm text-[color:var(--ui-success)]">{statusMessage}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Edit Project</CardTitle>
            <CardDescription>Update the project information and save your changes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Project Name</p>
              <Input
                value={editorDraft.name}
                onChange={(event) => setEditorDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Project name"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Short Description</p>
              <Textarea
                value={editorDraft.description}
                onChange={(event) => setEditorDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="What is this project about?"
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Details</p>
              <Textarea
                value={editorDraft.details}
                onChange={(event) => setEditorDraft((current) => ({ ...current, details: event.target.value }))}
                placeholder="Notes, goals, milestones, and anything else for this project"
                className="min-h-[380px]"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSaveProject} disabled={savingProject || deletingProject}>
                {savingProject ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="destructive" onClick={handleDeleteProject} disabled={deletingProject || savingProject}>
                {deletingProject ? "Deleting..." : "Delete Project"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overview</CardTitle>
            <CardDescription>Live preview of the current stored project information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Name</p>
              <p>{project.name || "Untitled project"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Description</p>
              <p className="whitespace-pre-wrap text-[color:var(--ui-muted-foreground)]">{project.description || "No description yet."}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Details</p>
              <p className="max-h-[260px] overflow-auto whitespace-pre-wrap text-[color:var(--ui-muted-foreground)]">
                {project.details || "No details yet."}
              </p>
            </div>

            <div className="space-y-1 border-t border-[color:var(--ui-border)] pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Created</p>
              <p className="text-[color:var(--ui-muted-foreground)]">{formatDateTime(project.createdAt)}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Updated</p>
              <p className="text-[color:var(--ui-muted-foreground)]">{formatDateTime(project.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
