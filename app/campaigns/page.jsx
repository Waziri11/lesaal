import Link from "next/link";
import PageState from "../../components/shared/PageState";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { getPublishedCampaigns, isCampaignTableMissingError } from "../../lib/campaigns";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Lesaal | Campaigns",
  description: "Explore active outreach campaigns and submit your response.",
};

function formatDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function CampaignsPage() {
  let campaigns = [];
  let errorMessage = "";

  try {
    campaigns = await getPublishedCampaigns();
  } catch (error) {
    if (isCampaignTableMissingError(error)) {
      campaigns = [];
    } else {
      errorMessage = error?.message || "Unable to load campaigns.";
    }
  }

  if (errorMessage) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        <PageState status="error" errorMessage={errorMessage} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <Card>
        <CardHeader className="space-y-4">
          <div>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>Browse current outreach programs and submit your details to participate.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/">Back to Homepage</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/login">Admin Log in</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <PageState status={campaigns.length ? "loaded" : "empty"} resourceLabel="campaigns">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardContent className="space-y-4 p-0">
                <Link href={`/campaigns/${campaign.slug}`} className="block overflow-hidden rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)]">
                  {campaign.imageUrl ? (
                    <img src={campaign.imageUrl} alt={campaign.title} className="h-44 w-full object-cover transition hover:scale-[1.02]" />
                  ) : (
                    <div className="flex h-44 items-center justify-center text-sm text-[color:var(--ui-muted-foreground)]">Campaign image</div>
                  )}
                </Link>

                <div className="space-y-2 px-5 pb-5">
                  <h3 className="text-lg font-semibold">{campaign.title}</h3>
                  <p className="text-sm text-[color:var(--ui-muted-foreground)]">{campaign.description}</p>
                  <p className="text-xs text-[color:var(--ui-muted-foreground)]">Target Market: {campaign.targetMarket || "General audience"}</p>
                  {campaign.deadline ? (
                    <p className="text-xs text-[color:var(--ui-muted-foreground)]">Active until {formatDate(campaign.deadline)}</p>
                  ) : null}
                </div>

                <div className="px-5 pb-5">
                  <Button asChild>
                    <Link href={`/campaigns/${campaign.slug}`}>Open Campaign Form</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      </PageState>
    </div>
  );
}
