import { redirect } from "next/navigation";
import AdminLoginForm from "./AdminLoginForm";
import PageState from "../../../components/shared/PageState";
import { getAuthenticatedAdminFromCookies } from "../../../lib/auth";
import { getSecurityConfig } from "../../../lib/security-config";
import { isAdminProfileComplete } from "../../../lib/admin-profile";

export const dynamic = "force-dynamic";

function sanitizeNextPath(value) {
  const candidate = String(value || "").trim();

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return "";
  }

  if (!candidate.startsWith("/admin")) {
    return "";
  }

  return candidate;
}

export default async function AdminLoginPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const nextPath = sanitizeNextPath(resolvedSearchParams?.next);
  const reason = String(resolvedSearchParams?.reason || "").trim().toLowerCase();
  const sessionExpired = reason === "session-expired";
  const admin = await getAuthenticatedAdminFromCookies();

  if (admin) {
    if (!isAdminProfileComplete(admin)) {
      redirect("/admin/profile?setup=1");
    }

    if (nextPath) {
      redirect(nextPath);
    }

    redirect("/admin/dashboard");
  }

  try {
    const { turnstileSiteKey } = getSecurityConfig();

    return <AdminLoginForm turnstileSiteKey={turnstileSiteKey} nextPath={nextPath} sessionExpired={sessionExpired} />;
  } catch (error) {
    return <PageState status="error" errorMessage={error?.message || "Unable to load login page."} />;
  }
}
