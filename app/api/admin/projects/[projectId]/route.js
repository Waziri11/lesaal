import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../../lib/request-security";

function isMissingAdminProjectTableError(error) {
  if (!error) return false;

  if (error?.code !== "P2021" && error?.code !== "P2022") {
    return false;
  }

  const message = String(error?.message || "").toLowerCase();
  return message.includes("adminproject");
}

let hasWarnedMissingAdminProjectTable = false;

function warnIfMissingAdminProjectTable() {
  if (hasWarnedMissingAdminProjectTable) {
    return;
  }

  console.warn("AdminProject table is missing. Projects endpoints are running in compatibility mode.");
  hasWarnedMissingAdminProjectTable = true;
}

function normalizeProjectInput(body) {
  const name = String(body?.name || "").trim();
  const description = String(body?.description ?? "").trim();
  const details = String(body?.details ?? "");

  return {
    name: name || "Untitled project",
    description: description || null,
    details: details.trim() ? details : null,
  };
}

async function loadProjectForAdmin(adminId, projectId) {
  return prisma.adminProject.findFirst({
    where: {
      id: projectId,
      adminId,
    },
  });
}

export async function GET(request, { params }) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const projectId = String(resolvedParams?.projectId || "");
    let project;

    try {
      project = await loadProjectForAdmin(admin.id, projectId);
    } catch (error) {
      if (!isMissingAdminProjectTableError(error)) {
        throw error;
      }

      warnIfMissingAdminProjectTable();
      return NextResponse.json(
        { error: "Projects are unavailable until database migrations are applied." },
        { status: 503 }
      );
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Failed to fetch project", error);
    return NextResponse.json({ error: "Unable to load project." }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const securityError = validateAdminMutationRequest(request);
    if (securityError) {
      return securityError;
    }

    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const projectId = String(resolvedParams?.projectId || "");
    let existing;

    try {
      existing = await loadProjectForAdmin(admin.id, projectId);
    } catch (error) {
      if (!isMissingAdminProjectTableError(error)) {
        throw error;
      }

      warnIfMissingAdminProjectTable();
      return NextResponse.json(
        { error: "Projects are unavailable until database migrations are applied." },
        { status: 503 }
      );
    }

    if (!existing) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const body = await request.json();
    const input = normalizeProjectInput(body);

    let project;

    try {
      project = await prisma.adminProject.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          description: input.description,
          details: input.details,
        },
      });
    } catch (error) {
      if (!isMissingAdminProjectTableError(error)) {
        throw error;
      }

      warnIfMissingAdminProjectTable();
      return NextResponse.json(
        { error: "Projects are unavailable until database migrations are applied." },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, project });
  } catch (error) {
    console.error("Failed to update project", error);
    return NextResponse.json({ error: "Unable to update project." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const securityError = validateAdminMutationRequest(request);
    if (securityError) {
      return securityError;
    }

    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const projectId = String(resolvedParams?.projectId || "");
    let existing;

    try {
      existing = await loadProjectForAdmin(admin.id, projectId);
    } catch (error) {
      if (!isMissingAdminProjectTableError(error)) {
        throw error;
      }

      warnIfMissingAdminProjectTable();
      return NextResponse.json(
        { error: "Projects are unavailable until database migrations are applied." },
        { status: 503 }
      );
    }

    if (!existing) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    try {
      await prisma.adminProject.delete({
        where: { id: existing.id },
      });
    } catch (error) {
      if (!isMissingAdminProjectTableError(error)) {
        throw error;
      }

      warnIfMissingAdminProjectTable();
      return NextResponse.json(
        { error: "Projects are unavailable until database migrations are applied." },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete project", error);
    return NextResponse.json({ error: "Unable to delete project." }, { status: 500 });
  }
}
