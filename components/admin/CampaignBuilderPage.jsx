"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageState from "../shared/PageState";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { createCsrfHeaders } from "../../lib/csrf-client";

const LIGHT_INPUT_CLASS =
  "border-[color:var(--ui-border)] bg-[color:var(--ui-input)] text-[color:var(--ui-foreground)] placeholder:text-[color:var(--ui-muted-foreground)] focus-visible:ring-[color:var(--ui-ring)] focus-visible:ring-offset-[color:var(--ui-background)]";
const LIGHT_TEXTAREA_CLASS =
  "border-[color:var(--ui-border)] bg-[color:var(--ui-input)] text-[color:var(--ui-foreground)] placeholder:text-[color:var(--ui-muted-foreground)] focus-visible:ring-[color:var(--ui-ring)] focus-visible:ring-offset-[color:var(--ui-background)]";
const LIGHT_SELECT_TRIGGER_CLASS =
  "border-[color:var(--ui-border)] bg-[color:var(--ui-input)] text-[color:var(--ui-foreground)] focus:ring-[color:var(--ui-ring)] focus:ring-offset-[color:var(--ui-background)] ring-offset-[color:var(--ui-background)]";

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

function getQuestionTypeLabel(type) {
  switch (type) {
    case "email":
      return "Email";
    case "tel":
      return "Phone Number";
    case "textarea":
      return "Paragraph";
    case "select":
      return "Multiple Choice";
    case "text":
    default:
      return "Short Answer";
  }
}

function getImageName(imageUrl) {
  if (!imageUrl) return "";

  try {
    const normalized = imageUrl.split("?")[0];
    const parts = normalized.split("/");
    return parts[parts.length - 1] || "campaign-image";
  } catch {
    return "campaign-image";
  }
}

function renderQuestionPreview(question) {
  const placeholder = question?.placeholder || (question?.type === "textarea" ? "Long answer text" : "Short answer text");

  if (question?.type === "textarea") {
    return <Textarea readOnly value="" placeholder={placeholder} className={`${LIGHT_TEXTAREA_CLASS} pointer-events-none min-h-[96px]`} />;
  }

  if (question?.type === "select") {
    const options = Array.isArray(question?.options) && question.options.length ? question.options : ["Option 1"];
    return (
      <div className="space-y-2">
        {options.map((option, optionIndex) => (
          <div key={`${option}_${optionIndex}`} className="flex items-center gap-2 text-sm text-[color:var(--ui-foreground)]">
            <span className="h-4 w-4 rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]" />
            <span>{option}</span>
          </div>
        ))}
      </div>
    );
  }

  return <Input readOnly value="" placeholder={placeholder} className={`${LIGHT_INPUT_CLASS} pointer-events-none`} />;
}

