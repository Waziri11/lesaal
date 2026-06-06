"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageState from "../shared/PageState";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

function formatDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function formatCount(value) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
}

export default function CampaignsManager() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responses, setResponses] = useState([]);
  const [responseQuestions, setResponseQuestions] = useState([]);
  const [campaignError, setCampaignError] = useState("");
  const [responsesError, setResponsesError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const campaignStats = useMemo(() => {
    const total = campaigns.length;
    const published = campaigns.filter((campaign) => campaign.isPublished).length;
    const drafts = total - published;
    const responsesCount = campaigns.reduce((sum, campaign) => sum + Number(campaign.responseCount || 0), 0);
    return { total, published, drafts, responsesCount };
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sorted = [...campaigns].sort((a, b) => {
      const aTime = Number(new Date(a.updatedAt || a.createdAt || 0));
      const bTime = Number(new Date(b.updatedAt || b.createdAt || 0));
      return bTime - aTime;
    });

    if (!query) return sorted;

    return sorted.filter((campaign) => {
      const searchable = [campaign.title, campaign.slug, campaign.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [campaigns, searchQuery]);

  async function loadCampaigns(preferredCampaignId = null) {
    setLoadingCampaigns(true);
    setCampaignError("");

    try {
      const response = await fetch("/api/admin/campaigns", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load campaigns.");
      }

      const nextCampaigns = Array.isArray(payload.campaigns) ? payload.campaigns : [];
      setCampaigns(nextCampaigns);

      const nextSelectedId =
        preferredCampaignId && nextCampaigns.some((campaign) => campaign.id === preferredCampaignId)
          ? preferredCampaignId
          : nextCampaigns[0]?.id || null;

      setSelectedCampaignId(nextSelectedId);

      if (!nextSelectedId) {
        setResponses([]);
        setResponseQuestions([]);
      }
    } catch (error) {
      setCampaignError(error.message || "Unable to load campaigns.");
    } finally {
      setLoadingCampaigns(false);
    }
  }

  async function loadResponses(campaignId) {
    if (!campaignId) {
      setResponses([]);
      setResponseQuestions([]);
      return;
    }

    setResponsesLoading(true);
    setResponsesError("");

    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}/responses`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load campaign responses.");
      }

      setResponses(Array.isArray(payload.responses) ? payload.responses : []);
      setResponseQuestions(Array.isArray(payload.questions) ? payload.questions : []);
    } catch (error) {
      setResponsesError(error.message || "Unable to load campaign responses.");
      setResponses([]);
      setResponseQuestions([]);
    } finally {
      setResponsesLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (!selectedCampaignId) return;
    loadResponses(selectedCampaignId);
  }, [selectedCampaignId]);

  function openExport() {
    if (!selectedCampaignId) return;
    window.open(`/api/admin/campaigns/${selectedCampaignId}/responses?format=csv`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>Create outreach campaigns, publish forms, and manage incoming responses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4">
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Total campaigns</p>
              <p className="mt-2 text-2xl font-semibold">{campaignStats.total}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4">
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Published</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--ui-success)]">{campaignStats.published}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4">
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Drafts</p>
              <p className="mt-2 text-2xl font-semibold">{campaignStats.drafts}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4">
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Total responses</p>
              <p className="mt-2 text-2xl font-semibold">{formatCount(campaignStats.responsesCount)}</p>
            </div>
          </div>

          {campaignError ? <p className="text-sm text-[color:var(--ui-destructive)]">{campaignError}</p> : null}
          {statusSuccess ? <p className="text-sm text-[color:var(--ui-success)]">{statusSuccess}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Campaign Library</CardTitle>
              <CardDescription>Campaign builder is now on its own page.</CardDescription>
            </div>
            <Button size="sm" onClick={() => router.push("/admin/campaigns/new")}>
              + New Campaign
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="w-full max-w-md">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search campaigns by title, slug, or description"
              />
            </div>
            <Badge variant="secondary">{filteredCampaigns.length} listed</Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <PageState
            status={loadingCampaigns ? "loading" : campaignError ? "error" : !campaigns.length ? "empty" : "loaded"}
            resourceLabel="campaigns"
            errorMessage={campaignError}
            onRetry={loadCampaigns}
            createAction={
              <Button type="button" size="sm" onClick={() => router.push("/admin/campaigns/new")}>
                Add Campaign
              </Button>
            }
          >
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>Responses</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => (
                    <TableRow
                      key={campaign.id}
                      className={`cursor-pointer ${
                        selectedCampaignId === campaign.id ? "bg-[color:var(--ui-primary-soft)] hover:bg-[color:var(--ui-primary-soft)]" : ""
                      }`}
                      onClick={() => setSelectedCampaignId(campaign.id)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-semibold">{campaign.title}</p>
                          <p className="text-xs text-[color:var(--ui-muted-foreground)]">/{campaign.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={campaign.isPublished ? "success" : "default"}>
                          {campaign.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>{campaign.questionCount || 0}</TableCell>
                      <TableCell>{campaign.responseCount || 0}</TableCell>
                      <TableCell>{formatDateTime(campaign.updatedAt || campaign.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push(`/admin/campaigns/${campaign.id}`);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedCampaignId(campaign.id);
                            }}
                          >
                            Responses
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {!filteredCampaigns.length ? (
                <p className="mt-3 text-sm text-[color:var(--ui-muted-foreground)]">No campaigns matched that search.</p>
              ) : null}
            </>
          </PageState>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Responses</CardTitle>
            <CardDescription>Review incoming form responses for the selected campaign.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{responses.length} responses</Badge>
            <Button type="button" variant="outline" onClick={openExport} disabled={!selectedCampaignId || !responses.length}>
              Export CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <PageState
            status={
              responsesLoading
                ? "loading"
                : responsesError
                  ? "error"
                : !selectedCampaignId
                  ? "empty"
                  : responses.length
                    ? "loaded"
                    : "empty"
            }
            resourceLabel={selectedCampaignId ? "responses" : "selected campaign responses"}
            errorMessage={responsesError}
            onRetry={() => loadResponses(selectedCampaignId)}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted At</TableHead>
                  {responseQuestions.map((question) => (
                    <TableHead key={question.id || question.key}>{question.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell>{formatDateTime(response.submittedAt)}</TableCell>
                    {responseQuestions.map((question) => (
                      <TableCell key={`${response.id}_${question.key}`}>{String(response.data?.[question.key] || "-")}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </PageState>
        </CardContent>
      </Card>
    </div>
  );
}
