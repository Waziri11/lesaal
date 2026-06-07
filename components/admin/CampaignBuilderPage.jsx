"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { DatePicker } from "../ui/date-picker";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Spinner } from "../ui/spinner";
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

function createEmptyQuestion(index = 0, type = "text") {
  const defaults = {
    text: { label: "Short answer question", placeholder: "Short answer text" },
    email: { label: "Email question", placeholder: "name@example.com" },
    tel: { label: "Phone question", placeholder: "+255 700 000 000" },
    textarea: { label: "Paragraph question", placeholder: "Long answer text" },
    select: { label: "Multiple choice question", placeholder: "", options: ["Option 1"] },
  };

  const selectedDefaults = defaults[type] || defaults.text;

  return {
    id: `temp_q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    key: `field_${index + 1}`,
    label: selectedDefaults.label,
    type,
    required: false,
    placeholder: selectedDefaults.placeholder,
    options: selectedDefaults.options || [],
    isVisible: true,
    order: index,
  };
}

function createEmptySection(index = 0) {
  return {
    id: `temp_section_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    key: `section_${index + 1}`,
    title: index === 0 ? "General Information" : `Section ${index + 1}`,
    description: "",
    order: index,
    questions: [createEmptyQuestion(0)],
  };
}

function createEmptyCampaignDraft(order = 0) {
  return {
    title: "",
    slug: "",
    targetMarket: "",
    deadline: "",
    description: "",
    imageUrl: "",
    isPublished: true,
    order,
    sections: [
      {
        ...createEmptySection(0),
        questions: [
          {
            ...createEmptyQuestion(0, "text"),
            key: "full_name",
            label: "Full Name",
            required: true,
            placeholder: "Jane Doe",
          },
          {
            ...createEmptyQuestion(1, "email"),
            key: "email",
            label: "Email",
            required: true,
            placeholder: "you@example.com",
          },
          {
            ...createEmptyQuestion(2, "textarea"),
            key: "message",
            label: "Tell us why you want to join this campaign.",
            required: true,
            placeholder: "Share your answer",
          },
        ],
      },
    ],
  };
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

function uploadImageFileWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload");

    const headers = createCsrfHeaders();
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const nextProgress = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
      onProgress(nextProgress);
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error while uploading image."));
    });

    xhr.addEventListener("load", () => {
      let payload = null;

      try {
        payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        payload = null;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload || {});
        return;
      }

      reject(new Error(payload?.error || "Image upload failed."));
    });

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
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

