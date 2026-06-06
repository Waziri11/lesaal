import { isValidTanzaniaLocationSelection } from "./tanzania-locations";

export const ADMIN_PROFILE_GENDER_OPTIONS = ["male", "female", "other", "prefer_not_to_say"];

const REQUIRED_PROFILE_FIELDS = [
  "firstName",
  "lastName",
  "birthDate",
  "companyName",
  "companyDescription",
  "gender",
  "region",
  "district",
  "ward",
];

export function normalizeOptionalText(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

export function calculateAgeFromBirthDate(birthDate, now = new Date()) {
  if (!birthDate) {
    return null;
  }

  const birth = new Date(birthDate);

  if (Number.isNaN(birth.getTime()) || birth > now) {
    return null;
  }

  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

export function isAdminProfileComplete(admin) {
  if (!admin) {
    return false;
  }

  for (const field of REQUIRED_PROFILE_FIELDS) {
    const value = admin[field];

    if (field === "birthDate") {
      if (!value || Number.isNaN(new Date(value).getTime())) {
        return false;
      }
      continue;
    }

    if (!String(value || "").trim()) {
      return false;
    }
  }

  return isValidTanzaniaLocationSelection(admin.region, admin.district, admin.ward);
}

export function getGreetingForTime({ date = new Date(), timeZone = "Africa/Dar_es_Salaam" } = {}) {
  const hourFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone,
  });

  const hour = Number.parseInt(hourFormatter.format(date), 10);

  if (Number.isNaN(hour)) {
    return "Welcome";
  }

  if (hour >= 5 && hour < 12) {
    return "Good morning";
  }

  if (hour >= 12 && hour < 17) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function sanitizeProfileInput(rawInput) {
  const firstName = normalizeOptionalText(rawInput?.firstName);
  const lastName = normalizeOptionalText(rawInput?.lastName);
  const companyName = normalizeOptionalText(rawInput?.companyName) || "Lesaal";
  const companyDescription = normalizeOptionalText(rawInput?.companyDescription);
  const profileImageUrl = normalizeOptionalText(rawInput?.profileImageUrl);
  const gender = String(rawInput?.gender || "").trim().toLowerCase();
  const region = normalizeOptionalText(rawInput?.region);
  const district = normalizeOptionalText(rawInput?.district);
  const ward = normalizeOptionalText(rawInput?.ward);

  const birthDateInput = String(rawInput?.birthDate || "").trim();
  const birthDate = birthDateInput ? new Date(birthDateInput) : null;

  return {
    firstName,
    lastName,
    birthDate,
    companyName,
    companyDescription,
    profileImageUrl,
    gender,
    region,
    district,
    ward,
  };
}

export function validateProfileInput(input) {
  if (!input.firstName || !input.lastName) {
    return "First name and last name are required.";
  }

  if (!input.birthDate || Number.isNaN(input.birthDate.getTime())) {
    return "Birth date is required.";
  }

  const now = new Date();
  if (input.birthDate > now) {
    return "Birth date cannot be in the future.";
  }

  if (!input.companyName) {
    return "Company name is required.";
  }

  if (!input.companyDescription) {
    return "Company description is required.";
  }

  if (!ADMIN_PROFILE_GENDER_OPTIONS.includes(input.gender)) {
    return "Please choose a valid gender option.";
  }

  if (!input.region || !input.district || !input.ward) {
    return "Region, district, and ward are required.";
  }

  if (!isValidTanzaniaLocationSelection(input.region, input.district, input.ward)) {
    return "Please choose a valid Region > District > Ward combination for Tanzania.";
  }

  return null;
}
