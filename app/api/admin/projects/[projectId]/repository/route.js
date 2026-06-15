import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../../lib/auth";
import { validateAdminMutationRequest } from "../../../../../../lib/request-security";
import { prisma } from "../../../../../../lib/prisma";
import {
  ADMIN_PROJECT_REPOSITORY_SELECT,
  isMissingAdminProjectTableError,
  isMissingProjectRepositoryColumnsError,
  toRepositoryPayload,
} from "../../../../../../lib/project-repository";
import {
  getGoogleDriveAccessContextForAdmin,
  isGoogleDriveConnectionMissingSchemaError,
  isGoogleOAuthReauthRequiredError,
} from "../../../../../../lib/google-drive-authz";
import { validateGoogleDriveFolder } from "../../../../../../lib/google-drive";

let hasWarnedMissingProjectRepositorySchema = false;
let hasWarnedMissingGoogleDriveConnectionSchema = false;

function warnMissingProjectRepositorySchema() {
  if (hasWarnedMissingProjectRepositorySchema) {
    return;
  }

  console.warn("Project repository columns are missing. Project repository endpoints are in compatibility mode.");
  hasWarnedMissingProjectRepositorySchema = true;
}

function warnMissingGoogleDriveConnectionSchema() {
  if (hasWarnedMissingGoogleDriveConnectionSchema) {
    return;
  }

  console.warn("AdminGoogleDriveConnection table is missing. Project repository endpoints are in compatibility mode.");
  hasWarnedMissingGoogleDriveConnectionSchema = true;
}

async function loadProjectForAdmin(adminId, projectId) {
  return prisma.adminProject.findFirst({
    where: {
      id: projectId,
      adminId,
    },
    select: ADMIN_PROJECT_REPOSITORY_SELECT,
  });
}

function parseRepositoryUpdateInput(body) {
  const folderId = String(body?.driveFolderId || body?.folderId || "").trim();
  const folderName = String(body?.driveFolderName || body?.folderName || "").trim();
  const folderUrl = String(body?.driveFolderUrl || body?.folderUrl || "").trim();

  return {
    folderId,
    folderName,
    folderUrl,
  };
}

function getProjectRepositoryUnavailableResponse() {
  return NextResponse.json(
    { error: "Project repository is unavailable until database migrations are applied." },
    { status: 503 }
  );
}

function getGoogleIntegrationUnavailableResponse() {
  return NextResponse.json(
    { error: "Google Drive integration is unavailable until database migrations are applied." },
    { status: 503 }
  );
}

export async function GET(request, { params }) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const projectId = String(resolvedParams?.projectId || "");
    let project = null;

    try {
      project = await loadProjectForAdmin(admin.id, projectId);
    } catch (error) {
      if (!isMissingAdminProjectTableError(error) && !isMissingProjectRepositoryColumnsError(error)) {
        throw error;
      }

      warnMissingProjectRepositorySchema();
      return getProjectRepositoryUnavailableResponse();
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      repository: toRepositoryPayload(project),
    });
  } catch (error) {
    console.error("Failed to load project repository metadata", error);
    return NextResponse.json({ error: "Unable to load project repository." }, { status: 500 });
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
    let project = null;

    try {
      project = await loadProjectForAdmin(admin.id, projectId);
    } catch (error) {
      if (!isMissingAdminProjectTableError(error) && !isMissingProjectRepositoryColumnsError(error)) {
        throw error;
      }

      warnMissingProjectRepositorySchema();
      return getProjectRepositoryUnavailableResponse();
    }

    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const body = await request.json();
    const input = parseRepositoryUpdateInput(body);

    if (!input.folderId) {
      return NextResponse.json({ error: "Google Drive folder id is required." }, { status: 400 });
    }

    let driveAccessContext = null;

    try {
      driveAccessContext = await getGoogleDriveAccessContextForAdmin(admin.id);
    } catch (error) {
      if (!isGoogleDriveConnectionMissingSchemaError(error)) {
        throw error;
      }

      warnMissingGoogleDriveConnectionSchema();
      return getGoogleIntegrationUnavailableResponse();
    }

    if (!driveAccessContext?.connection) {
      return NextResponse.json(
        { error: "Google Drive account is not connected. Please connect your account first." },
        { status: 400 }
      );
    }

    let validatedFolder = null;

    try {
      validatedFolder = await validateGoogleDriveFolder({
        accessToken: driveAccessContext.accessToken,
        folderId: input.folderId,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error?.message || "Unable to access the selected Google Drive folder." },
        { status: 400 }
      );
    }

    let updatedProject = null;

    try {
      updatedProject = await prisma.adminProject.update({
        where: {
          id: project.id,
        },
        data: {
          driveFolderId: validatedFolder.id,
          driveFolderName: input.folderName || validatedFolder.name || null,
          driveFolderUrl: input.folderUrl || validatedFolder.url || null,
          driveFolderLinkedAt: new Date(),
        },
        select: ADMIN_PROJECT_REPOSITORY_SELECT,
      });
    } catch (error) {
      if (!isMissingAdminProjectTableError(error) && !isMissingProjectRepositoryColumnsError(error)) {
        throw error;
      }

      warnMissingProjectRepositorySchema();
      return getProjectRepositoryUnavailableResponse();
    }

    return NextResponse.json({
      success: true,
      repository: toRepositoryPayload(updatedProject),
    });
  } catch (error) {
    if (isGoogleOAuthReauthRequiredError(error)) {
      return NextResponse.json(
        { error: "Google authorization has expired. Please reconnect your Google account." },
        { status: 401 }
      );
    }

    console.error("Failed to update project repository metadata", error);
    return NextResponse.json({ error: "Unable to update project repository." }, { status: 500 });
  }
}