export default function CampaignBuilderPage() {
  const router = useRouter();
  const imageInputRef = useRef(null);

  const [draft, setDraft] = useState(createEmptyCampaignDraft());
  const [editorStep, setEditorStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");

  const flatQuestionCount = useMemo(
    () => draft.sections.reduce((total, section) => total + (Array.isArray(section.questions) ? section.questions.length : 0), 0),
    [draft.sections]
  );

  function goToQuestionsStep() {
    const nextSlug = draft.slug || slugify(draft.title);

    if (!draft.title.trim()) {
      setStatusError("Campaign name is required before building the form.");
      return;
    }

    if (!draft.deadline) {
      setStatusError("Campaign deadline is required before building the form.");
      return;
    }

    if (!draft.targetMarket.trim()) {
      setStatusError("Campaign target market is required before building the form.");
      return;
    }

    if (!draft.description.trim()) {
      setStatusError("Campaign description is required before building the form.");
      return;
    }

    if (!draft.imageUrl.trim()) {
      setStatusError("Campaign cover image is required before building the form.");
      return;
    }

    if (!nextSlug) {
      setStatusError("Campaign slug could not be generated. Please set a title.");
      return;
    }

    if (!draft.slug) {
      setDraft((current) => ({ ...current, slug: nextSlug }));
    }

    setStatusError("");
    setStatusSuccess("");
    setEditorStep(2);
  }

  function handleDraftValue(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSectionChange(sectionIndex, key, value) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          [key]: value,
        };
      }),
    }));
  }

  function handleQuestionChange(sectionIndex, questionIndex, key, value) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;

        return {
          ...section,
          questions: section.questions.map((question, currentQuestionIndex) => {
            if (currentQuestionIndex !== questionIndex) return question;

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
        };
      }),
    }));
  }

  function addSection() {
    setDraft((current) => {
      const nextSection = createEmptySection(current.sections.length);

      return {
        ...current,
        sections: [...current.sections, nextSection].map((section, index) => ({
          ...section,
          order: index,
        })),
      };
    });
  }

  function removeSection(sectionIndex) {
    setDraft((current) => {
      if (current.sections.length === 1) {
        return current;
      }

      const nextSections = current.sections
        .filter((_, index) => index !== sectionIndex)
        .map((section, index) => ({
          ...section,
          order: index,
        }));

      return {
        ...current,
        sections: nextSections,
      };
    });
  }

  function moveSection(sectionIndex, direction) {
    setDraft((current) => {
      const nextIndex = direction === "up" ? sectionIndex - 1 : sectionIndex + 1;

      if (nextIndex < 0 || nextIndex >= current.sections.length) {
        return current;
      }

      const nextSections = [...current.sections];
      const [moved] = nextSections.splice(sectionIndex, 1);
      nextSections.splice(nextIndex, 0, moved);

      return {
        ...current,
        sections: nextSections.map((section, index) => ({
          ...section,
          order: index,
        })),
      };
    });
  }

  function addQuestion(sectionIndex, type = "text") {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;

        const nextQuestion = createEmptyQuestion(section.questions.length, type);

        return {
          ...section,
          questions: [...section.questions, nextQuestion].map((question, index) => ({
            ...question,
            order: index,
          })),
        };
      }),
    }));
  }

  function removeQuestion(sectionIndex, questionIndex) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;

        if (section.questions.length === 1) {
          return section;
        }

        const nextQuestions = section.questions
          .filter((_, index) => index !== questionIndex)
          .map((question, index) => ({
            ...question,
            order: index,
          }));

        return {
          ...section,
          questions: nextQuestions,
        };
      }),
    }));
  }

  function moveQuestion(sectionIndex, questionIndex, direction) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;

        const nextIndex = direction === "up" ? questionIndex - 1 : questionIndex + 1;
        if (nextIndex < 0 || nextIndex >= section.questions.length) {
          return section;
        }

        const nextQuestions = [...section.questions];
        const [moved] = nextQuestions.splice(questionIndex, 1);
        nextQuestions.splice(nextIndex, 0, moved);

        return {
          ...section,
          questions: nextQuestions.map((question, index) => ({
            ...question,
            order: index,
          })),
        };
      }),
    }));
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
    setImageUploadProgress(0);

    try {
      const payload = await uploadImageFileWithProgress(file, setImageUploadProgress);

      setDraft((current) => ({
        ...current,
        imageUrl: payload.url || "",
      }));
      setStatusSuccess("Campaign cover image uploaded.");
    } catch (error) {
      setStatusError(error.message || "Image upload failed.");
    } finally {
      setIsUploadingImage(false);
      setImageUploadProgress(0);
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

  function validateBeforeSave() {
    if (!draft.sections.length) {
      return "Add at least one section.";
    }

    for (let sectionIndex = 0; sectionIndex < draft.sections.length; sectionIndex += 1) {
      const section = draft.sections[sectionIndex];

      if (!String(section.title || "").trim()) {
        return `Section ${sectionIndex + 1} title is required.`;
      }

      if (!Array.isArray(section.questions) || !section.questions.length) {
        return `Section ${sectionIndex + 1} must include at least one question.`;
      }

      for (let questionIndex = 0; questionIndex < section.questions.length; questionIndex += 1) {
        const question = section.questions[questionIndex];

        if (!String(question.label || "").trim()) {
          return `Question ${questionIndex + 1} in section ${sectionIndex + 1} needs a label.`;
        }

        if (!String(question.key || "").trim()) {
          return `Question ${questionIndex + 1} in section ${sectionIndex + 1} needs an answer key.`;
        }

        if (question.type === "select" && (!Array.isArray(question.options) || !question.options.length)) {
          return `Add at least one option for question ${questionIndex + 1} in section ${sectionIndex + 1}.`;
        }
      }
    }

    return "";
  }

  async function saveCampaign() {
    if (editorStep === 1) {
      goToQuestionsStep();
      return;
    }

    if (saving) return;

    const validationError = validateBeforeSave();
    if (validationError) {
      setStatusError(validationError);
      return;
    }

    setSaving(true);
    setStatusError("");
    setStatusSuccess("");

    try {
      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
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
        throw new Error(payload.error || "Unable to create campaign.");
      }

      router.push("/admin/campaigns");
      router.refresh();
    } catch (error) {
      setStatusError(error.message || "Unable to create campaign.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2 px-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-[color:var(--ui-foreground)]">Create Campaign</h2>
            <p className="text-sm text-[color:var(--ui-muted-foreground)]">
              A clean, create-only builder. Fill details, design the form, and publish.
            </p>
          </div>

          <Button type="button" variant="outline" onClick={() => router.push("/admin/campaigns")}>
            Back to Campaigns
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{draft.sections.length} sections</Badge>
          <Badge variant="outline">{flatQuestionCount} questions</Badge>
          {draft.deadline ? <Badge variant="outline">Deadline: {formatDate(draft.deadline)}</Badge> : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]">
        <div className="flex flex-wrap gap-3 border-b border-[color:var(--ui-border)] p-4">
          <Button
            type="button"
            variant="outline"
            className={
              editorStep === 1
                ? "border-[color:var(--ui-primary)] bg-[color:var(--ui-primary-soft)] text-[color:var(--ui-primary)]"
                : ""
            }
            onClick={() => setEditorStep(1)}
          >
            1. Campaign Information
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isUploadingImage}
            className={
              editorStep === 2
                ? "border-[color:var(--ui-primary)] bg-[color:var(--ui-primary-soft)] text-[color:var(--ui-primary)]"
                : ""
            }
            onClick={() => {
              if (editorStep === 1) {
                goToQuestionsStep();
                return;
              }
              setEditorStep(2);
            }}
          >
            2. Campaign Form Builder
          </Button>
        </div>

        <div className="p-5 md:p-6">
          {editorStep === 1 ? (
            <div className="mx-auto w-full max-w-4xl space-y-5">
              <div className="space-y-2">
                <Label className="text-[color:var(--ui-foreground)]" htmlFor="campaign-title">
                  Campaign Name
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-[color:var(--ui-foreground)]">Campaign Deadline</Label>
                  <DatePicker value={draft.deadline} onChange={(value) => handleDraftValue("deadline", value)} placeholder="Select campaign deadline" />
                  <p className="text-xs text-[color:var(--ui-muted-foreground)]">
                    This date determines how long the campaign stays active on the landing page.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[color:var(--ui-foreground)]" htmlFor="campaign-target-market">
                    Campaign Target Market
                  </Label>
                  <Input
                    id="campaign-target-market"
                    value={draft.targetMarket}
                    className={LIGHT_INPUT_CLASS}
                    onChange={(event) => handleDraftValue("targetMarket", event.target.value)}
                    placeholder="Example: Small business owners in Dar es Salaam"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[color:var(--ui-foreground)]" htmlFor="campaign-description">
                  Campaign Description
                </Label>
                <Textarea
                  id="campaign-description"
                  className={`${LIGHT_TEXTAREA_CLASS} min-h-[140px]`}
                  value={draft.description}
                  onChange={(event) => handleDraftValue("description", event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[color:var(--ui-foreground)]">Campaign Cover Image</Label>
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
                  aria-disabled={isUploadingImage}
                  className={`rounded-xl border-2 border-dashed p-10 text-center transition ${
                    isDraggingImage
                      ? "border-[color:var(--ui-primary)] bg-[color:var(--ui-primary-soft)]"
                      : "border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] hover:border-[color:var(--ui-primary)] hover:bg-[color:var(--ui-primary-soft)]"
                  }`}
                  onClick={() => {
                    if (isUploadingImage) return;
                    imageInputRef.current?.click();
                  }}
                  onKeyDown={(event) => {
                    if (isUploadingImage) return;
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
                    {isUploadingImage ? "Uploading cover image..." : "Drag and drop cover image here"}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">or click to browse files</p>
                  <p className="mt-2 text-xs text-[color:var(--ui-muted-foreground)]">PNG, JPG, WEBP supported</p>
                  {isUploadingImage ? (
                    <div className="mx-auto mt-4 w-full max-w-sm space-y-2">
                      <div className="flex items-center justify-between text-xs text-[color:var(--ui-muted-foreground)]">
                        <span>Upload progress</span>
                        <span>{imageUploadProgress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[color:var(--ui-border)]/60">
                        <div
                          className="h-full rounded-full bg-[color:var(--ui-primary)] transition-[width] duration-200"
                          style={{ width: `${imageUploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                {draft.imageUrl ? (
                  <div className="rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-3">
                    <p className="text-xs text-[color:var(--ui-muted-foreground)]">Uploaded cover</p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[color:var(--ui-foreground)]">{getImageName(draft.imageUrl)}</p>
                        <p className="truncate text-xs text-[color:var(--ui-muted-foreground)]">{draft.imageUrl}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isUploadingImage}
                          onClick={() => imageInputRef.current?.click()}
                        >
                          Replace
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-[color:var(--ui-destructive)] text-[color:var(--ui-destructive)] hover:bg-[color:var(--ui-destructive-soft)]"
                          onClick={clearImage}
                          disabled={isUploadingImage}
                        >
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
                  <Label className="text-[color:var(--ui-foreground)]" htmlFor="campaign-slug-preview">
                    Campaign Slug
                  </Label>
                  <Input
                    id="campaign-slug-preview"
                    value={draft.slug || slugify(draft.title)}
                    className={LIGHT_INPUT_CLASS}
                    onChange={(event) => handleDraftValue("slug", slugify(event.target.value))}
                    placeholder="campaign-slug"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[color:var(--ui-foreground)]" htmlFor="campaign-published">
                    Publish Status
                  </Label>
                  <div className="flex min-h-10 items-center gap-3 rounded-md border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] px-3">
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
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-[color:var(--ui-foreground)]">Campaign Form Builder</h3>
                  <p className="text-sm text-[color:var(--ui-muted-foreground)]">Add sections and questions in a clean form layout.</p>
                </div>
              </div>

              {draft.sections.map((section, sectionIndex) => (
                <div
                  key={section.id || `${section.key}_${sectionIndex}`}
                  className="space-y-4 rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-primary)]">Section {sectionIndex + 1}</p>
                      <Input
                        value={section.title}
                        className={LIGHT_INPUT_CLASS}
                        placeholder="Section title"
                        onChange={(event) => handleSectionChange(sectionIndex, "title", event.target.value)}
                        required
                      />
                      <Textarea
                        value={section.description || ""}
                        className={`${LIGHT_TEXTAREA_CLASS} min-h-[100px]`}
                        placeholder="Section description (optional)"
                        onChange={(event) => handleSectionChange(sectionIndex, "description", event.target.value)}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => moveSection(sectionIndex, "up")} disabled={sectionIndex === 0}>
                        Move Up
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => moveSection(sectionIndex, "down")}
                        disabled={sectionIndex === draft.sections.length - 1}
                      >
                        Move Down
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-[color:var(--ui-destructive)] text-[color:var(--ui-destructive)] hover:bg-[color:var(--ui-destructive-soft)]"
                        onClick={() => removeSection(sectionIndex)}
                        disabled={draft.sections.length === 1}
                      >
                        Remove Section
                      </Button>
                    </div>
                  </div>

                  {section.questions.map((question, questionIndex) => (
                    <div
                      key={question.id || `${question.key}_${questionIndex}`}
                      className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-primary)]">Question {questionIndex + 1}</p>
                          <Input
                            value={question.label}
                            className={LIGHT_INPUT_CLASS}
                            onChange={(event) => handleQuestionChange(sectionIndex, questionIndex, "label", event.target.value)}
                            placeholder="Untitled Question"
                            required
                          />
                        </div>

                        <div className="w-full space-y-2 sm:w-64">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-[color:var(--ui-foreground)]">Response Type</Label>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => moveQuestion(sectionIndex, questionIndex, "up")}
                                disabled={questionIndex === 0}
                                aria-label="Move question up"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => moveQuestion(sectionIndex, questionIndex, "down")}
                                disabled={questionIndex === section.questions.length - 1}
                                aria-label="Move question down"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 border-[color:var(--ui-destructive)] text-[color:var(--ui-destructive)] hover:bg-[color:var(--ui-destructive-soft)]"
                                onClick={() => removeQuestion(sectionIndex, questionIndex)}
                                disabled={section.questions.length === 1}
                                aria-label="Remove question"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <Select
                            value={question.type}
                            onValueChange={(value) => handleQuestionChange(sectionIndex, questionIndex, "type", value)}
                          >
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
                            onChange={(event) => handleQuestionChange(sectionIndex, questionIndex, "key", event.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[color:var(--ui-foreground)]">Placeholder Text</Label>
                          <Input
                            value={question.placeholder || ""}
                            className={LIGHT_INPUT_CLASS}
                            onChange={(event) => handleQuestionChange(sectionIndex, questionIndex, "placeholder", event.target.value)}
                          />
                        </div>
                      </div>

                      {question.type === "select" ? (
                        <div className="mt-4 space-y-2">
                          <Label className="text-[color:var(--ui-foreground)]">Multiple Choice Options (comma or new line separated)</Label>
                          <Textarea
                            value={(question.options || []).join("\n")}
                            className={LIGHT_TEXTAREA_CLASS}
                            onChange={(event) => handleQuestionChange(sectionIndex, questionIndex, "options", event.target.value)}
                          />
                        </div>
                      ) : null}

                      <div className="mt-4 rounded-md border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Preview</p>
                        <p className="mt-2 text-sm font-medium text-[color:var(--ui-foreground)]">{question.label || "Untitled Question"}</p>
                        <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">{getQuestionTypeLabel(question.type)}</p>
                        <div className="mt-3">{renderQuestionPreview(question)}</div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[color:var(--ui-border)] pt-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`required-${sectionIndex}-${questionIndex}`}
                            className="border-[color:var(--ui-border)] data-[state=checked]:border-[color:var(--ui-primary)] data-[state=checked]:bg-[color:var(--ui-primary)]"
                            checked={Boolean(question.required)}
                            onCheckedChange={(checked) => handleQuestionChange(sectionIndex, questionIndex, "required", Boolean(checked))}
                          />
                          <Label className="text-[color:var(--ui-foreground)]" htmlFor={`required-${sectionIndex}-${questionIndex}`}>
                            Required
                          </Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`visible-${sectionIndex}-${questionIndex}`}
                            className="border-[color:var(--ui-border)] data-[state=checked]:border-[color:var(--ui-primary)] data-[state=checked]:bg-[color:var(--ui-primary)]"
                            checked={question.isVisible !== false}
                            onCheckedChange={(checked) => handleQuestionChange(sectionIndex, questionIndex, "isVisible", Boolean(checked))}
                          />
                          <Label className="text-[color:var(--ui-foreground)]" htmlFor={`visible-${sectionIndex}-${questionIndex}`}>
                            Visible
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--ui-border)] pt-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">
                      Add field to this section
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => addQuestion(sectionIndex, "text")}>
                        + Add Field
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => addQuestion(sectionIndex, "textarea")}>
                        + Paragraph
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => addQuestion(sectionIndex, "select")}>
                        + Multiple choice
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end border-t border-[color:var(--ui-border)] pt-3">
                <Button type="button" size="sm" onClick={addSection}>
                  + Add Section
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-[color:var(--ui-border)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="ghost" onClick={() => router.push("/admin/campaigns")}>
                Cancel
              </Button>

              <div className="flex flex-wrap items-center gap-2">
                {editorStep === 2 ? (
                  <Button type="button" variant="outline" onClick={() => setEditorStep(1)}>
                    Back
                  </Button>
                ) : null}
                {editorStep === 1 ? (
                  <Button type="button" onClick={goToQuestionsStep} disabled={isUploadingImage}>
                    {isUploadingImage ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    {isUploadingImage ? "Uploading Image..." : "Continue to Form Builder"}
                  </Button>
                ) : (
                  <Button type="button" disabled={saving || isUploadingImage} onClick={saveCampaign}>
                    {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    {saving ? "Creating..." : "Create Campaign"}
                  </Button>
                )}
              </div>
            </div>

            {statusError ? <p className="mt-3 text-sm text-[color:var(--ui-destructive)]">{statusError}</p> : null}
            {statusSuccess ? <p className="mt-3 text-sm text-[color:var(--ui-success)]">{statusSuccess}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
