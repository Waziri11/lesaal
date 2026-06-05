import CampaignBuilderPage from "../../../../../components/admin/CampaignBuilderPage";

export default async function EditCampaignPage({ params }) {
  const resolvedParams = await params;
  const campaignId = String(resolvedParams?.campaignId || "");

  return <CampaignBuilderPage campaignId={campaignId} />;
}
