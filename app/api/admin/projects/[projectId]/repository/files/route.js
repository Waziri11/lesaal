import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../../../lib/auth";
import { validateAdminMutationRequest } from "../../../../../../../lib/request-security";
import { prisma } from "../../../../../../../lib/prisma";
import {
  ADMIN_PROJECT_REPOSITORY_SELECT,
  isMissingAdminProjectTableError,
  isMissingProjectRepositoryColumnsError,
} from "../../../../../../../lib/project-repository";
import {
  getGoogleDriveAccessContextForAdmin,
  isGoogleDriveConnectionMissingSchemaError,
  isGoogleOAuthReauthRequiredError,
} from "../../../../../../../lib/google-drive-authz";
import { listGoogleDriveFolderFiles, uploadFileToGoogleDriveFolder } from "../../../../../../../lib/google-drive";

const DEFAULT_PAGE_SIZE = 40;
const MAX_PAGE_SIZE = 100;
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

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

function parseListParams(searchParams) {
  const parsedPageSize = Number.parseInt(String(searchParams.get("pageSize") || DEFAULT_PAGE_SIZE), 10);
  const pageSize = Number.isFinite(parsedPageSize)
    ? Math.min(Math.max(parsedPageSize, 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const pageToken = String(searchParams.get("pageToken") || "").trim();
  const query = String(searchParams.get("query") || "").trim().slice(0, 120);

  return {
    pageSize,
    pageToken,
    query,
  };
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

async function loadProjectAndDriveAccess(adminId, projectId) {
  let project = null;

  try {
    project = await loadProjectForAdmin(adminId, projectId);
  } catch (error) {
    if (!isMissingAdminProjectTableError(error) && !isMissingProjectRepositoryColumnsError(error)) {
      throw error;
    }

    warnMissingProjectRepositorySchema();
    return { errorResponse: getProjectRepositoryUnavailableResponse() };
  }

  if (!project) {
    return { errorResponse: NextResponse.json({ error: "Project not found." }, { status: 404 }) };
  }

  if (!project.driveFolderId) {
    return { errorResponse: NextResponse.json({ error: "Project Drive folder is not linked yet." }, { status: 400 }) };
  }

  let driveAccessContext = null;

  try {
    driveAccessContext = await getGoogleDriveAccessContextForAdmin(adminId);
  } catch (error) {
    if (!isGoogleDriveConnectionMissingSchemaError(error)) {
      throw error;
    }

    warnMissingGoogleDriveConnectionSchema();
    return { errorResponse: getGoogleIntegrationUnavailableResponse() };
  }

  if (!driveAccessContext?.connection) {
    return {
      errorResponse: NextResponse.json(
        { error: "Google Drive account is not connected. Please connect your account first." },
        { status: 400 }
      ),
    };
  }

  return {
    project,
    driveAccessContext,
  };
}

export async function GET(request, { params }) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const projectId = String(resolvedParams?.projectId || "");
    const resolved = await loadProjectAndDriveAccess(admin.id, projectId);

    if (resolved.errorResponse) {
      return resolved.errorResponse;
    }

    const listParams = parseListParams(request.nextUrl.searchParams);
    const filesResult = await listGoogleDriveFolderFiles({
      accessToken: resolved.driveAccessContext.accessToken,
      folderId: resolved.project.driveFolderId,
      pageToken: listParams.pageToken,
      pageSize: listParams.pageSize,
      query: listParams.query,
    });

    return NextResponse.json({
      success: true,
      files: filesResult.files,
      nextPageToken: filesResult.nextPageToken || null,
    });
  } catch (error) {
    if (isGoogleOAuthReauthRequiredError(error)) {
      return NextResponse.json(
        { error: "Google authorization has expired. Please reconnect your Google account." },
        { status: 401 }
      );
    }

    console.error("Failed to load project repository files", error);
    return NextResponse.json({ error: "Unable to load repository files." }, { status: 500 });
  }
}

export async function POST(request, { params }) {
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
    const resolved = await loadProjectAndDriveAccess(admin.id, projectId);

    if (resolved.errorResponse) {
      return resolved.errorResponse;
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds 25MB. Use a smaller file for this upload flow." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const uploaded = await uploadFileToGoogleDriveFolder({
      accessToken: resolved.driveAccessContext.accessToken,
      folderId: resolved.project.driveFolderId,
      fileName: file.name,
      mimeType: file.type,
      buffer: Buffer.from(bytes),
    });

    return NextResponse.json({
      success: true,
      file: uploaded,
    });
  } catch (error) {
    if (isGoogleOAuthReauthRequiredError(error)) {
      return NextResponse.json(
        { error: "Google authorization has expired. Please reconnect your Google account." },
        { status: 401 }
      );
    }

    console.error("Failed to upload repository file", error);
    return NextResponse.json({ error: "Unable to upload file to repository." }, { status: 500 });
  }
}
