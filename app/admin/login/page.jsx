import AdminLoginForm from "./AdminLoginForm";
import { getSecurityConfig } from "../../../lib/security-config";

export const dynamic = "force-dynamic";

export default function AdminLoginPage() {
  const { turnstileSiteKey } = getSecurityConfig();

  return <AdminLoginForm turnstileSiteKey={turnstileSiteKey} />;
}

