import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { getAdminFromApiRequest } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../lib/request-security";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1920;
const WEBP_QUALITY = 78;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const EXTENSION_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};
const OUTPUT_MIME_TYPE = "image/webp";
const OUTPUT_EXTENSION = ".webp";

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function detectMimeTypeFromMagic(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  if (buffer.length >= 6) {
    const signature = buffer.toString("ascii", 0, 6);
    if (signature === "GIF87a" || signature === "GIF89a") {
      return "image/gif";
    }
  }

  return "";
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

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 5MB." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const detectedMimeType = detectMimeTypeFromMagic(buffer);
    const cleanedOriginalFilename = sanitizeFilename(file.name || "upload");
    const extension = path.extname(cleanedOriginalFilename).toLowerCase();
    const extensionMimeType = EXTENSION_TO_MIME[extension];

    if (!detectedMimeType || !extensionMimeType || detectedMimeType !== extensionMimeType) {
      return NextResponse.json({ error: "File type validation failed." }, { status: 400 });
    }

    if (file.type && file.type !== detectedMimeType) {
      return NextResponse.json({ error: "File MIME type mismatch." }, { status: 400 });
    }

    const sourceImage = sharp(buffer, { animated: true, failOn: "none" }).rotate();
    const sourceMetadata = await sourceImage.metadata();

    const shouldResize =
      (typeof sourceMetadata.width === "number" && sourceMetadata.width > MAX_IMAGE_DIMENSION) ||
      (typeof sourceMetadata.height === "number" && sourceMetadata.height > MAX_IMAGE_DIMENSION);

    if (shouldResize) {
      sourceImage.resize({
        width: MAX_IMAGE_DIMENSION,
        height: MAX_IMAGE_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    const optimizedBuffer = await sourceImage.webp({ quality: WEBP_QUALITY, effort: 5 }).toBuffer();
    const randomPart = crypto.randomBytes(16).toString("hex");
    const filename = `${Date.now()}-${randomPart}${OUTPUT_EXTENSION}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filePath = path.join(uploadDir, filename);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(filePath, optimizedBuffer);

    const url = `/uploads/${filename}`;

    try {
      await prisma.mediaAsset.create({
        data: {
          filename,
          originalName: file.name,
          mimeType: OUTPUT_MIME_TYPE,
          size: optimizedBuffer.byteLength,
          url,
          uploadedById: admin.id,
        },
      });
    } catch (assetError) {
      // File is already saved to disk; do not fail upload solely because metadata persistence failed.
      console.warn("Media asset metadata save failed; returning upload URL anyway.", assetError);
    }

    return NextResponse.json({ success: true, url, filename });
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
