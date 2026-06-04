"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Textarea } from "../ui/textarea";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function createEmptyQuestion(index = 0) {
  return {
    id: `temp_q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    key: `field_${index + 1}`,
    label: "Question",
    type: "text",
    required: false,
    placeholder: "",
    options: [],
    isVisible: true,
    order: index,
  };
}

function createEmptyCampaignDraft(order = 0) {
  return {
    title: "",
    slug: "",
    description: "",
    imageUrl: "",
    isPublished: true,
    order,
    questions: [
      {
        ...createEmptyQuestion(0),
        key: "full_name",
        label: "Full Name",
        required: true,
        placeholder: "Jane Doe",
      },
      {
        ...createEmptyQuestion(1),
        key: "email",
        label: "Email",
        type: "email",
        required: true,
        placeholder: "you@example.com",
      },
      {
        ...createEmptyQuestion(2),
        key: "message",
        label: "Message",
        type: "textarea",
        required: true,
        placeholder: "Tell us why you want to join this campaign.",
      },
    ],
  };
}

function campaignToDraft(campaign) {
  return {
    title: campaign?.title || "",
    slug: campaign?.slug || "",
    description: campaign?.description || "",
    imageUrl: campaign?.imageUrl || "",
    isPublished: campaign?.isPublished !== false,
    order: Number.isFinite(campaign?.order) ? campaign.order : 0,
    questions:
      Array.isArray(campaign?.questions) && campaign.questions.length
        ? campaign.questions.map((question, index) => ({
            ...question,
            order: index,
            options: Array.isArray(question.options) ? question.options : [],
          }))
        : [createEmptyQuestion(0)],
  };
}

function reorderByIndex(items, sourceIndex, targetIndex) {
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return items;
  }

  const next = [...items];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);

  return next.map((item, index) => ({
    ...item,
    order: index,
  }));
}

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
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [draft, setDraft] = useState(createEmptyCampaignDraft());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responses, setResponses] = useState([]);
  const [responseQuestions, setResponseQuestions] = useState([]);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

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
    setStatusError("");

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
        setDraft(createEmptyCampaignDraft(nextCampaigns.length));
        setResponses([]);
        setResponseQuestions([]);
      }
    } catch (error) {
      setStatusError(error.message || "Unable to load campaigns.");
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

    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}/responses`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load campaign responses.");
      }

      setResponses(Array.isArray(payload.responses) ? payload.responses : []);
      setResponseQuestions(Array.isArray(payload.questions) ? payload.questions : []);
    } catch (error) {
      setStatusError(error.message || "Unable to load campaign responses.");
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
    if (!selectedCampaign) return;
    setDraft(campaignToDraft(selectedCampaign));
    loadResponses(selectedCampaign.id);
  }, [selectedCampaign]);

  function startCreatingCampaign() {
    setSelectedCampaignId(null);
    setStatusError("");
    setStatusSuccess("");
    setDraft(createEmptyCampaignDraft(campaigns.length));
    setResponses([]);
    setResponseQuestions([]);
    setIsEditorOpen(true);
  }

  function openEditorForCampaign(campaignId) {
    setSelectedCampaignId(campaignId);
    setStatusError("");
    setStatusSuccess("");
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setStatusError("");
  }

  function handleDraftValue(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleQuestionChange(index, key, value) {
    setDraft((current) => ({
      ...current,
      questions: current.questions.map((question, questionIndex) => {
        if (questionIndex !== index) return question;

        if (key === "options") {
          return {
            ...question,
            options: String(value)
              .split(/[\n,]/)
              .map((entry) => entry.trim())
              .filter(Boolean),
          };
        }

        if (key === "required" || key === "isVisible") {
          return {
            ...question,
            [key]: Boolean(value),
          };
        }

        return {
          ...question,
          [key]: value,
        };
      }),
    }));
  }

  function addQuestion() {
    setDraft((current) => ({
      ...current,
      questions: [...current.questions, createEmptyQuestion(current.questions.length)],
    }));
  }

  function removeQuestion(index) {
    setDraft((current) => {
      if (current.questions.length === 1) {
        return current;
      }

      const nextQuestions = current.questions
        .filter((_, questionIndex) => questionIndex !== index)
        .map((question, nextIndex) => ({ ...question, order: nextIndex }));

      return {
        ...current,
        questions: nextQuestions,
      };
    });
  }

  function moveQuestion(index, direction) {
    setDraft((current) => {
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      return {
        ...current,
        questions: reorderByIndex(current.questions, index, nextIndex),
      };
    });
  }

  async function handleImageUpload(file) {
    if (!(file instanceof File)) return;

    setStatusError("");
    setStatusSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Image upload failed.");
      }

      setDraft((current) => ({
        ...current,
        imageUrl: payload.url || "",
      }));
      setStatusSuccess("Campaign image uploaded.");
    } catch (error) {
      setStatusError(error.message || "Image upload failed.");
    }
  }

  async function saveCampaign(event) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setStatusError("");
    setStatusSuccess("");

    try {
      const isEditing = Boolean(selectedCampaignId);
      const endpoint = isEditing ? `/api/admin/campaigns/${selectedCampaignId}` : "/api/admin/campaigns";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...draft,
          slug: draft.slug || slugify(draft.title),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save campaign.");
      }

      setStatusSuccess(isEditing ? "Campaign updated successfully." : "Campaign created successfully.");
      const nextCampaignId = payload.campaign?.id || selectedCampaignId || null;
      await loadCampaigns(nextCampaignId);
      setIsEditorOpen(true);
    } catch (error) {
      setStatusError(error.message || "Unable to save campaign.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCampaign() {
    if (!selectedCampaignId || deleting) return;

    const confirmed = window.confirm("Delete this campaign and all its responses?");
    if (!confirmed) return;

    setDeleting(true);
    setStatusError("");
    setStatusSuccess("");

    try {
      const response = await fetch(`/api/admin/campaigns/${selectedCampaignId}`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete campaign.");
      }

      setStatusSuccess("Campaign deleted.");
      await loadCampaigns();
      setIsEditorOpen(false);
    } catch (error) {
      setStatusError(error.message || "Unable to delete campaign.");
    } finally {
      setDeleting(false);
    }
  }

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
            <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Total campaigns</p>
              <p className="mt-2 text-2xl font-semibold text-slate-100">{campaignStats.total}</p>
            </div>
            <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Published</p>
              <p className="mt-2 text-2xl font-semibold text-emerald-300">{campaignStats.published}</p>
            </div>
            <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Drafts</p>
              <p className="mt-2 text-2xl font-semibold text-amber-300">{campaignStats.drafts}</p>
            </div>
            <div className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Total responses</p>
              <p className="mt-2 text-2xl font-semibold text-blue-300">{formatCount(campaignStats.responsesCount)}</p>
            </div>
          </div>

          {statusError ? <p className="text-sm text-red-300">{statusError}</p> : null}
          {statusSuccess ? <p className="text-sm text-emerald-300">{statusSuccess}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">Campaign Library</CardTitle>
              <CardDescription>Browse, edit, and publish outreach campaigns from one table.</CardDescription>
            </div>
            <Button size="sm" onClick={startCreatingCampaign}>
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
          {loadingCampaigns ? <p className="text-sm text-slate-300">Loading campaigns...</p> : null}

          {!loadingCampaigns && !campaigns.length ? (
            <div className="rounded-lg border border-dashed border-slate-700/80 bg-slate-900/50 p-8 text-center">
              <p className="text-sm text-slate-200">No campaigns yet.</p>
              <p className="mt-1 text-sm text-slate-400">Create your first campaign to start collecting responses.</p>
            </div>
          ) : null}

          {!loadingCampaigns && campaigns.length ? (
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
                    className={`cursor-pointer ${selectedCampaignId === campaign.id ? "bg-blue-500/10 hover:bg-blue-500/15" : ""}`}
                    onClick={() => setSelectedCampaignId(campaign.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-semibold text-slate-100">{campaign.title}</p>
                        <p className="text-xs text-slate-400">/{campaign.slug}</p>
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
                            openEditorForCampaign(campaign.id);
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
          ) : null}

          {!loadingCampaigns && campaigns.length && !filteredCampaigns.length ? (
            <p className="mt-3 text-sm text-slate-300">No campaigns matched that search.</p>
          ) : null}
        </CardContent>
      </Card>

      {isEditorOpen ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{selectedCampaignId ? "Edit Campaign" : "Create Campaign"}</CardTitle>
              <CardDescription>Configure campaign details and its response form.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedCampaign ? (
                <Button asChild variant="outline" size="sm">
                  <a href={`/campaigns/${selectedCampaign.slug}`} target="_blank" rel="noreferrer">
                    Open Public Page
                  </a>
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="sm" onClick={closeEditor}>
                Close
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={saveCampaign}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="campaign-title">Title</Label>
                  <Input
                    id="campaign-title"
                    value={draft.title}
                    onChange={(event) => {
                      const nextTitle = event.target.value;
                      setDraft((current) => ({
                        ...current,
                        title: nextTitle,
                        slug: current.slug ? current.slug : slugify(nextTitle),
                      }));
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign-slug">Slug</Label>
                  <Input
                    id="campaign-slug"
                    value={draft.slug}
                    onChange={(event) => handleDraftValue("slug", slugify(event.target.value))}
                    placeholder="campaign-slug"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign-description">Description</Label>
                <Textarea
                  id="campaign-description"
                  value={draft.description}
                  onChange={(event) => handleDraftValue("description", event.target.value)}
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="campaign-image-url">Campaign Image URL</Label>
                  <Input
                    id="campaign-image-url"
                    value={draft.imageUrl}
                    onChange={(event) => handleDraftValue("imageUrl", event.target.value)}
                    placeholder="/uploads/campaign-image.webp"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign-image-upload">Upload Campaign Image</Label>
                  <Input
                    id="campaign-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleImageUpload(event.target.files?.[0])}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="campaign-order">Display Order</Label>
                  <Input
                    id="campaign-order"
                    type="number"
                    min={0}
                    value={draft.order}
                    onChange={(event) => handleDraftValue("order", Number.parseInt(event.target.value || "0", 10))}
                  />
                </div>

                <div className="flex items-end gap-2 rounded-md border border-slate-700 p-3">
                  <Checkbox
                    id="campaign-published"
                    checked={draft.isPublished}
                    onCheckedChange={(checked) => handleDraftValue("isPublished", Boolean(checked))}
                  />
                  <Label htmlFor="campaign-published">Published</Label>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Form Questions</h3>
                  <p className="text-xs text-slate-300">Build your campaign intake form.</p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={addQuestion}>
                  Add Question
                </Button>
              </div>

              <div className="space-y-3">
                {draft.questions.map((question, index) => (
                  <div key={question.id || `${question.key}_${index}`} className="space-y-3 rounded-md border border-slate-700 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-100">Question {index + 1}</p>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => moveQuestion(index, "up")} disabled={index === 0}>
                          Move Up
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => moveQuestion(index, "down")}
                          disabled={index === draft.questions.length - 1}
                        >
                          Move Down
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => removeQuestion(index)}
                          disabled={draft.questions.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Label</Label>
                        <Input
                          value={question.label}
                          onChange={(event) => handleQuestionChange(index, "label", event.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Key</Label>
                        <Input
                          value={question.key}
                          onChange={(event) => handleQuestionChange(index, "key", event.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={question.type} onValueChange={(value) => handleQuestionChange(index, "type", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="tel">Phone</SelectItem>
                            <SelectItem value="textarea">Textarea</SelectItem>
                            <SelectItem value="select">Select</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Placeholder</Label>
                        <Input
                          value={question.placeholder || ""}
                          onChange={(event) => handleQuestionChange(index, "placeholder", event.target.value)}
                        />
                      </div>
                    </div>

                    {question.type === "select" ? (
                      <div className="space-y-2">
                        <Label>Select Options (comma or new line separated)</Label>
                        <Textarea
                          value={(question.options || []).join("\n")}
                          onChange={(event) => handleQuestionChange(index, "options", event.target.value)}
                        />
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-4 rounded-md border border-slate-700 p-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`required-${index}`}
                          checked={Boolean(question.required)}
                          onCheckedChange={(checked) => handleQuestionChange(index, "required", Boolean(checked))}
                        />
                        <Label htmlFor={`required-${index}`}>Required</Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`visible-${index}`}
                          checked={question.isVisible !== false}
                          onCheckedChange={(checked) => handleQuestionChange(index, "isVisible", Boolean(checked))}
                        />
                        <Label htmlFor={`visible-${index}`}>Visible</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : selectedCampaignId ? "Update Campaign" : "Create Campaign"}
                </Button>

                {selectedCampaignId ? (
                  <Button type="button" variant="destructive" onClick={handleDeleteCampaign} disabled={deleting}>
                    {deleting ? "Deleting..." : "Delete Campaign"}
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

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
          {responsesLoading ? <p className="text-sm text-slate-300">Loading responses...</p> : null}
          {!responsesLoading && !selectedCampaignId ? <p className="text-sm text-slate-300">Select a campaign to view responses.</p> : null}
          {!responsesLoading && selectedCampaignId && !responses.length ? <p className="text-sm text-slate-300">No responses yet for this campaign.</p> : null}

          {!responsesLoading && responses.length ? (
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
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
