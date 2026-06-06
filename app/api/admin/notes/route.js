import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../lib/request-security";

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

    const notes = await prisma.adminNote.findMany({
      where: { adminId: admin.id },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });

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

    const note = await prisma.adminNote.create({
      data: {
        adminId: admin.id,
        title: input.title,
        content: input.content,
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error("Failed to create note", error);
    return NextResponse.json({ error: "Unable to create note." }, { status: 500 });
  }
}
