import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../../lib/request-security";

function normalizeNoteInput(body) {
  const title = String(body?.title || "").trim();
  const content = String(body?.content ?? "");

  return {
    title: title || "Untitled note",
    content,
  };
}

async function loadNoteForAdmin(adminId, noteId) {
  return prisma.adminNote.findFirst({
    where: {
      id: noteId,
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

    const noteId = String(params?.noteId || "");
    const note = await loadNoteForAdmin(admin.id, noteId);

    if (!note) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error("Failed to fetch note", error);
    return NextResponse.json({ error: "Unable to load note." }, { status: 500 });
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

    const noteId = String(params?.noteId || "");
    const existing = await loadNoteForAdmin(admin.id, noteId);

    if (!existing) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }

    const body = await request.json();
    const input = normalizeNoteInput(body);

    const note = await prisma.adminNote.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        content: input.content,
      },
    });

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error("Failed to update note", error);
    return NextResponse.json({ error: "Unable to update note." }, { status: 500 });
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

    const noteId = String(params?.noteId || "");
    const existing = await loadNoteForAdmin(admin.id, noteId);

    if (!existing) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }

    await prisma.adminNote.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete note", error);
    return NextResponse.json({ error: "Unable to delete note." }, { status: 500 });
  }
}