export default function CampaignBuilderPage({ campaignId = null }) {
  const router = useRouter();
  const isEditing = Boolean(campaignId);
  const imageInputRef = useRef(null);

  const [draft, setDraft] = useState(createEmptyCampaignDraft());
  const [editorStep, setEditorStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [loadingCampaign, setLoadingCampaign] = useState(isEditing);
  const [notFound, setNotFound] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");

  useEffect(() => {
    if (!isEditing) return;

    let isCancelled = false;

    async function loadCampaign() {
      setLoadingCampaign(true);
      setStatusError("");

      try {
        const response = await fetch(`/api/admin/campaigns/${campaignId}`, { cache: "no-store" });
        const payload = await response.json();

        if (response.status === 404) {
          if (!isCancelled) {
            setNotFound(true);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load campaign.");
        }

        if (!isCancelled) {
          setDraft(campaignToDraft(payload.campaign));
          setNotFound(false);
        }
      } catch (error) {
        if (!isCancelled) {
          setStatusError(error.message || "Unable to load campaign.");
        }
      } finally {
        if (!isCancelled) {
          setLoadingCampaign(false);
        }
      }
    }

    loadCampaign();

    return () => {
      isCancelled = true;
    };
  }, [campaignId, isEditing]);

  function goToQuestionsStep() {
    const nextSlug = draft.slug || slugify(draft.title);

    if (!draft.title.trim()) {
      setStatusError("Campaign title is required before adding questions.");
      return;
    }

    if (!draft.description.trim()) {
      setStatusError("Campaign description is required before adding questions.");
      return;
    }

    if (!nextSlug) {
      setStatusError("Campaign slug could not be generated. Please set a title or slug.");
      return;
    }

    if (!draft.slug) {
      setDraft((current) => ({ ...current, slug: nextSlug }));
    }

    setStatusError("");
    setEditorStep(2);
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

  function addQuestion(type = "text") {
    setDraft((current) => {
      const nextQuestion = createEmptyQuestion(current.questions.length);
      const defaults = {
        text: { label: "Short answer question", placeholder: "Short answer text" },
        email: { label: "Email question", placeholder: "name@example.com" },
        tel: { label: "Phone question", placeholder: "+255 700 000 000" },
        textarea: { label: "Paragraph question", placeholder: "Long answer text" },
        select: { label: "Multiple choice question", placeholder: "", options: ["Option 1"] },
      };
      const selectedDefaults = defaults[type] || defaults.text;

      return {
        ...current,
        questions: [
          ...current.questions,
          {
            ...nextQuestion,
            type,
            label: selectedDefaults.label,
            placeholder: selectedDefaults.placeholder,
            options: selectedDefaults.options || [],
          },
        ],
      };
    });
  }

  function duplicateQuestion(index) {
    setDraft((current) => {
      const source = current.questions[index];
      if (!source) return current;

      const baseKey = source.key || `field_${index + 1}`;
      const clone = {
        ...source,
        id: `temp_q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        key: `${baseKey}_copy_${current.questions.length + 1}`,
        options: Array.isArray(source.options) ? [...source.options] : [],
        order: index + 1,
      };

      const nextQuestions = [...current.questions];
      nextQuestions.splice(index + 1, 0, clone);

      return {
        ...current,
        questions: nextQuestions.map((question, questionIndex) => ({
          ...question,
          order: questionIndex,
        })),
      };
    });
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
    if (!file.type?.startsWith("image/")) {
      setStatusError("Only image files can be uploaded.");
      return;
    }

    setStatusError("");
    setStatusSuccess("");
    setIsUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: createCsrfHeaders(),
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
    } finally {
      setIsUploadingImage(false);
    }
  }

  function handleImageDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingImage(false);
    handleImageUpload(event.dataTransfer?.files?.[0]);
  }

  function handleImageInputChange(event) {
    const file = event.target.files?.[0];
    handleImageUpload(file);
    event.target.value = "";
  }

  function clearImage() {
    setDraft((current) => ({
      ...current,
      imageUrl: "",
    }));
    setStatusSuccess("Campaign image removed.");
    setStatusError("");
  }

  async function saveCampaign(event) {
    event.preventDefault();

    if (editorStep === 1) {
      goToQuestionsStep();
      return;
    }

    if (saving) return;

    setSaving(true);
    setStatusError("");
    setStatusSuccess("");

    try {
      const endpoint = isEditing ? `/api/admin/campaigns/${campaignId}` : "/api/admin/campaigns";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: createCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          ...draft,
          slug: draft.slug || slugify(draft.title),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save campaign.");
      }

      if (isEditing) {
        setStatusSuccess("Campaign updated successfully.");
      } else {
        setStatusSuccess("Campaign created successfully.");
        router.replace(`/admin/campaigns/${payload.campaign.id}`);
        router.refresh();
      }
    } catch (error) {
      setStatusError(error.message || "Unable to save campaign.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCampaign() {
    if (!isEditing || deleting) return;

    const confirmed = window.confirm("Delete this campaign and all its responses?");
    if (!confirmed) return;

    setDeleting(true);
    setStatusError("");
    setStatusSuccess("");

    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: "DELETE",
        headers: createCsrfHeaders(),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to delete campaign.");
      }

      router.push("/admin/campaigns");
      router.refresh();
    } catch (error) {
      setStatusError(error.message || "Unable to delete campaign.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{isEditing ? "Edit Campaign Builder" : "Create Campaign Builder"}</CardTitle>
              <CardDescription>Two-step campaign setup with Google Forms-style questions.</CardDescription>
            </div>
            <Button type="button" variant="outline" onClick={() => router.push("/admin/campaigns")}>
              Back to Campaigns
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                editorStep === 1
                  ? "border-[color:var(--ui-primary)] bg-[color:var(--ui-primary-soft)] text-[color:var(--ui-primary)]"
                  : "border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] text-[color:var(--ui-muted-foreground)] hover:bg-[color:var(--ui-accent)]"
              }`}
              onClick={() => setEditorStep(1)}
            >
              <p className="font-semibold">1. Campaign Information</p>
              <p className="mt-1 text-xs opacity-80">Title, slug, image, and publish settings</p>
            </Button>
            <Button
              type="button"
              variant="outline"
              className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                editorStep === 2
                  ? "border-[color:var(--ui-primary)] bg-[color:var(--ui-primary-soft)] text-[color:var(--ui-primary)]"
                  : "border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] text-[color:var(--ui-muted-foreground)] hover:bg-[color:var(--ui-accent)]"
              }`}
              onClick={() => {
                if (editorStep === 1) {
                  goToQuestionsStep();
                  return;
                }
                setEditorStep(2);
              }}
            >
              <p className="font-semibold">2. Questions</p>
              <p className="mt-1 text-xs opacity-80">Google Forms-style question builder</p>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {loadingCampaign ? <PageState status="loading" resourceLabel="campaign" /> : null}

      {!loadingCampaign && notFound ? (
        <PageState
          status="empty"
          resourceLabel="campaign"
          createAction={
            <Button type="button" onClick={() => router.push("/admin/campaigns")}>
              Return to Campaigns
            </Button>
          }
        />
      ) : null}

      {!loadingCampaign && !notFound ? (
        <form className="space-y-4" onSubmit={saveCampaign}>
          <div className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-4 md:p-6">
            {editorStep === 1 ? (
              <div className="mx-auto w-full max-w-3xl space-y-4">
                <div className="rounded-2xl border border-[color:var(--ui-primary)] bg-[color:var(--ui-card)] p-6 shadow-sm">
                  <div className="border-l-4 border-[color:var(--ui-primary)] pl-4">
                    <h4 className="text-xl font-semibold text-[color:var(--ui-foreground)]">Campaign Information</h4>
                    <p className="mt-1 text-sm text-[color:var(--ui-muted-foreground)]">Start with the essentials, then move to question design.</p>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[color:var(--ui-foreground)]" htmlFor="campaign-title">
                        Campaign Title
                      </Label>
                      <Input
                        id="campaign-title"
                        value={draft.title}
                        className={LIGHT_INPUT_CLASS}
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
                      <Label className="text-[color:var(--ui-foreground)]" htmlFor="campaign-slug">
                        Campaign Slug
                      </Label>
                      <Input
                        id="campaign-slug"
                        value={draft.slug}
                        className={LIGHT_INPUT_CLASS}
                        onChange={(event) => handleDraftValue("slug", slugify(event.target.value))}
                        placeholder="campaign-slug"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[color:var(--ui-foreground)]" htmlFor="campaign-description">
                        Description
                      </Label>
                      <Textarea
                        id="campaign-description"
                        className={LIGHT_TEXTAREA_CLASS}
                        value={draft.description}
                        onChange={(event) => handleDraftValue("description", event.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[color:var(--ui-foreground)]">Campaign Image</Label>
                      <Input
                        ref={imageInputRef}
                        className="hidden"
                        type="file"
                        accept="image/*"
                        onChange={handleImageInputChange}
                      />
                      <div
                        role="button"
                        tabIndex={0}
                        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${
                          isDraggingImage
                            ? "border-[color:var(--ui-primary)] bg-[color:var(--ui-primary-soft)]"
                            : "border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] hover:border-[color:var(--ui-primary)] hover:bg-[color:var(--ui-primary-soft)]"
                        }`}
                        onClick={() => imageInputRef.current?.click()}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            imageInputRef.current?.click();
                          }
                        }}
                        onDragEnter={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsDraggingImage(true);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsDraggingImage(true);
                        }}
                        onDragLeave={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsDraggingImage(false);
                        }}
                        onDrop={handleImageDrop}
                      >
                        <p className="text-sm font-semibold text-[color:var(--ui-foreground)]">
                          {isUploadingImage ? "Uploading image..." : "Drag and drop image here"}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">or click to browse files</p>
                        <p className="mt-2 text-xs text-[color:var(--ui-muted-foreground)]">PNG, JPG, WEBP supported</p>
                      </div>

                      {draft.imageUrl ? (
                        <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-3">
                          <p className="text-xs text-[color:var(--ui-muted-foreground)]">Uploaded image</p>
                          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[color:var(--ui-foreground)]">{getImageName(draft.imageUrl)}</p>
                              <p className="truncate text-xs text-[color:var(--ui-muted-foreground)]">{draft.imageUrl}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" size="sm" variant="outline" onClick={() => imageInputRef.current?.click()}>
                                Replace
                              </Button>
                              <Button type="button" size="sm" variant="outline" className="border-[color:var(--ui-destructive)] text-[color:var(--ui-destructive)] hover:bg-[color:var(--ui-destructive-soft)]" onClick={clearImage}>
                                Remove
                              </Button>
                            </div>
                          </div>
                          <img src={draft.imageUrl} alt="Campaign" className="mt-3 h-32 w-full rounded-md border border-[color:var(--ui-border)] object-cover" />
                        </div>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-[color:var(--ui-foreground)]" htmlFor="campaign-order">
                          Display Order
                        </Label>
                        <Input
                          id="campaign-order"
                          className={LIGHT_INPUT_CLASS}
                          type="number"
                          min={0}
                          value={draft.order}
                          onChange={(event) => handleDraftValue("order", Number.parseInt(event.target.value || "0", 10))}
                        />
                      </div>

                      <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4">
                        <Label className="text-[color:var(--ui-foreground)]" htmlFor="campaign-published">
                          Publish Status
                        </Label>
                        <div className="mt-3 flex items-center gap-3">
                          <Checkbox
                            id="campaign-published"
                            className="border-[color:var(--ui-border)] data-[state=checked]:border-[color:var(--ui-primary)] data-[state=checked]:bg-[color:var(--ui-primary)]"
                            checked={draft.isPublished}
                            onCheckedChange={(checked) => handleDraftValue("isPublished", Boolean(checked))}
                          />
                          <Label className="text-[color:var(--ui-foreground)]" htmlFor="campaign-published">
                            Published (visible on public pages)
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-4xl space-y-4">
                <div className="rounded-2xl border border-[color:var(--ui-primary)] bg-[color:var(--ui-card)] p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-semibold text-[color:var(--ui-foreground)]">Questions</h4>
                      <p className="mt-1 text-sm text-[color:var(--ui-muted-foreground)]">Build your form exactly how users will answer it.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-[color:var(--ui-border)] bg-[color:var(--ui-card)] text-[color:var(--ui-foreground)] hover:bg-[color:var(--ui-muted)]"
                        onClick={() => addQuestion("text")}
                      >
                        + Short answer
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-[color:var(--ui-border)] bg-[color:var(--ui-card)] text-[color:var(--ui-foreground)] hover:bg-[color:var(--ui-muted)]"
                        onClick={() => addQuestion("textarea")}
                      >
                        + Paragraph
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-[color:var(--ui-border)] bg-[color:var(--ui-card)] text-[color:var(--ui-foreground)] hover:bg-[color:var(--ui-muted)]"
                        onClick={() => addQuestion("select")}
                      >
                        + Multiple choice
                      </Button>
                    </div>
                  </div>
                </div>

                {draft.questions.map((question, index) => (
                  <div key={question.id || `${question.key}_${index}`} className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-primary)]">Question {index + 1}</p>
                        <Input
                          value={question.label}
                          className={LIGHT_INPUT_CLASS}
                          onChange={(event) => handleQuestionChange(index, "label", event.target.value)}
                          placeholder="Untitled Question"
                          required
                        />
                      </div>

                      <div className="w-full space-y-2 sm:w-56">
                        <Label className="text-[color:var(--ui-foreground)]">Response Type</Label>
                        <Select value={question.type} onValueChange={(value) => handleQuestionChange(index, "type", value)}>
                          <SelectTrigger className={LIGHT_SELECT_TRIGGER_CLASS}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Short answer</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="tel">Phone</SelectItem>
                            <SelectItem value="textarea">Paragraph</SelectItem>
                            <SelectItem value="select">Multiple choice</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-[color:var(--ui-foreground)]">Answer Key</Label>
                        <Input
                          value={question.key}
                          className={LIGHT_INPUT_CLASS}
                          onChange={(event) => handleQuestionChange(index, "key", event.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[color:var(--ui-foreground)]">Placeholder Text</Label>
                        <Input
                          value={question.placeholder || ""}
                          className={LIGHT_INPUT_CLASS}
                          onChange={(event) => handleQuestionChange(index, "placeholder", event.target.value)}
                        />
                      </div>
                    </div>

                    {question.type === "select" ? (
                      <div className="mt-4 space-y-2">
                        <Label className="text-[color:var(--ui-foreground)]">Multiple Choice Options (comma or new line separated)</Label>
                        <Textarea
                          value={(question.options || []).join("\n")}
                          className={LIGHT_TEXTAREA_CLASS}
                          onChange={(event) => handleQuestionChange(index, "options", event.target.value)}
                        />
                      </div>
                    ) : null}

                    <div className="mt-4 rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Preview</p>
                      <p className="mt-2 text-sm font-medium text-[color:var(--ui-foreground)]">{question.label || "Untitled Question"}</p>
                      <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">{getQuestionTypeLabel(question.type)}</p>
                      <div className="mt-3">{renderQuestionPreview(question)}</div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--ui-border)] pt-3">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`required-${index}`}
                            className="border-[color:var(--ui-border)] data-[state=checked]:border-[color:var(--ui-primary)] data-[state=checked]:bg-[color:var(--ui-primary)]"
                            checked={Boolean(question.required)}
                            onCheckedChange={(checked) => handleQuestionChange(index, "required", Boolean(checked))}
                          />
                          <Label className="text-[color:var(--ui-foreground)]" htmlFor={`required-${index}`}>
                            Required
                          </Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`visible-${index}`}
                            className="border-[color:var(--ui-border)] data-[state=checked]:border-[color:var(--ui-primary)] data-[state=checked]:bg-[color:var(--ui-primary)]"
                            checked={question.isVisible !== false}
                            onCheckedChange={(checked) => handleQuestionChange(index, "isVisible", Boolean(checked))}
                          />
                          <Label className="text-[color:var(--ui-foreground)]" htmlFor={`visible-${index}`}>
                            Visible
                          </Label>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-[color:var(--ui-border)] bg-[color:var(--ui-card)] text-[color:var(--ui-foreground)] hover:bg-[color:var(--ui-muted)]"
                          onClick={() => moveQuestion(index, "up")}
                          disabled={index === 0}
                        >
                          Move Up
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-[color:var(--ui-border)] bg-[color:var(--ui-card)] text-[color:var(--ui-foreground)] hover:bg-[color:var(--ui-muted)]"
                          onClick={() => moveQuestion(index, "down")}
                          disabled={index === draft.questions.length - 1}
                        >
                          Move Down
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-[color:var(--ui-border)] bg-[color:var(--ui-card)] text-[color:var(--ui-foreground)] hover:bg-[color:var(--ui-muted)]"
                          onClick={() => duplicateQuestion(index)}
                        >
                          Duplicate
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-[color:var(--ui-destructive)] bg-[color:var(--ui-destructive-soft)] text-[color:var(--ui-destructive)] hover:bg-[color:var(--ui-destructive-soft)]"
                          onClick={() => removeQuestion(index)}
                          disabled={draft.questions.length === 1}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <Button type="button" variant="destructive" onClick={handleDeleteCampaign} disabled={deleting}>
                      {deleting ? "Deleting..." : "Delete Campaign"}
                    </Button>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="ghost" onClick={() => router.push("/admin/campaigns")}>
                    Cancel
                  </Button>
                  {editorStep === 2 ? (
                    <Button type="button" variant="outline" onClick={() => setEditorStep(1)}>
                      Back
                    </Button>
                  ) : null}
                  {editorStep === 1 ? (
                    <Button type="button" onClick={goToQuestionsStep}>
                      Continue to Questions
                    </Button>
                  ) : (
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : isEditing ? "Update Campaign" : "Create Campaign"}
                    </Button>
                  )}
                </div>
              </div>

              {statusError ? <p className="mt-3 text-sm text-[color:var(--ui-destructive)]">{statusError}</p> : null}
              {statusSuccess ? <p className="mt-3 text-sm text-[color:var(--ui-success)]">{statusSuccess}</p> : null}
            </CardContent>
          </Card>
        </form>
      ) : null}
    </div>
  );
}
