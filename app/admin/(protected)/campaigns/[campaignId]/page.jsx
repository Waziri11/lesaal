import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import PageState from "../../../../../components/shared/PageState";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { Card, CardContent } from "../../../../../components/ui/card";
import { getCampaignByIdForAdmin, isCampaignTableMissingError } from "../../../../../lib/campaigns";

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCount(value) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function getDurationLabel(campaign) {
  const createdAt = new Date(campaign.createdAt);
  const deadline = campaign.deadline ? new Date(campaign.deadline) : null;

  if (Number.isNaN(createdAt.getTime()) || !deadline || Number.isNaN(deadline.getTime())) {
    return "No deadline";
  }

  const days = Math.max(1, Math.ceil((deadline.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
  return `${formatDate(createdAt)} to ${formatDate(deadline)} (${days} days)`;
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
  const campaignId = String(params?.campaignId || "");

  if (!campaignId) {
    notFound();
  }

  try {
    const campaign = await getCampaignByIdForAdmin(campaignId);

    if (!campaign) {
      notFound();
    }

    const status = getStatus(campaign);
    const sections = getSections(campaign);

    return (
      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Campaign viewer</p>
            <h2 className="text-2xl font-semibold text-[color:var(--ui-foreground)]">{campaign.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge variant="secondary">/{campaign.slug}</Badge>
              <Badge variant="default">{formatCount(campaign.responseCount)} responses</Badge>
            </div>
          </div>

          <Button type="button" variant="outline" asChild>
            <Link href="/admin/campaigns">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to campaigns
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="space-y-5 p-5 md:p-6">
            {campaign.imageUrl ? (
              <img
                src={campaign.imageUrl}
                alt={`${campaign.title} banner`}
                className="h-56 w-full rounded-xl border border-[color:var(--ui-border)] object-cover"
              />
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-3">
                <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Target market</p>
                <p className="mt-1 text-sm font-medium text-[color:var(--ui-foreground)]">{campaign.targetMarket || "-"}</p>
              </div>
              <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-3">
                <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Deadline</p>
                <p className="mt-1 text-sm font-medium text-[color:var(--ui-foreground)]">
                  {campaign.deadline ? formatDate(campaign.deadline) : "No deadline"}
                </p>
              </div>
              <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-3">
                <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Duration</p>
                <p className="mt-1 text-sm font-medium text-[color:var(--ui-foreground)]">{getDurationLabel(campaign)}</p>
              </div>
              <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-3">
                <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Created</p>
                <p className="mt-1 text-sm font-medium text-[color:var(--ui-foreground)]">{formatDate(campaign.createdAt)}</p>
              </div>
              <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-3">
                <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Last updated</p>
                <p className="mt-1 text-sm font-medium text-[color:var(--ui-foreground)]">{formatDate(campaign.updatedAt)}</p>
              </div>
              <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-3">
                <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Questions</p>
                <p className="mt-1 text-sm font-medium text-[color:var(--ui-foreground)]">{Number(campaign.questionCount || 0)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[color:var(--ui-foreground)]">Description</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-[color:var(--ui-muted-foreground)]">
                {campaign.description || "No description provided."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5 md:p-6">
            <p className="text-sm font-semibold text-[color:var(--ui-foreground)]">Form sections</p>
            {sections.length ? (
              sections.map((section, index) => (
                <div
                  key={section?.id || section?.key || `${index}-${section?.title || "section"}`}
                  className="rounded-xl border border-[color:var(--ui-border)] p-3"
                >
                  <p className="text-sm font-semibold text-[color:var(--ui-foreground)]">
                    {section?.title || `Section ${index + 1}`}
                  </p>
                  {section?.description ? (
                    <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">{section.description}</p>
                  ) : null}

                  <div className="mt-3 space-y-2">
                    {(section?.questions || []).map((question, questionIndex) => (
                      <div
                        key={question?.id || question?.key || `${index}-${questionIndex}`}
                        className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-2.5"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-[color:var(--ui-foreground)]">
                            {question?.label || question?.key || `Question ${questionIndex + 1}`}
                          </span>
                          <Badge variant="default" className="text-xs">
                            {question?.type || "text"}
                          </Badge>
                          {question?.required ? (
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          ) : null}
                        </div>
                        {question?.placeholder ? (
                          <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">Placeholder: {question.placeholder}</p>
                        ) : null}
                        {question?.type === "select" && Array.isArray(question?.options) && question.options.length ? (
                          <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">Options: {question.options.join(", ")}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[color:var(--ui-muted-foreground)]">No form sections configured.</p>
            )}
          </CardContent>
        </Card>
      </section>
    );
  } catch (error) {
    const message = isCampaignTableMissingError(error)
      ? "Campaign tables are not initialized. Run database migrations and retry."
      : error?.message || "Unable to load campaign.";
    return <PageState status="error" errorMessage={message} />;
  }
}
