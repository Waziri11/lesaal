import PublicLanding from "../components/PublicLanding";
import { getLandingConfig } from "../lib/landing-config";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const config = await getLandingConfig();
  return <PublicLanding config={config} />;
}
