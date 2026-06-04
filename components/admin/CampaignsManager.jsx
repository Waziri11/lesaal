"use client";

import { useEffect, useMemo, useState } from "react";

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
    questions: Array.isArray(campaign?.questions) && campaign.questions.length
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

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) || null,
    [campaigns, selectedCampaignId]
  );

  async function loadCampaigns(preferredCampaignId = null) {
    setLoadingCampaigns(true);
    setStatusError("");

    try {
      const response = await fetch("/api/admin/campaigns", {
        cache: "no-store",
      });
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
      const response = await fetch(`/api/admin/campaigns/${campaignId}/responses`, {
        cache: "no-store",
      });
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
    if (!selectedCampaign) {
      return;
    }

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
  }

  function handleDraftValue(key, value) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
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
    if (!(file instanceof File)) {
      return;
    }

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
      await loadCampaigns(payload.campaign?.id || selectedCampaignId);
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
    <section className="campaign-admin-shell">
      <article className="admin-page-card">
        <h1>Campaigns</h1>
        <p>Create outreach campaigns, publish forms, and manage incoming responses from one place.</p>

        {statusError ? <p className="form-error">{statusError}</p> : null}
        {statusSuccess ? <p className="form-success">{statusSuccess}</p> : null}
      </article>

      <div className="campaign-admin-layout">
        <aside className="admin-page-card campaign-admin-sidebar">
          <div className="campaign-admin-sidebar-head">
            <h2>All Campaigns</h2>
            <button type="button" onClick={startCreatingCampaign}>
              New Campaign
            </button>
          </div>

          {loadingCampaigns ? <p>Loading campaigns...</p> : null}

          <div className="campaign-admin-list">
            {campaigns.map((campaign) => (
              <button
                key={campaign.id}
                type="button"
                className={`campaign-admin-item${selectedCampaignId === campaign.id ? " is-active" : ""}`}
                onClick={() => setSelectedCampaignId(campaign.id)}
              >
                <strong>{campaign.title}</strong>
                <span>{campaign.isPublished ? "Published" : "Draft"}</span>
                <small>{campaign.responseCount || 0} responses</small>
              </button>
            ))}

            {!loadingCampaigns && !campaigns.length ? <p>No campaigns yet. Create your first one.</p> : null}
          </div>
        </aside>

        <article className="admin-page-card campaign-admin-editor">
          <div className="campaign-admin-editor-head">
            <h2>{selectedCampaignId ? "Edit Campaign" : "Create Campaign"}</h2>
            {selectedCampaign ? (
              <a href={`/campaigns/${selectedCampaign.slug}`} target="_blank" rel="noreferrer">
                Open Public Page
              </a>
            ) : null}
          </div>

          <form className="campaign-admin-form" onSubmit={saveCampaign}>
            <label>
              Title
              <input
                type="text"
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
            </label>

            <label>
              Slug
              <input
                type="text"
                value={draft.slug}
                onChange={(event) => handleDraftValue("slug", slugify(event.target.value))}
                placeholder="campaign-slug"
                required
              />
            </label>

            <label>
              Description
              <textarea
                value={draft.description}
                onChange={(event) => handleDraftValue("description", event.target.value)}
                rows={4}
                required
              />
            </label>

            <label>
              Campaign Image URL
              <input
                type="text"
                value={draft.imageUrl}
                onChange={(event) => handleDraftValue("imageUrl", event.target.value)}
                placeholder="/uploads/campaign-image.webp"
              />
            </label>

            <label>
              Upload Campaign Image
              <input
                type="file"
                accept="image/*"
                onChange={(event) => handleImageUpload(event.target.files?.[0])}
              />
            </label>

            <label>
              Display Order
              <input
                type="number"
                min={0}
                value={draft.order}
                onChange={(event) => handleDraftValue("order", Number.parseInt(event.target.value || "0", 10))}
              />
            </label>

            <label className="campaign-admin-toggle">
              <input
                type="checkbox"
                checked={draft.isPublished}
                onChange={(event) => handleDraftValue("isPublished", event.target.checked)}
              />
              Published
            </label>

            <div className="campaign-admin-questions-head">
              <h3>Form Questions</h3>
              <button type="button" onClick={addQuestion}>
                Add Question
              </button>
            </div>

            <div className="campaign-admin-question-list">
              {draft.questions.map((question, index) => (
                <div key={question.id || `${question.key}_${index}`} className="campaign-admin-question-item">
                  <div className="campaign-admin-question-top">
                    <strong>Question {index + 1}</strong>
                    <div className="campaign-admin-question-actions">
                      <button type="button" onClick={() => moveQuestion(index, "up")} disabled={index === 0}>
                        Move Up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveQuestion(index, "down")}
                        disabled={index === draft.questions.length - 1}
                      >
                        Move Down
                      </button>
                      <button type="button" onClick={() => removeQuestion(index)} disabled={draft.questions.length === 1}>
                        Remove
                      </button>
                    </div>
                  </div>

                  <label>
                    Label
                    <input
                      type="text"
                      value={question.label}
                      onChange={(event) => handleQuestionChange(index, "label", event.target.value)}
                      required
                    />
                  </label>

                  <label>
                    Key
                    <input
                      type="text"
                      value={question.key}
                      onChange={(event) => handleQuestionChange(index, "key", event.target.value)}
                      required
                    />
                  </label>

                  <label>
                    Type
                    <select
                      value={question.type}
                      onChange={(event) => handleQuestionChange(index, "type", event.target.value)}
                    >
                      <option value="text">Text</option>
                      <option value="email">Email</option>
                      <option value="tel">Phone</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Select</option>
                    </select>
                  </label>

                  <label>
                    Placeholder
                    <input
                      type="text"
                      value={question.placeholder || ""}
                      onChange={(event) => handleQuestionChange(index, "placeholder", event.target.value)}
                    />
                  </label>

                  {question.type === "select" ? (
                    <label>
                      Select Options (comma or new line separated)
                      <textarea
                        value={(question.options || []).join("\n")}
                        onChange={(event) => handleQuestionChange(index, "options", event.target.value)}
                        rows={3}
                      />
                    </label>
                  ) : null}

                  <div className="campaign-admin-question-flags">
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(question.required)}
                        onChange={(event) => handleQuestionChange(index, "required", event.target.checked)}
                      />
                      Required
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={question.isVisible !== false}
                        onChange={(event) => handleQuestionChange(index, "isVisible", event.target.checked)}
                      />
                      Visible
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="campaign-admin-form-actions">
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : selectedCampaignId ? "Update Campaign" : "Create Campaign"}
              </button>

              {selectedCampaignId ? (
                <button type="button" className="danger-btn" onClick={handleDeleteCampaign} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete Campaign"}
                </button>
              ) : null}
            </div>
          </form>
        </article>
      </div>

      <article className="admin-page-card campaign-admin-responses">
        <div className="campaign-admin-responses-head">
          <h2>Responses</h2>
          <div className="campaign-admin-responses-actions">
            <span>{responses.length} responses</span>
            <button type="button" onClick={openExport} disabled={!selectedCampaignId || !responses.length}>
              Export CSV
            </button>
          </div>
        </div>

        {responsesLoading ? <p>Loading responses...</p> : null}

        {!responsesLoading && !selectedCampaignId ? <p>Select a campaign to view responses.</p> : null}

        {!responsesLoading && selectedCampaignId && !responses.length ? (
          <p>No responses yet for this campaign.</p>
        ) : null}

        {!responsesLoading && responses.length ? (
          <div className="campaign-admin-table-wrap">
            <table className="dynamic-table">
              <thead>
                <tr>
                  <th>Submitted At</th>
                  {responseQuestions.map((question) => (
                    <th key={question.id || question.key}>{question.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {responses.map((response) => (
                  <tr key={response.id}>
                    <td>{formatDateTime(response.submittedAt)}</td>
                    {responseQuestions.map((question) => (
                      <td key={`${response.id}_${question.key}`}>{String(response.data?.[question.key] || "-")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </section>
  );
}
