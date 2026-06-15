"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Folder } from "lucide-react";
import PageState from "../../../../../components/shared/PageState";
import ProjectRepositoryPanel from "../../../../../components/admin/projects/ProjectRepositoryPanel";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../../components/ui/card";

const PROJECT_SECTIONS = [
  { key: "info", label: "Project Info" },
  { key: "plan", label: "Project Plan" },
  { key: "progress", label: "Project Progress" },
  { key: "repository", label: "Project Repository" },
];

function formatDateTime(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString();
}

function ProjectSectionPlaceholder({ title, description }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="inline-flex w-fit rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] px-3 py-1 text-xs font-medium uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">
          Placeholder
        </p>
        <p className="text-sm text-[color:var(--ui-muted-foreground)]">
          This section is intentionally staged for the next release while repository integration is delivered first.
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminProjectDetailsPage() {
  const params = useParams();
  const rawProjectId = params?.projectId;
  const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : String(rawProjectId || "");
  const [project, setProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [activeSection, setActiveSection] = useState("repository");

  const selectedSection = useMemo(
    () => PROJECT_SECTIONS.find((section) => section.key === activeSection) || PROJECT_SECTIONS[0],
    [activeSection]
  );

  useEffect(() => {
    if (!projectId) {
      setStatusError("Project id is missing.");
      setLoadingProject(false);
      return;
    }

    let isMounted = true;

    async function loadProject(nextProjectId) {
      setLoadingProject(true);
      setStatusError("");

      try {
        const response = await fetch(`/api/admin/projects/${nextProjectId}`, { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load project.");
        }

        if (!isMounted) {
          return;
        }

        setProject(payload.project || null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setProject(null);
        setStatusError(error.message || "Unable to load project.");
      } finally {
        if (isMounted) {
          setLoadingProject(false);
        }
      }
    }

    loadProject(projectId);

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  if (loadingProject) {
    return <PageState status="loading" resourceLabel="project" />;
  }

  if (!project) {
    return (
      <PageState
        status="error"
        resourceLabel="project"
        errorMessage={statusError || "Project not found."}
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
            {project.name || "Untitled project"}
          </CardTitle>
          <CardDescription>
            Project workspace is now structured into four sections. Repository sync is fully active in this release.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="inline-flex max-w-full flex-wrap items-center rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-1">
        {PROJECT_SECTIONS.map((section) => {
          const isActive = section.key === selectedSection.key;

          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-[color:var(--ui-surface)] text-[color:var(--ui-foreground)] shadow-sm"
                  : "text-[color:var(--ui-muted-foreground)] hover:text-[color:var(--ui-foreground)]"
              }`}
            >
              {section.label}
            </button>
          );
        })}
      </div>

      {selectedSection.key === "repository" ? (
        <ProjectRepositoryPanel projectId={project.id} projectName={project.name} />
      ) : null}

      {selectedSection.key === "info" ? (
        <ProjectSectionPlaceholder
          title="Project Info"
          description="Project information editor will be connected in a later phase."
        />
      ) : null}

      {selectedSection.key === "plan" ? (
        <ProjectSectionPlaceholder
          title="Project Plan"
          description="Planning workflows and milestones are staged for upcoming iterations."
        />
      ) : null}

      {selectedSection.key === "progress" ? (
        <ProjectSectionPlaceholder
          title="Project Progress"
          description="Progress tracking metrics and status timelines are coming next."
        />
      ) : null}
    </section>
  );
}
