import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../lib/request-security";

function isMissingAdminNoteTableError(error) {
  if (!error) return false;

  if (error?.code !== "P2021" && error?.code !== "P2022") {
    return false;
  }

  const message = String(error?.message || "").toLowerCase();
  return message.includes("adminnote");
}

let hasWarnedMissingAdminNoteTable = false;

function warnIfMissingAdminNoteTable() {
  if (hasWarnedMissingAdminNoteTable) {
    return;
  }

  console.warn("AdminNote table is missing. Notes endpoints are running in compatibility mode.");
  hasWarnedMissingAdminNoteTable = true;
}

function normalizeNoteInput(body) {
  const title = String(body?.title || "").trim();
  const content = String(body?.content ?? "");

  return {
    title: title || "Untitled note",
    content,
  };
}

export async function GET(request) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let notes;

    try {
      notes = await prisma.adminNote.findMany({
        where: { adminId: admin.id },
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      });
    } catch (error) {
      if (!isMissingAdminNoteTableError(error)) {
        throw error;
      }

      warnIfMissingAdminNoteTable();
      notes = [];
    }

    return NextResponse.json({ success: true, notes });
  } catch (error) {
    console.error("Failed to fetch notes", error);
    return NextResponse.json({ error: "Unable to load notes." }, { status: 500 });
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
    const input = normalizeNoteInput(body);

    let note;

    try {
      note = await prisma.adminNote.create({
        data: {
          adminId: admin.id,
          title: input.title,
          content: input.content,
        },
      });
    } catch (error) {
      if (!isMissingAdminNoteTableError(error)) {
        throw error;
      }

      warnIfMissingAdminNoteTable();
      return NextResponse.json(
        { error: "Notes are unavailable until database migrations are applied." },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error("Failed to create note", error);
    return NextResponse.json({ error: "Unable to create note." }, { status: 500 });
  }
}
