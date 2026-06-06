"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageState from "../shared/PageState";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { DatePicker } from "../ui/date-picker";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Textarea } from "../ui/textarea";
import { createCsrfHeaders } from "../../lib/csrf-client";

const LIGHT_INPUT_CLASS =
  "border-[color:var(--ui-border)] bg-[color:var(--ui-input)] text-[color:var(--ui-foreground)] placeholder:text-[color:var(--ui-muted-foreground)] focus-visible:ring-[color:var(--ui-ring)] focus-visible:ring-offset-[color:var(--ui-background)]";
const LIGHT_TEXTAREA_CLASS =
  "border-[color:var(--ui-border)] bg-[color:var(--ui-input)] text-[color:var(--ui-foreground)] placeholder:text-[color:var(--ui-muted-foreground)] focus-visible:ring-[color:var(--ui-ring)] focus-visible:ring-offset-[color:var(--ui-background)]";
const LIGHT_SELECT_TRIGGER_CLASS =
  "border-[color:var(--ui-border)] bg-[color:var(--ui-input)] text-[color:var(--ui-foreground)] focus:ring-[color:var(--ui-ring)] focus:ring-offset-[color:var(--ui-background)] ring-offset-[color:var(--ui-background)]";
const RESPONSE_PAGE_LIMIT = 50;

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

