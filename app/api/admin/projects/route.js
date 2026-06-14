import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../lib/request-security";

const DEFAULT_PAGE_LIMIT = 30;
const MAX_PAGE_LIMIT = 100;

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

function parsePaginationParams(searchParams) {
  const parsedLimit = Number.parseInt(String(searchParams.get("limit") || DEFAULT_PAGE_LIMIT), 10);
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), MAX_PAGE_LIMIT)
    : DEFAULT_PAGE_LIMIT;
  const cursor = String(searchParams.get("cursor") || "").trim() || null;
  return { limit, cursor };
}

export async function GET(request) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let projects = [];
    let nextCursor = null;
    let hasMore = false;
    const pagination = parsePaginationParams(request.nextUrl.searchParams);

    try {
      const pageRows = await prisma.adminProject.findMany({
        where: { adminId: admin.id },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: pagination.limit + 1,
        cursor: pagination.cursor ? { id: pagination.cursor } : undefined,
        skip: pagination.cursor ? 1 : 0,
      });

      hasMore = pageRows.length > pagination.limit;
      projects = hasMore ? pageRows.slice(0, pagination.limit) : pageRows;
      nextCursor = hasMore ? projects[projects.length - 1]?.id || null : null;
    } catch (error) {
      if (!isMissingAdminProjectTableError(error)) {
        throw error;
      }

      warnIfMissingAdminProjectTable();
      projects = [];
      nextCursor = null;
      hasMore = false;
    }

    return NextResponse.json({ success: true, projects, nextCursor, hasMore });
  } catch (error) {
    console.error("Failed to fetch projects", error);
    return NextResponse.json({ error: "Unable to load projects." }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const securityError = validateAdminMutationRequest(request);
    if (securityError) {
      return securityError;
    }

    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const input = normalizeProjectInput(body);

    let project;

    try {
      project = await prisma.adminProject.create({
        data: {
          adminId: admin.id,
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
    console.error("Failed to create project", error);
    return NextResponse.json({ error: "Unable to create project." }, { status: 500 });
  }
}
