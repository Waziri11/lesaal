import Link from "next/link";
import Image from "next/image";
import CampaignResponseForm from "../../../components/CampaignResponseForm";
import PageState from "../../../components/shared/PageState";
import { Button } from "../../../components/ui/button";
import { getCampaignBySlugForPublic, isCampaignTableMissingError } from "../../../lib/campaigns";
import { getSecurityConfig } from "../../../lib/security-config";

export const revalidate = 60;

function formatTimeRemaining(value, nowTimestamp = Date.now()) {
  if (!value) return "No deadline";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No deadline";

  const diffMs = parsed.getTime() - nowTimestamp;
  if (diffMs <= 0) return "Expired";

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  if (totalMinutes < 60) {
    return `${Math.max(1, totalMinutes)} minute${totalMinutes === 1 ? "" : "s"}`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours} hour${totalHours === 1 ? "" : "s"}`;
  }

  const totalDays = Math.floor(totalHours / 24);
  if (totalDays < 30) {
    return `${totalDays} day${totalDays === 1 ? "" : "s"}`;
  }

  const totalMonths = Math.floor(totalDays / 30);
  if (totalMonths < 12) {
    return `${totalMonths} month${totalMonths === 1 ? "" : "s"}`;
  }

  const totalYears = Math.floor(totalDays / 365);
  return `${totalYears} year${totalYears === 1 ? "" : "s"}`;
}

function isLocalImageSrc(src) {
  return typeof src === "string" && src.startsWith("/");
}

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
  const resolvedParams = await params;
  const slug = String(resolvedParams?.slug || "");
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
  const resolvedParams = await params;
  const slug = String(resolvedParams?.slug || "");

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
      <div className="overflow-hidden rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]">
        {campaign.imageUrl ? (
          <Image
            src={campaign.imageUrl}
            alt={campaign.title}
            width={1920}
            height={1080}
            sizes="100vw"
            priority
            unoptimized={!isLocalImageSrc(campaign.imageUrl)}
            className="h-[260px] w-full object-cover md:h-[360px] lg:h-[440px]"
          />
        ) : (
          <div className="flex h-[260px] items-center justify-center text-sm text-[color:var(--ui-muted-foreground)] md:h-[360px] lg:h-[440px]">
            Campaign image
          </div>
        )}
      </div>

      <section className="space-y-3 rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-5 md:p-6">
        <h1 className="text-2xl font-semibold text-[color:var(--ui-foreground)] md:text-3xl">{campaign.title}</h1>
        <p className="text-base leading-relaxed text-[color:var(--ui-muted-foreground)]">
          {campaign.description || "Campaign details coming soon."}
        </p>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-[color:var(--ui-muted-foreground)] md:text-base">
          {campaign.targetMarket ? (
            <p>
              <strong className="font-semibold text-[color:var(--ui-foreground)]">Target market:</strong> {campaign.targetMarket}
            </p>
          ) : null}
          <p>
            <strong className="font-semibold text-[color:var(--ui-foreground)]">Time remaining:</strong>{" "}
            {formatTimeRemaining(campaign.deadline)}
          </p>
        </div>
      </section>

      <div>
        <CampaignResponseForm campaign={campaign} turnstileSiteKey={turnstileSiteKey} />
      </div>
    </div>
  );
}
