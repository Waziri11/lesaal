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
import Swal from "sweetalert2";
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

function buildAnswerKeySeed(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/[\s-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized;
}

function withGeneratedAnswerKeys(sections = []) {
  const usedKeys = new Set();

  return sections.map((section, sectionIndex) => {
    const sectionLabel = buildAnswerKeySeed(section?.title) || `section_${sectionIndex + 1}`;
    const questions = Array.isArray(section?.questions) ? section.questions : [];

    return {
      ...section,
      questions: questions.map((question, questionIndex) => {
        const baseKey = buildAnswerKeySeed(question?.label) || `${sectionLabel}_field_${questionIndex + 1}`;

        let uniqueKey = baseKey;
        let suffix = 2;
        while (usedKeys.has(uniqueKey)) {
          uniqueKey = `${baseKey}_${suffix}`;
          suffix += 1;
        }
        usedKeys.add(uniqueKey);

        return {
          ...question,
          key: uniqueKey,
        };
      }),
    };
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
    autoResponseEnabled: false,
    autoResponseSubject: "",
    autoResponseBody: "",
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
  const [optionDrafts, setOptionDrafts] = useState({});
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

  const autoResponseVariables = useMemo(() => {
    const generatedSections = withGeneratedAnswerKeys(draft.sections || []);
    const variables = [
      { key: "campaign_title", label: "Campaign title" },
      { key: "campaign_slug", label: "Campaign slug" },
      { key: "target_market", label: "Target market" },
      { key: "submitted_at", label: "Submitted at (ISO)" },
    ];

    for (const section of generatedSections) {
      for (const question of section.questions || []) {
        const key = String(question?.key || "").trim();
        const label = String(question?.label || "").trim() || key;
        if (!key) continue;
        variables.push({ key, label });
      }
    }

    const seen = new Set();
    return variables.filter((entry) => {
      if (seen.has(entry.key)) return false;
      seen.add(entry.key);
      return true;
    });
  }, [draft.sections]);

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
              const normalizedOptions = Array.isArray(value)
                ? value.map((entry) => String(entry || "").trim()).filter(Boolean)
                : String(value)
                    .split(/[\n,]/)
                    .map((entry) => entry.trim())
                    .filter(Boolean);

              return {
                ...question,
                options: normalizedOptions,
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

  function updateQuestionOption(sectionIndex, questionIndex, optionIndex, value) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;

        return {
          ...section,
          questions: section.questions.map((question, currentQuestionIndex) => {
            if (currentQuestionIndex !== questionIndex) return question;

            const existingOptions = Array.isArray(question.options) ? question.options : [];
            const nextOptions = existingOptions.map((optionValue, currentOptionIndex) =>
              currentOptionIndex === optionIndex ? value : optionValue
            );

            return {
              ...question,
              options: nextOptions,
            };
          }),
        };
      }),
    }));
  }

  function addQuestionOption(sectionIndex, questionIndex, optionDraftKey) {
    const nextOption = String(optionDrafts[optionDraftKey] || "").trim();
    if (!nextOption) return;

    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;

        return {
          ...section,
          questions: section.questions.map((question, currentQuestionIndex) => {
            if (currentQuestionIndex !== questionIndex) return question;

            const existingOptions = Array.isArray(question.options) ? question.options : [];

            return {
              ...question,
              options: [...existingOptions, nextOption],
            };
          }),
        };
      }),
    }));

    setOptionDrafts((current) => ({
      ...current,
      [optionDraftKey]: "",
    }));
  }

  function removeQuestionOption(sectionIndex, questionIndex, optionIndex) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;

        return {
          ...section,
          questions: section.questions.map((question, currentQuestionIndex) => {
            if (currentQuestionIndex !== questionIndex) return question;

            const existingOptions = Array.isArray(question.options) ? question.options : [];

            return {
              ...question,
              options: existingOptions.filter((_, currentOptionIndex) => currentOptionIndex !== optionIndex),
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
    if (draft.autoResponseEnabled) {
      if (!String(draft.autoResponseSubject || "").trim()) {
        return "Auto response subject is required when ongoing auto response is enabled.";
      }

      if (!String(draft.autoResponseBody || "").trim()) {
        return "Auto response message is required when ongoing auto response is enabled.";
      }
    }

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

        if (question.type === "select" && (!Array.isArray(question.options) || !question.options.length)) {
          return `Add at least one option for question ${questionIndex + 1} in section ${sectionIndex + 1}.`;
        }
      }
    }

    return "";
  }

  function goToPreviewStep() {
    if (editorStep === 1) {
      goToQuestionsStep();
      return;
    }

    const validationError = validateBeforeSave();
    if (validationError) {
      setStatusError(validationError);
      return;
    }

    setStatusError("");
    setStatusSuccess("");
    setEditorStep(3);
  }

  async function saveCampaign() {
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
      const draftWithGeneratedKeys = {
        ...draft,
        sections: withGeneratedAnswerKeys(draft.sections),
      };

      const response = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: createCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          ...draftWithGeneratedKeys,
          slug: draftWithGeneratedKeys.slug || slugify(draftWithGeneratedKeys.title),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to create campaign.");
      }

      await Swal.fire({
        icon: "success",
        title: "Campaign created",
        text: "Campaign was created successfully.",
      });
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
          <Button
            type="button"
            variant="outline"
            disabled={isUploadingImage}
            className={
              editorStep === 3
                ? "border-[color:var(--ui-primary)] bg-[color:var(--ui-primary-soft)] text-[color:var(--ui-primary)]"
                : ""
            }
            onClick={() => {
              if (editorStep === 1) {
                goToQuestionsStep();
                return;
              }
              goToPreviewStep();
            }}
          >
            3. Preview & Confirm
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
                  className={`relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed p-6 text-center transition ${
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
                  {draft.imageUrl ? (
                    <>
                      <img
                        src={draft.imageUrl}
                        alt="Campaign cover preview"
                        className="absolute inset-0 h-full w-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black/35" />
                      <div className="relative z-10 flex flex-wrap items-center justify-center gap-3">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="min-w-[112px]"
                          disabled={isUploadingImage}
                          onClick={(event) => {
                            event.stopPropagation();
                            imageInputRef.current?.click();
                          }}
                        >
                          Replace
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="min-w-[112px] border-[color:var(--ui-destructive)] bg-[color:var(--ui-card)] text-[color:var(--ui-destructive)] hover:bg-[color:var(--ui-destructive-soft)]"
                          onClick={(event) => {
                            event.stopPropagation();
                            clearImage();
                          }}
                          disabled={isUploadingImage}
                        >
                          Remove
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-[color:var(--ui-foreground)]">
                        {isUploadingImage ? "Uploading cover image..." : "Drag and drop cover image here"}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">or click to browse files</p>
                      <p className="mt-2 text-xs text-[color:var(--ui-muted-foreground)]">PNG, JPG, WEBP supported</p>
                    </div>
                  )}
                  {isUploadingImage ? (
                    <div className="absolute inset-x-6 bottom-6 z-20 mx-auto w-full max-w-sm space-y-2 rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]/90 p-3 backdrop-blur">
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

              <div className="space-y-3 rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--ui-foreground)]">Auto responder (optional)</p>
                    <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">
                      Enable ongoing follow-up emails for every new campaign response.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="campaign-auto-response-enabled"
                      className="border-[color:var(--ui-border)] data-[state=checked]:border-[color:var(--ui-primary)] data-[state=checked]:bg-[color:var(--ui-primary)]"
                      checked={Boolean(draft.autoResponseEnabled)}
                      onCheckedChange={(checked) => handleDraftValue("autoResponseEnabled", Boolean(checked))}
                    />
                    <Label className="text-[color:var(--ui-foreground)]" htmlFor="campaign-auto-response-enabled">
                      Enable ongoing mode
                    </Label>
                  </div>
                </div>

                {draft.autoResponseEnabled ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-[color:var(--ui-foreground)]" htmlFor="campaign-auto-response-subject">
                        Auto response subject
                      </Label>
                      <Input
                        id="campaign-auto-response-subject"
                        value={draft.autoResponseSubject || ""}
                        className={LIGHT_INPUT_CLASS}
                        placeholder="Thanks for joining {{campaign_title}}"
                        onChange={(event) => handleDraftValue("autoResponseSubject", event.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[color:var(--ui-foreground)]" htmlFor="campaign-auto-response-body">
                        Auto response message
                      </Label>
                      <Textarea
                        id="campaign-auto-response-body"
                        className={`${LIGHT_TEXTAREA_CLASS} min-h-[140px]`}
                        value={draft.autoResponseBody || ""}
                        placeholder={`Hi {{full_name}},\n\nThanks for your interest in {{campaign_title}}.\nWe'll review your response and get back to you shortly.`}
                        onChange={(event) => handleDraftValue("autoResponseBody", event.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">
                        Template variables
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {autoResponseVariables.map((variable) => (
                          <button
                            key={variable.key}
                            type="button"
                            className="rounded-full border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] px-2.5 py-1 text-xs text-[color:var(--ui-foreground)]"
                            onClick={() => {
                              const token = `{{${variable.key}}}`;
                              const existingBody = String(draft.autoResponseBody || "");
                              if (existingBody.includes(token)) return;
                              handleDraftValue("autoResponseBody", existingBody ? `${existingBody}\n${token}` : token);
                            }}
                            title={variable.label}
                          >
                            {`{{${variable.key}}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : editorStep === 2 ? (
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

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => moveSection(sectionIndex, "up")}
                        disabled={sectionIndex === 0}
                        aria-label="Move section up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => moveSection(sectionIndex, "down")}
                        disabled={sectionIndex === draft.sections.length - 1}
                        aria-label="Move section down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 border-[color:var(--ui-destructive)] text-[color:var(--ui-destructive)] hover:bg-[color:var(--ui-destructive-soft)]"
                        onClick={() => removeSection(sectionIndex)}
                        disabled={draft.sections.length === 1}
                        aria-label="Remove section"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {section.questions.map((question, questionIndex) => (
                    <div
                      key={question.id || `${question.key}_${questionIndex}`}
                      className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4"
                    >
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="flex flex-wrap items-center justify-between gap-2 md:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-primary)]">
                            Question {questionIndex + 1}
                          </p>
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

                        <div className="space-y-2">
                          <Label className="text-[color:var(--ui-foreground)]">Question</Label>
                          <Input
                            value={question.label}
                            className={LIGHT_INPUT_CLASS}
                            onChange={(event) => handleQuestionChange(sectionIndex, questionIndex, "label", event.target.value)}
                            placeholder="Untitled Question"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[color:var(--ui-foreground)]">Response Type</Label>
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

                      <div className="mt-4 space-y-2">
                        <Label className="text-[color:var(--ui-foreground)]">Placeholder Text</Label>
                        <Input
                          value={question.placeholder || ""}
                          className={LIGHT_INPUT_CLASS}
                          onChange={(event) => handleQuestionChange(sectionIndex, questionIndex, "placeholder", event.target.value)}
                        />
                      </div>

                      {question.type === "select" ? (
                        <div className="mt-4 space-y-3">
                          <Label className="text-[color:var(--ui-foreground)]">Multiple Choice Options</Label>
                          <div className="space-y-2">
                            {(question.options || []).map((option, optionIndex) => (
                              <div key={`${question.id || question.key}_option_${optionIndex}`} className="flex items-center gap-2">
                                <Input
                                  value={option}
                                  className={LIGHT_INPUT_CLASS}
                                  placeholder={`Option ${optionIndex + 1}`}
                                  onChange={(event) => updateQuestionOption(sectionIndex, questionIndex, optionIndex, event.target.value)}
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="h-9 w-9 border-[color:var(--ui-destructive)] text-[color:var(--ui-destructive)] hover:bg-[color:var(--ui-destructive-soft)]"
                                  onClick={() => removeQuestionOption(sectionIndex, questionIndex, optionIndex)}
                                  disabled={(question.options || []).length <= 1}
                                  aria-label={`Remove option ${optionIndex + 1}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              value={optionDrafts[String(question.id || `${sectionIndex}_${questionIndex}`)] || ""}
                              className={LIGHT_INPUT_CLASS}
                              placeholder="Type option and click Add option"
                              onChange={(event) =>
                                setOptionDrafts((current) => ({
                                  ...current,
                                  [String(question.id || `${sectionIndex}_${questionIndex}`)]: event.target.value,
                                }))
                              }
                              onKeyDown={(event) => {
                                if (event.key !== "Enter") return;
                                event.preventDefault();
                                addQuestionOption(sectionIndex, questionIndex, String(question.id || `${sectionIndex}_${questionIndex}`));
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => addQuestionOption(sectionIndex, questionIndex, String(question.id || `${sectionIndex}_${questionIndex}`))}
                              disabled={!String(optionDrafts[String(question.id || `${sectionIndex}_${questionIndex}`)] || "").trim()}
                            >
                              Add option
                            </Button>
                          </div>

                          <p className="text-xs text-[color:var(--ui-muted-foreground)]">
                            Add options one at a time.
                          </p>
                        </div>
                      ) : null}

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
          ) : (
            <div className="mx-auto w-full max-w-4xl space-y-5">
              <div className="overflow-hidden rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)]">
                {draft.imageUrl ? (
                  <img src={draft.imageUrl} alt="Campaign cover" className="h-56 w-full object-cover md:h-72" />
                ) : null}
                <div className="space-y-3 p-4 md:p-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-muted-foreground)]">Campaign Preview</p>
                    <h3 className="mt-1 text-2xl font-semibold text-[color:var(--ui-foreground)]">
                      {draft.title || "Untitled Campaign"}
                    </h3>
                  </div>
                  <p className="text-sm text-[color:var(--ui-muted-foreground)]">{draft.description || "No description provided."}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Target: {draft.targetMarket || "N/A"}</Badge>
                    <Badge variant="outline">Deadline: {formatDate(draft.deadline) || "No deadline"}</Badge>
                    <Badge variant="outline">Slug: {draft.slug || slugify(draft.title) || "n/a"}</Badge>
                    <Badge variant="outline">{draft.isPublished ? "Published" : "Draft"}</Badge>
                    <Badge variant="outline">{draft.autoResponseEnabled ? "Ongoing responder: Enabled" : "Ongoing responder: Off"}</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-4 md:p-5">
                <div>
                  <h3 className="text-lg font-semibold text-[color:var(--ui-foreground)]">Full Form Preview</h3>
                  <p className="text-sm text-[color:var(--ui-muted-foreground)]">
                    Review the final respondent experience before saving this campaign.
                  </p>
                </div>

                <div className="space-y-4">
                  {draft.sections.map((section, sectionIndex) => {
                    const visibleQuestions = (section.questions || []).filter((question) => question.isVisible !== false);

                    return (
                      <div
                        key={section.id || `${section.key}_preview_${sectionIndex}`}
                        className="space-y-4 rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-4"
                      >
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-primary)]">
                            Section {sectionIndex + 1}
                          </p>
                          <h4 className="mt-1 text-base font-semibold text-[color:var(--ui-foreground)]">
                            {section.title || `Section ${sectionIndex + 1}`}
                          </h4>
                          {section.description ? (
                            <p className="mt-1 text-sm text-[color:var(--ui-muted-foreground)]">{section.description}</p>
                          ) : null}
                        </div>

                        {visibleQuestions.length ? (
                          <div className="space-y-4">
                            {visibleQuestions.map((question, visibleQuestionIndex) => (
                              <div
                                key={question.id || `${question.key}_preview_${visibleQuestionIndex}`}
                                className="space-y-2 rounded-md border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <Label className="text-[color:var(--ui-foreground)]">
                                    {question.label || "Untitled Question"}
                                    {question.required ? <span className="ml-1 text-[color:var(--ui-destructive)]">*</span> : null}
                                  </Label>
                                  <p className="text-xs text-[color:var(--ui-muted-foreground)]">{getQuestionTypeLabel(question.type)}</p>
                                </div>
                                {renderQuestionPreview(question)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-[color:var(--ui-muted-foreground)]">
                            This section currently has no visible questions.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-3">
                  <p className="text-sm text-[color:var(--ui-muted-foreground)]">Need to change anything before publishing?</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditorStep(1)}>
                      Edit Campaign Info
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditorStep(2)}>
                      Edit Form Builder
                    </Button>
                  </div>
                </div>
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
                {editorStep === 3 ? (
                  <Button type="button" variant="outline" onClick={() => setEditorStep(2)}>
                    Back to Edit
                  </Button>
                ) : null}
                {editorStep === 1 ? (
                  <Button type="button" onClick={goToQuestionsStep} disabled={isUploadingImage}>
                    {isUploadingImage ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    {isUploadingImage ? "Uploading Image..." : "Continue to Form Builder"}
                  </Button>
                ) : editorStep === 2 ? (
                  <Button type="button" disabled={isUploadingImage} onClick={goToPreviewStep}>
                    {isUploadingImage ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    {isUploadingImage ? "Uploading Image..." : "Create Campaign"}
                  </Button>
                ) : (
                  <Button type="button" disabled={saving || isUploadingImage} onClick={saveCampaign}>
                    {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    {saving ? "Creating..." : "Confirm & Save Campaign"}
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
