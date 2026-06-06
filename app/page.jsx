import "./styles/landing.css";
import PublicLandingRuntime from "../components/PublicLandingRuntime";
import { getPublishedCampaigns, isCampaignTableMissingError } from "../lib/campaigns";
import { getLandingConfig } from "../lib/landing-config";

export const revalidate = 60;

export default async function HomePage() {
  const config = await getLandingConfig();
  let campaigns = [];

  try {
    campaigns = await getPublishedCampaigns();
  } catch (error) {
    if (!isCampaignTableMissingError(error)) {
      throw error;
    }
  }

  return <PublicLandingRuntime config={config} campaigns={campaigns} />;
}
