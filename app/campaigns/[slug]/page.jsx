import Link from "next/link";
import CampaignResponseForm from "../../../components/CampaignResponseForm";
import PageState from "../../../components/shared/PageState";
import { Button } from "../../../components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { getCampaignBySlugForPublic, isCampaignTableMissingError } from "../../../lib/campaigns";
import { getSecurityConfig } from "../../../lib/security-config";

export const dynamic = "force-dynamic";

async function loadCampaign(slug) {
  try {
    return await getCampaignBySlugForPublic(slug);
  } catch (error) {
    if (isCampaignTableMissingError(error)) {
      return null;
    }

    throw error;
  }
}

export async function generateMetadata({ params }) {
  const slug = String(params?.slug || "");
  const campaign = await loadCampaign(slug);

  if (!campaign) {
    return {
      title: "Campaign Not Found | Lesaal",
      description: "The requested campaign could not be found.",
    };
  }

  return {
    title: `${campaign.title} | Lesaal Campaigns`,
    description: campaign.description,
  };
}

export default async function CampaignDetailPage({ params }) {
  const slug = String(params?.slug || "");

  let campaign = null;
  let turnstileSiteKey = "";
  let errorMessage = "";

  try {
    campaign = await loadCampaign(slug);
    turnstileSiteKey = getSecurityConfig().turnstileSiteKey;
  } catch (error) {
    errorMessage = error?.message || "Unable to load campaign details.";
  }

  if (errorMessage) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <PageState status="error" errorMessage={errorMessage} />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        <PageState
          status="empty"
          resourceLabel="campaign details"
          createAction={
            <Button asChild>
              <Link href="/campaigns">Back to campaigns</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>{campaign.title}</CardTitle>
            <CardDescription>{campaign.description}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/campaigns">View all campaigns</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Back to Homepage</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="overflow-hidden rounded-xl">
            {campaign.imageUrl ? (
              <img src={campaign.imageUrl} alt={campaign.title} className="h-full min-h-[280px] w-full object-cover" />
            ) : (
              <div className="flex min-h-[280px] items-center justify-center text-sm text-[color:var(--ui-muted-foreground)]">Campaign image</div>
            )}
          </div>
        </Card>

        <CampaignResponseForm campaign={campaign} turnstileSiteKey={turnstileSiteKey} />
      </div>
    </div>
  );
}