function formatDateTime(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function toDateInputValue(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function ensureSections(campaign) {
  if (Array.isArray(campaign?.sections) && campaign.sections.length) {
    return campaign.sections.map((section, sectionIndex) => ({
      id: section.id || `section_${sectionIndex + 1}`,
      key: section.key || `section_${sectionIndex + 1}`,
      title: section.title || `Section ${sectionIndex + 1}`,
      description: section.description || "",
      order: Number(section.order || sectionIndex),
      questions: (Array.isArray(section.questions) ? section.questions : []).map((question, questionIndex) => ({
        ...question,
        options: Array.isArray(question.options) ? question.options : [],
        order: Number(question.order || questionIndex),
      })),
    }));
  }

  const questions = Array.isArray(campaign?.questions) ? campaign.questions : [];
  if (!questions.length) {
    return [createEmptySection(0)];
  }

  const groupedBySection = new Map();
  const orderedQuestions = questions.slice().sort((a, b) => (a.sectionOrder || 0) - (b.sectionOrder || 0) || a.order - b.order);

  for (const question of orderedQuestions) {
    const sectionOrder = Number(question.sectionOrder || 0);
    const sectionKey = question.sectionKey || `section_${sectionOrder + 1}`;

    if (!groupedBySection.has(sectionKey)) {
      groupedBySection.set(sectionKey, {
        id: sectionKey,
        key: sectionKey,
        title: question.sectionTitle || `Section ${sectionOrder + 1}`,
        description: question.sectionDescription || "",
        order: sectionOrder,
        questions: [],
      });
    }

    groupedBySection.get(sectionKey).questions.push({
      ...question,
      options: Array.isArray(question.options) ? question.options : [],
    });
  }

  return Array.from(groupedBySection.values())
    .sort((a, b) => a.order - b.order)
    .map((section, sectionIndex) => ({
      ...section,
      order: sectionIndex,
      questions: section.questions.map((question, questionIndex) => ({
        ...question,
        order: questionIndex,
      })),
    }));
}

function campaignToDraft(campaign) {
  return {
    title: campaign?.title || "",
    slug: campaign?.slug || "",
    targetMarket: campaign?.targetMarket || "",
    deadline: toDateInputValue(campaign?.deadline),
    description: campaign?.description || "",
    imageUrl: campaign?.imageUrl || "",
    isPublished: campaign?.isPublished !== false,
    order: Number.isFinite(campaign?.order) ? campaign.order : 0,
    sections: ensureSections(campaign),
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
  const [loadingResponses, setLoadingResponses] = useState(isEditing);
  const [loadingMoreResponses, setLoadingMoreResponses] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusSuccess, setStatusSuccess] = useState("");
  const [responsesError, setResponsesError] = useState("");
  const [responses, setResponses] = useState([]);
  const [responseQuestions, setResponseQuestions] = useState([]);
  const [responsesNextCursor, setResponsesNextCursor] = useState(null);
  const [responsesHasMore, setResponsesHasMore] = useState(false);

  const flatQuestionCount = useMemo(
    () => draft.sections.reduce((total, section) => total + (Array.isArray(section.questions) ? section.questions.length : 0), 0),
    [draft.sections]
  );

  async function fetchResponsePage(cursor = null) {
    const query = new URLSearchParams({ limit: String(RESPONSE_PAGE_LIMIT) });
    if (cursor) {
      query.set("cursor", cursor);
    }

    const response = await fetch(`/api/admin/campaigns/${campaignId}/responses?${query.toString()}`, { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Unable to load campaign responses.");
    }

    return payload;
  }

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

  useEffect(() => {
    if (!isEditing || loadingCampaign || notFound) {
      setLoadingResponses(false);
      setLoadingMoreResponses(false);
      setResponsesHasMore(false);
      setResponsesNextCursor(null);
      return;
    }

    let isCancelled = false;

    async function loadResponses() {
      setLoadingResponses(true);
      setResponsesError("");

      try {
        const payload = await fetchResponsePage();

        if (!isCancelled) {
          setResponses(Array.isArray(payload.responses) ? payload.responses : []);
          setResponseQuestions(Array.isArray(payload.questions) ? payload.questions : []);
          setResponsesNextCursor(payload.nextCursor || null);
          setResponsesHasMore(Boolean(payload.hasMore));
        }
      } catch (error) {
        if (!isCancelled) {
          setResponsesError(error.message || "Unable to load campaign responses.");
          setResponses([]);
          setResponseQuestions([]);
          setResponsesNextCursor(null);
          setResponsesHasMore(false);
        }
      } finally {
        if (!isCancelled) {
          setLoadingResponses(false);
        }
      }
    }

    loadResponses();

    return () => {
      isCancelled = true;
    };
  }, [campaignId, isEditing, loadingCampaign, notFound]);

  async function handleLoadMoreResponses() {
    if (!responsesNextCursor || !responsesHasMore || loadingMoreResponses || loadingResponses) {
      return;
    }

    setLoadingMoreResponses(true);
    setResponsesError("");

    try {
      const payload = await fetchResponsePage(responsesNextCursor);
      setResponses((current) => [...current, ...(Array.isArray(payload.responses) ? payload.responses : [])]);
      setResponsesNextCursor(payload.nextCursor || null);
      setResponsesHasMore(Boolean(payload.hasMore));
    } catch (error) {
      setResponsesError(error.message || "Unable to load campaign responses.");
    } finally {
      setLoadingMoreResponses(false);
    }
  }

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

  function duplicateQuestion(sectionIndex, questionIndex) {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;

        const source = section.questions[questionIndex];
        if (!source) return section;

        const baseKey = source.key || `field_${questionIndex + 1}`;
        const clone = {
          ...source,
          id: `temp_q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          key: `${baseKey}_copy_${section.questions.length + 1}`,
          options: Array.isArray(source.options) ? [...source.options] : [],
        };

        const nextQuestions = [...section.questions];
        nextQuestions.splice(questionIndex + 1, 0, clone);

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
      setStatusSuccess("Campaign cover image uploaded.");
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

  function openResponseExport() {
    if (!isEditing || !responses.length) return;
    window.open(`/api/admin/campaigns/${campaignId}/responses?format=csv`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{isEditing ? "Campaign Builder" : "Create Campaign"}</CardTitle>
              <CardDescription>Build campaign info first, then design a sectioned form like Google Forms.</CardDescription>
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
              <p className="mt-1 text-xs opacity-80">Name, deadline, cover image, and target market</p>
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
              <p className="font-semibold">2. Campaign Form Builder</p>
              <p className="mt-1 text-xs opacity-80">Create sections and questions in Google Forms style</p>
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
                    <p className="mt-1 text-sm text-[color:var(--ui-muted-foreground)]">Define the campaign setup before building questions.</p>
                  </div>

                  <div className="mt-6 space-y-4">
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
                        className={LIGHT_TEXTAREA_CLASS}
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
                        className={`rounded-xl border-2 border-dashed p-10 text-center transition ${
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
                          {isUploadingImage ? "Uploading cover image..." : "Drag and drop cover image here"}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">or click to browse files</p>
                        <p className="mt-2 text-xs text-[color:var(--ui-muted-foreground)]">PNG, JPG, WEBP supported</p>
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
                              <Button type="button" size="sm" variant="outline" onClick={() => imageInputRef.current?.click()}>
                                Replace
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-[color:var(--ui-destructive)] text-[color:var(--ui-destructive)] hover:bg-[color:var(--ui-destructive-soft)]"
                                onClick={clearImage}
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
              <div className="mx-auto w-full max-w-5xl space-y-4">
                <div className="rounded-2xl border border-[color:var(--ui-primary)] bg-[color:var(--ui-card)] p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-semibold text-[color:var(--ui-foreground)]">Campaign Form Builder</h4>
                      <p className="mt-1 text-sm text-[color:var(--ui-muted-foreground)]">Add sections and questions just like Google Forms.</p>
                    </div>
                    <Button type="button" size="sm" onClick={addSection}>
                      + Add Section
                    </Button>
                  </div>
                </div>

                <Card className="overflow-hidden">
                  <div className="relative min-h-[280px] border-b border-[color:var(--ui-border)]">
                    {draft.imageUrl ? (
                      <img src={draft.imageUrl} alt={draft.title || "Campaign cover"} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#0f274f] via-[#173a72] to-[#9bc53d]" />
                    )}

                    <div className="absolute inset-0 bg-[linear-gradient(116deg,rgba(255,255,255,0.92)_0%,rgba(255,255,255,0.86)_42%,rgba(255,255,255,0)_66%)]" />
                    <div
                      className="absolute left-0 top-0 h-full w-[62%] bg-white/82"
                      style={{ clipPath: "polygon(0 0, 86% 0, 62% 100%, 0 100%)" }}
                    />
                    <div className="absolute left-[22%] top-[20%] h-4 w-28 rotate-45 bg-[#9bc53d]/80" />
                    <div className="absolute left-[16%] bottom-[18%] h-4 w-24 -rotate-45 bg-[#9bc53d]/80" />

                    <div className="relative z-10 flex h-full flex-col justify-between p-6">
                      <div className="max-w-xl space-y-2 text-left text-[#0f274f]">
                        <Badge variant="secondary" className="bg-white/70 text-[#0f274f]">
                          Campaign is halfway created
                        </Badge>
                        <h3 className="text-3xl font-bold leading-tight">{draft.title || "Untitled Campaign"}</h3>
                        <p className="max-w-lg text-sm text-[#29466f]">{draft.description || "Campaign description will appear here."}</p>
                        {draft.targetMarket ? <p className="text-xs font-semibold uppercase tracking-wide text-[#365883]">Target: {draft.targetMarket}</p> : null}
                      </div>

                      <div className="mx-auto flex items-center gap-2 rounded-full bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        <img src="/images/logo/LESAAL.png" alt="Lesaal" className="h-5 w-5 rounded-sm bg-white/90 p-0.5" />
                        <span>Lesaal</span>
                      </div>
                    </div>
                  </div>

                  <CardContent className="space-y-3 pt-4">
                    <div className="flex items-center justify-between text-xs text-[color:var(--ui-muted-foreground)]">
                      <span>Step 2 progress</span>
                      <span>50%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[color:var(--ui-muted)]">
                      <div className="h-2 w-1/2 rounded-full bg-[color:var(--ui-primary)]" />
                    </div>
                  </CardContent>
                </Card>

                {draft.sections.map((section, sectionIndex) => (
                  <div key={section.id || `${section.key}_${sectionIndex}`} className="space-y-4 rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-5 shadow-sm">
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
                          className={LIGHT_TEXTAREA_CLASS}
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
                          className="border-[color:var(--ui-destructive)] bg-[color:var(--ui-destructive-soft)] text-[color:var(--ui-destructive)] hover:bg-[color:var(--ui-destructive-soft)]"
                          onClick={() => removeSection(sectionIndex)}
                          disabled={draft.sections.length === 1}
                        >
                          Remove Section
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-b border-[color:var(--ui-border)] pb-3">
                      <Button type="button" size="sm" variant="outline" onClick={() => addQuestion(sectionIndex, "text")}>
                        + Short answer
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => addQuestion(sectionIndex, "textarea")}>
                        + Paragraph
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => addQuestion(sectionIndex, "select")}>
                        + Multiple choice
                      </Button>
                    </div>

                    {section.questions.map((question, questionIndex) => (
                      <div
                        key={question.id || `${question.key}_${questionIndex}`}
                        className="rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-5"
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

                          <div className="w-full space-y-2 sm:w-56">
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

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-[color:var(--ui-border)] bg-[color:var(--ui-card)] text-[color:var(--ui-foreground)] hover:bg-[color:var(--ui-muted)]"
                              onClick={() => moveQuestion(sectionIndex, questionIndex, "up")}
                              disabled={questionIndex === 0}
                            >
                              Move Up
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-[color:var(--ui-border)] bg-[color:var(--ui-card)] text-[color:var(--ui-foreground)] hover:bg-[color:var(--ui-muted)]"
                              onClick={() => moveQuestion(sectionIndex, questionIndex, "down")}
                              disabled={questionIndex === section.questions.length - 1}
                            >
                              Move Down
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-[color:var(--ui-border)] bg-[color:var(--ui-card)] text-[color:var(--ui-foreground)] hover:bg-[color:var(--ui-muted)]"
                              onClick={() => duplicateQuestion(sectionIndex, questionIndex)}
                            >
                              Duplicate
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="border-[color:var(--ui-destructive)] bg-[color:var(--ui-destructive-soft)] text-[color:var(--ui-destructive)] hover:bg-[color:var(--ui-destructive-soft)]"
                              onClick={() => removeQuestion(sectionIndex, questionIndex)}
                              disabled={section.questions.length === 1}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
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
                      Continue to Form Builder
                    </Button>
                  ) : (
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : isEditing ? "Update Campaign" : "Create Campaign"}
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">{draft.sections.length} sections</Badge>
                <Badge variant="secondary">{flatQuestionCount} questions</Badge>
                {draft.deadline ? <Badge variant="secondary">Deadline: {formatDate(draft.deadline)}</Badge> : null}
              </div>

              {statusError ? <p className="mt-3 text-sm text-[color:var(--ui-destructive)]">{statusError}</p> : null}
              {statusSuccess ? <p className="mt-3 text-sm text-[color:var(--ui-success)]">{statusSuccess}</p> : null}
            </CardContent>
          </Card>
        </form>
      ) : null}

      {isEditing && !loadingCampaign && !notFound ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Campaign Responses</CardTitle>
              <CardDescription>View all submissions for this campaign, similar to Google Forms responses.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{responses.length} loaded</Badge>
              <Button type="button" variant="outline" onClick={openResponseExport} disabled={!responses.length}>
                Export CSV
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <PageState
              status={loadingResponses ? "loading" : responsesError ? "error" : responses.length ? "loaded" : "empty"}
              resourceLabel="campaign responses"
              errorMessage={responsesError}
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

              {responsesHasMore ? (
                <div className="mt-4 flex justify-center">
                  <Button type="button" variant="outline" onClick={handleLoadMoreResponses} disabled={loadingMoreResponses}>
                    {loadingMoreResponses ? "Loading..." : "Load More Responses"}
                  </Button>
                </div>
              ) : null}
            </PageState>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
