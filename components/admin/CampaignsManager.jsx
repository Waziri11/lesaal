"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageState from "../shared/PageState";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { createCsrfHeaders } from "../../lib/csrf-client";

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
    return { label: "Expired", variant: "secondary" };
  }

  return { label: "Active", variant: "success" };
}

export default function CampaignsManager() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [campaignError, setCampaignError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingCampaignId, setUpdatingCampaignId] = useState(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState(null);

  const campaignStats = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((campaign) => campaign.isPublished).length;
    const disabled = total - active;
    const responsesCount = campaigns.reduce((sum, campaign) => sum + Number(campaign.responseCount || 0), 0);
    return { total, active, disabled, responsesCount };
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
      const searchable = [campaign.title, campaign.slug, campaign.description, campaign.targetMarket]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [campaigns, searchQuery]);

  async function loadCampaigns() {
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
    } catch (error) {
      setCampaignError(error.message || "Unable to load campaigns.");
    } finally {
      setLoadingCampaigns(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function toggleCampaignState(campaign) {
    if (!campaign?.id || updatingCampaignId) return;

    setUpdatingCampaignId(campaign.id);
    setCampaignError("");
    setStatusSuccess("");

    try {
      const response = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: createCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          isPublished: !campaign.isPublished,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to update campaign status.");
      }

      setStatusSuccess(`Campaign ${payload.campaign.isPublished ? "enabled" : "disabled"} successfully.`);
      await loadCampaigns();
    } catch (error) {
      setCampaignError(error.message || "Unable to update campaign status.");
    } finally {
      setUpdatingCampaignId(null);
    }
  }

  async function deleteCampaign(campaign) {
    if (!campaign?.id || deletingCampaignId) return;

    const confirmed = window.confirm(`Delete \"${campaign.title}\" and all responses?`);
    if (!confirmed) return;

    setDeletingCampaignId(campaign.id);
    setCampaignError("");
    setStatusSuccess("");

    try {
      const response = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: "DELETE",
        headers: createCsrfHeaders(),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete campaign.");
      }

      setStatusSuccess("Campaign deleted successfully.");
      await loadCampaigns();
    } catch (error) {
      setCampaignError(error.message || "Unable to delete campaign.");
    } finally {
      setDeletingCampaignId(null);
    }
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
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Active</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--ui-success)]">{campaignStats.active}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4">
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Disabled</p>
              <p className="mt-2 text-2xl font-semibold">{campaignStats.disabled}</p>
            </div>
            <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4">
              <p className="text-xs uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Responses</p>
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
              <CardDescription>Click a row to open campaign details and responses.</CardDescription>
            </div>
            <Button size="sm" onClick={() => router.push("/admin/campaigns/new")}>+ New Campaign</Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="w-full max-w-md">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search campaigns by title, target market, or description"
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
              <Button type="button" size="sm" onClick={() => router.push("/admin/campaigns/new")}>Add Campaign</Button>
            }
          >
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Title</TableHead>
                    <TableHead>Target Market</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Responses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => {
                    const status = getStatus(campaign);
                    const isUpdating = updatingCampaignId === campaign.id;
                    const isDeleting = deletingCampaignId === campaign.id;

                    return (
                      <TableRow key={campaign.id} className="cursor-pointer" onClick={() => router.push(`/admin/campaigns/${campaign.id}`)}>
                        <TableCell>
                          <div>
                            <p className="font-semibold">{campaign.title}</p>
                            <p className="text-xs text-[color:var(--ui-muted-foreground)]">/{campaign.slug}</p>
                          </div>
                        </TableCell>
                        <TableCell>{campaign.targetMarket || "-"}</TableCell>
                        <TableCell>{getDurationLabel(campaign)}</TableCell>
                        <TableCell>{campaign.responseCount || 0}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
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
                              View
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isUpdating || isDeleting}
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleCampaignState(campaign);
                              }}
                            >
                              {isUpdating ? "Updating..." : campaign.isPublished ? "Disable" : "Enable"}
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              disabled={isDeleting || isUpdating}
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteCampaign(campaign);
                              }}
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {!filteredCampaigns.length ? (
                <p className="mt-3 text-sm text-[color:var(--ui-muted-foreground)]">No campaigns matched that search.</p>
              ) : null}
            </>
          </PageState>
        </CardContent>
      </Card>
    </div>
  );
}
