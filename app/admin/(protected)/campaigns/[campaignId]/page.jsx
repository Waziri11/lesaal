import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import CampaignViewerPanel from "../../../../../components/admin/CampaignViewerPanel";
import PageState from "../../../../../components/shared/PageState";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { getCampaignByIdForAdmin, getCampaignResponsesForAdmin, isCampaignTableMissingError } from "../../../../../lib/campaigns";

function formatCount(value) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function getTimeRemainingLabel(deadlineValue) {
  if (!deadlineValue) return "No deadline";

  const deadline = new Date(deadlineValue);
  if (Number.isNaN(deadline.getTime())) return "No deadline";

  const diffMs = deadline.getTime() - Date.now();
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

function getStatus(campaign) {
  const deadline = campaign.deadline ? new Date(campaign.deadline) : null;
  const isExpired = deadline && !Number.isNaN(deadline.getTime()) && deadline.getTime() < Date.now();

  if (!campaign.isPublished) {
    return { label: "Disabled", variant: "default" };
  }

  if (isExpired) {
    return { label: "Expired", variant: "destructive" };
  }

  return { label: "Active", variant: "success" };
}

function getSections(campaign) {
  if (Array.isArray(campaign?.sections) && campaign.sections.length) {
    return campaign.sections;
  }

  if (Array.isArray(campaign?.questions) && campaign.questions.length) {
    return [
      {
        id: "general",
        key: "general",
        title: "Form questions",
        description: "",
        questions: campaign.questions,
      },
    ];
  }

  return [];
}

export default async function CampaignViewerPage({ params }) {
  const resolvedParams = await params;
  const campaignId = String(resolvedParams?.campaignId || "");

  if (!campaignId) {
    notFound();
  }

  try {
    const [campaign, responseData] = await Promise.all([
      getCampaignByIdForAdmin(campaignId),
      getCampaignResponsesForAdmin(campaignId, { includeAllResponses: true }),
    ]);

    if (!campaign) {
      notFound();
    }

    const status = getStatus(campaign);
    const timeRemainingLabel = getTimeRemainingLabel(campaign.deadline);
    const sections = getSections(campaign);
    const responseQuestions = Array.isArray(responseData?.questions) ? responseData.questions : [];
    const responses = Array.isArray(responseData?.responses)
      ? responseData.responses.map((response) => ({
          id: response.id,
          submittedAt: response.submittedAt ? new Date(response.submittedAt).toISOString() : null,
          data: response.data && typeof response.data === "object" ? response.data : {},
        }))
      : [];

    return (
      <section className="space-y-6">
        <div className="rounded-3xl border border-white/15 bg-[linear-gradient(90deg,#04103b_0%,#08204f_45%,#3a3529_100%)] p-5 md:p-6">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              asChild
            >
              <Link href="/admin/campaigns" aria-label="Back to campaigns">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h2 className="text-4xl font-semibold tracking-tight text-white">{campaign.title}</h2>
          </div>
          <div className="mt-5 relative overflow-hidden rounded-2xl border border-white/20 bg-black/30">
            <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge variant="secondary">/{campaign.slug}</Badge>
              <Badge variant="default">{formatCount(campaign.responseCount)} responses</Badge>
            </div>
            <div>
              {campaign.imageUrl ? (
                <img
                  src={campaign.imageUrl}
                  alt={`${campaign.title} banner`}
                  className="h-[520px] w-full object-cover"
                />
              ) : (
                <div className="flex h-[520px] items-center justify-center text-sm text-[color:var(--ui-muted-foreground)]">
                  Campaign image
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-6 md:p-8">
                <p className="max-w-5xl whitespace-pre-wrap text-lg leading-relaxed text-white/90 md:text-[22px]">
                  {campaign.description || "No description provided."}
                </p>
                <div className="mt-4 flex items-end gap-3">
                  <p className="text-2xl text-white/95">
                    <strong className="font-semibold text-white">Target market:</strong> {campaign.targetMarket || "General audience"}
                  </p>
                  <p className="ml-auto text-right text-2xl text-white/95">
                    <strong className="font-semibold text-white">Time remaining:</strong> {timeRemainingLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CampaignViewerPanel sections={sections} questions={responseQuestions} responses={responses} />
      </section>
    );
  } catch (error) {
    const message = isCampaignTableMissingError(error)
      ? "Campaign tables are not initialized. Run database migrations and retry."
      : error?.message || "Unable to load campaign.";
    return <PageState status="error" errorMessage={message} />;
  }
}
