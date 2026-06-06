import { NextResponse } from "next/server";
import { getAdminFromApiRequest } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { validateAdminMutationRequest } from "../../../../lib/request-security";
import {
  ADMIN_PROFILE_GENDER_OPTIONS,
  calculateAgeFromBirthDate,
  isAdminProfileComplete,
  sanitizeProfileInput,
  validateProfileInput,
} from "../../../../lib/admin-profile";
import { getTanzaniaLocationHierarchy } from "../../../../lib/tanzania-locations";

function toGenderLabel(value) {
  if (value === "prefer_not_to_say") {
    return "Prefer not to say";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toProfilePayload(admin) {
  return {
    firstName: admin.firstName || "",
    lastName: admin.lastName || "",
    birthDate: admin.birthDate ? admin.birthDate.toISOString().slice(0, 10) : "",
    age: calculateAgeFromBirthDate(admin.birthDate),
    companyName: admin.companyName || "Lesaal",
    companyDescription: admin.companyDescription || "",
    profileImageUrl: admin.profileImageUrl || "",
    gender: admin.gender || "",
    region: admin.region || "",
    district: admin.district || "",
    ward: admin.ward || "",
    profileComplete: isAdminProfileComplete(admin),
  };
}

export async function GET(request) {
  try {
    const admin = await getAdminFromApiRequest(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentAdmin = await prisma.adminUser.findUnique({
      where: { id: admin.id },
      select: {
        firstName: true,
        lastName: true,
        birthDate: true,
        companyName: true,
        companyDescription: true,
        profileImageUrl: true,
        gender: true,
        region: true,
        district: true,
        ward: true,
      },
    });

    if (!currentAdmin) {
      return NextResponse.json({ error: "Admin account not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: toProfilePayload(currentAdmin),
      genderOptions: ADMIN_PROFILE_GENDER_OPTIONS.map((value) => ({
        value,
        label: toGenderLabel(value),
      })),
      locationHierarchy: getTanzaniaLocationHierarchy(),
    });
  } catch (error) {
    console.error("Failed to fetch admin profile", error);
    return NextResponse.json({ error: "Unable to load profile." }, { status: 500 });
  }
}

export async function PUT(request) {
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
    const input = sanitizeProfileInput(body);
    const validationError = validateProfileInput(input);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const updatedAdmin = await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        birthDate: input.birthDate,
        companyName: input.companyName,
        companyDescription: input.companyDescription,
        profileImageUrl: input.profileImageUrl,
        gender: input.gender,
        region: input.region,
        district: input.district,
        ward: input.ward,
      },
      select: {
        firstName: true,
        lastName: true,
        birthDate: true,
        companyName: true,
        companyDescription: true,
        profileImageUrl: true,
        gender: true,
        region: true,
        district: true,
        ward: true,
      },
    });

    return NextResponse.json({
      success: true,
      profile: toProfilePayload(updatedAdmin),
    });
  } catch (error) {
    console.error("Failed to update admin profile", error);
    return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }
}
