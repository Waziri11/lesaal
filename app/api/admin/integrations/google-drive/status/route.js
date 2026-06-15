import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import {
  ADMIN_PROJECT_REPOSITORY_SELECT,
  isMissingAdminGoogleDriveConnectionTableError,
  isMissingAdminProjectTableError,
  isMissingProjectRepositoryColumnsError,
  toRepositoryPayload,
} from "../../../../../../lib/project-repository";

let hasWarnedMissingGoogleDriveConnectionSchema = false;
let hasWarnedMissingProjectRepositorySchema = false;

function warnMissingGoogleDriveConnectionSchema() {
  if (hasWarnedMissingGoogleDriveConnectionSchema) {
    return;
  }

  console.warn("AdminGoogleDriveConnection table is missing. Google Drive integration endpoints are in compatibility mode.");
  hasWarnedMissingGoogleDriveConnectionSchema = true;
}

function warnMissingProjectRepositorySchema() {
  if (hasWarnedMissingProjectRepositorySchema) {
    return;
  }

  console.warn("Project repository columns are missing. Project repository endpoints are in compatibility mode.");
  hasWarnedMissingProjectRepositorySchema = true;
}

function toConnectionPayload(connection) {
  if (!connection) {
    return {
      connected: false,
      account: null,
    };
  }

  return {
    connected: true,
    account: {
      email: connection.googleEmail || "",
      displayName: connection.googleDisplayName || "",
      linkedAt: connection.updatedAt ? new Date(connection.updatedAt).toISOString() : "",
    },
  };
}

export async function GET(request) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let connection = null;

    try {
      connection = await prisma.adminGoogleDriveConnection.findUnique({
        where: { adminId: admin.id },
        select: {
          googleEmail: true,
          googleDisplayName: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (!isMissingAdminGoogleDriveConnectionTableError(error)) {
        throw error;
      }

      warnMissingGoogleDriveConnectionSchema();
      return NextResponse.json(
        { error: "Google Drive integration is unavailable until database migrations are applied." },
        { status: 503 }
      );
    }

    const projectId = String(request.nextUrl.searchParams.get("projectId") || "").trim();
    let repository = null;

    if (projectId) {
      let project = null;

      try {
        project = await prisma.adminProject.findFirst({
          where: {
            id: projectId,
            adminId: admin.id,
          },
          select: ADMIN_PROJECT_REPOSITORY_SELECT,
        });
      } catch (error) {
        if (!isMissingAdminProjectTableError(error) && !isMissingProjectRepositoryColumnsError(error)) {
          throw error;
        }

        warnMissingProjectRepositorySchema();
        return NextResponse.json(
          { error: "Project repository is unavailable until database migrations are applied." },
          { status: 503 }
        );
      }

      if (!project) {
        return NextResponse.json({ error: "Project not found." }, { status: 404 });
      }

      repository = toRepositoryPayload(project);
    }

    return NextResponse.json({
      success: true,
      ...toConnectionPayload(connection),
      repository,
    });
  } catch (error) {
    console.error("Failed to load Google Drive integration status", error);
    return NextResponse.json({ error: "Unable to load Google Drive status." }, { status: 500 });
  }
}
