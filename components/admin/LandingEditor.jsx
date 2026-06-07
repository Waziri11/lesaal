"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PublicLanding from "../PublicLanding";
import PageState from "../shared/PageState";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { SelectNative } from "../ui/select-native";
import { Textarea } from "../ui/textarea";
import {
  COMPONENT_VARIANT_OPTIONS,
  FORM_FIELD_TYPES,
  SCROLL_ANIMATION_OPTIONS,
  SECTION_ANIMATION_OPTIONS,
  SERVICE_DESCRIPTION_MAX_WORDS,
  TEMPLATE_SECTIONS,
  TEXT_ANIMATION_OPTIONS,
} from "../../lib/constants";
import { createCsrfHeaders } from "../../lib/csrf-client";

function createTempId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function reorderById(list, sourceId, targetId) {
  const sourceIndex = list.findIndex((item) => item.id === sourceId);
  const targetIndex = list.findIndex((item) => item.id === targetId);

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return list;
  }

  const next = [...list];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
}

function clampContextMenuPosition(position) {
  if (typeof window === "undefined") {
    return { x: 40, y: 120 };
  }

  const menuWidth = 980;
  const menuHeight = 900;
  const margin = 12;
  const rawX = typeof position?.x === "number" ? position.x : window.innerWidth / 2;
  const rawY = typeof position?.y === "number" ? position.y : window.innerHeight / 2;

  return {
    x: Math.max(margin, Math.min(rawX, window.innerWidth - menuWidth - margin)),
    y: Math.max(margin, Math.min(rawY, window.innerHeight - menuHeight - margin)),
  };
}

function clampServiceDescription(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, SERVICE_DESCRIPTION_MAX_WORDS)
    .join(" ");
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || "").trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeHexColor(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized.toLowerCase() : "";
}

function normalizeTextStyle(value) {
  const raw = value && typeof value === "object" ? value : {};
  const parsedSize = Number.parseInt(String(raw.fontSize ?? ""), 10);
  const fontSize = Number.isFinite(parsedSize) ? Math.max(12, Math.min(120, parsedSize)) : null;
  const color = normalizeHexColor(raw.color);

  return {
    fontSize,
    color,
    bold: Boolean(raw.bold),
    italic: Boolean(raw.italic),
    underline: Boolean(raw.underline),
  };
}

function textAnimationClass(preset) {
  if (preset === "TYPEWRITER") return "text-anim-typewriter";
  if (preset === "SLIDE_IN") return "text-anim-slide";
  if (preset === "ZOOM_IN") return "text-anim-zoom";
  if (preset === "FADE_UP") return "text-anim-fade-up";
  return "";
}

function scrollAnimationClass(preset) {
  if (preset === "PARALLAX") return "scroll-parallax";
  if (preset === "STICKY") return "scroll-sticky";
  if (preset === "REVEAL") return "scroll-reveal";
  return "";
}

function sectionPreviewAnimationClass(preset) {
  if (preset === "SLIDE_UP") return "section-preview-anim-slide-up";
  if (preset === "SCALE_IN") return "section-preview-anim-scale-in";
  if (preset === "FADE_IN") return "section-preview-anim-fade-in";
  return "";
}

function textStyleToCssVars(value) {
  const style = normalizeTextStyle(value);
  const vars = {};

  if (style.fontSize) {
    vars["--lp-text-size"] = `${style.fontSize}px`;
  }

  if (style.color) {
    vars["--lp-text-color"] = style.color;
  }

  if (style.bold) {
    vars["--lp-text-weight"] = "700";
  }

  if (style.italic) {
    vars["--lp-text-style"] = "italic";
  }

  if (style.underline) {
    vars["--lp-text-decoration"] = "underline";
  }

  return vars;
}

const ITEM_ENABLED_SECTION_TYPES = new Set([
  "STATS_BAND",
  "CLIENT_LOGOS",
  "SERVICES_GRID",
  "COMMENTARY",
  "PRICING",
  "FAQ",
  "FOOTER",
]);

function sectionSupportsItems(sectionType) {
  return ITEM_ENABLED_SECTION_TYPES.has(sectionType);
}

function createDefaultItemForSection(sectionType, order) {
  const base = {
    id: createTempId("item"),
    order,
    label: "",
    title: "",
    description: "",
    imageUrl: "",
    value: "",
    extra: {},
  };

  if (sectionType === "STATS_BAND") {
    return {
      ...base,
      title: "New Stat",
      description: "Metric label",
    };
  }

  if (sectionType === "CLIENT_LOGOS") {
    return {
      ...base,
      title: "Client Name",
    };
  }

  if (sectionType === "SERVICES_GRID") {
    return {
      ...base,
      title: "New Service",
      description: "Service description",
      extra: {
        tags: ["Tag"],
      },
    };
  }

  if (sectionType === "COMMENTARY") {
    return {
      ...base,
      title: "Client Name",
      label: "Role",
      description: "Client quote",
      value: "5/5",
      extra: {
        stars: 5,
      },
    };
  }

  if (sectionType === "PRICING") {
    return {
      ...base,
      title: "New Plan",
      label: "Plan summary",
      description: "Plan description",
      value: "$0 / month",
      extra: {
        key: createTempId("plan"),
        ctaText: "Get started",
        ctaLink: "#campaign-form",
        features: ["New feature"],
      },
    };
  }

  if (sectionType === "FAQ") {
    return {
      ...base,
      title: "New question?",
      description: "Answer goes here.",
    };
  }

  if (sectionType === "FOOTER") {
    return {
      ...base,
      title: "New Link",
      value: "#",
    };
  }

  return {
    ...base,
    extra: {
      key: createTempId("plan"),
    },
  };
}

export default function LandingEditor() {
  const [reloadKey, setReloadKey] = useState(0);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [templateType, setTemplateType] = useState(TEMPLATE_SECTIONS[0].type);

  const [selectedSectionId, setSelectedSectionId] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedFormFieldId, setSelectedFormFieldId] = useState(null);

  const [dragSectionId, setDragSectionId] = useState(null);
  const [dragItemRef, setDragItemRef] = useState(null);

  const [sectionOptionsMenu, setSectionOptionsMenu] = useState(null);
  const sectionOptionsRef = useRef(null);

  const selectedSection = useMemo(() => {
    if (!config || !selectedSectionId) return null;
    return config.sections.find((section) => section.id === selectedSectionId) || null;
  }, [config, selectedSectionId]);

  const menuSection = useMemo(() => {
    if (!config || !sectionOptionsMenu?.sectionId) return null;
    return config.sections.find((section) => section.id === sectionOptionsMenu.sectionId) || null;
  }, [config, sectionOptionsMenu]);

  const menuTextStyle = useMemo(
    () => normalizeTextStyle(menuSection?.settings?.textStyle),
    [menuSection]
  );

  const [previewReplayTick, setPreviewReplayTick] = useState(0);

  const menuPreview = useMemo(() => {
    if (!menuSection) return null;

    const settings = menuSection.settings || {};
    const dynamicWords = toStringArray(settings.dynamicWords);
    const dynamicWord = dynamicWords[0] || "";
    const baseBody =
      settings.description ||
      settings.body ||
      settings.subheading ||
      "Preview your unsaved changes here before publishing.";

    if (menuSection.type === "HERO") {
      return {
        title: settings.staticText || menuSection.title || "Let us help you grow your reach through",
        dynamicWord: dynamicWord || "Social media management",
        body: baseBody,
        primaryCtaText: settings.primaryCtaText || "Primary CTA",
        secondaryCtaText: settings.secondaryCtaText || "Secondary CTA",
      };
    }

    return {
      title: menuSection.title || "Section title",
      dynamicWord: "",
      body: baseBody,
      primaryCtaText: settings.ctaText || settings.submitText || "Primary Action",
      secondaryCtaText: settings.secondaryCtaText || "",
    };
  }, [menuSection]);

  const menuPreviewTextVars = useMemo(
    () => textStyleToCssVars(menuSection?.settings?.textStyle),
    [menuSection]
  );

  const menuPreviewKey = useMemo(() => {
    if (!menuSection) return "section-preview-empty";
    const settings = menuSection.settings || {};

    return [
      menuSection.id,
      menuSection.title,
      menuSection.textAnimation,
      menuSection.sectionAnimation,
      menuSection.scrollAnimation,
      settings.staticText || "",
      settings.description || "",
      settings.body || "",
      toStringArray(settings.dynamicWords).join("|"),
      settings.primaryCtaText || "",
      settings.secondaryCtaText || "",
      menuTextStyle.fontSize ?? "",
      menuTextStyle.color || "",
      menuTextStyle.bold ? "1" : "0",
      menuTextStyle.italic ? "1" : "0",
      menuTextStyle.underline ? "1" : "0",
      previewReplayTick,
    ].join("::");
  }, [menuSection, menuTextStyle, previewReplayTick]);

  const selectedFormField = useMemo(() => {
    if (!config) return null;
    const field = config.formFields.find((entry) => entry.id === selectedFormFieldId);
    if (field) return field;
    return config.formFields[0] || null;
  }, [config, selectedFormFieldId]);

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/admin/landing-config");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load landing config.");
        }

        if (active) {
          setConfig(payload.config);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Failed to load landing config.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadConfig();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!config) return;

    if (!config.sections.length) {
      setSelectedSectionId(null);
      setSelectedItemId(null);
      setSectionOptionsMenu(null);
      return;
    }

    const sectionExists = config.sections.some((section) => section.id === selectedSectionId);

    if (!selectedSectionId || !sectionExists) {
      const firstSection = [...config.sections].sort((a, b) => a.order - b.order)[0];
      setSelectedSectionId(firstSection.id);
      setSelectedItemId(null);
    }
  }, [config, selectedSectionId]);

  useEffect(() => {
    if (!selectedSection) {
      setSelectedItemId(null);
      return;
    }

    if (!selectedItemId) return;

    const itemExists = selectedSection.items.some((item) => item.id === selectedItemId);

    if (!itemExists) {
      setSelectedItemId(null);
    }
  }, [selectedSection, selectedItemId]);

  useEffect(() => {
    if (!config || !selectedFormFieldId) return;

    const fieldExists = config.formFields.some((field) => field.id === selectedFormFieldId);

    if (!fieldExists) {
      setSelectedFormFieldId(null);
    }
  }, [config, selectedFormFieldId]);

  useEffect(() => {
    if (!sectionOptionsMenu) return;

    function handleEscape(event) {
      if (event.key === "Escape") {
        setSectionOptionsMenu(null);
      }
    }

    function handleOutside(event) {
      if (sectionOptionsRef.current && !sectionOptionsRef.current.contains(event.target)) {
        setSectionOptionsMenu(null);
      }
    }

    window.addEventListener("keydown", handleEscape);
    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("touchstart", handleOutside, { passive: true });

    return () => {
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("touchstart", handleOutside);
    };
  }, [sectionOptionsMenu]);

  function updateSection(sectionId, updater) {
    setConfig((current) => {
      if (!current) return current;

      return {
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId ? updater(section) : section
        ),
      };
    });
  }

  function updateSectionOrder(nextOrderedSections) {
    setConfig((current) => {
      if (!current) return current;

      return {
        ...current,
        sections: nextOrderedSections.map((section, order) => ({
          ...section,
          order,
        })),
      };
    });
  }

  function reorderSections(sourceId, targetId) {
    setConfig((current) => {
      if (!current) return current;
      const ordered = [...current.sections].sort((a, b) => a.order - b.order);
      const reordered = reorderById(ordered, sourceId, targetId).map((section, order) => ({
        ...section,
        order,
      }));

      return {
        ...current,
        sections: reordered,
      };
    });
  }

  function moveSection(sectionId, direction) {
    if (!config) return;

    const ordered = [...config.sections].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((section) => section.id === sectionId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
      return;
    }

    const [moved] = ordered.splice(index, 1);
    ordered.splice(targetIndex, 0, moved);
    updateSectionOrder(ordered);
  }

  function removeSection(sectionId) {
    setConfig((current) => {
      if (!current) return current;

      const nextSections = current.sections
        .filter((section) => section.id !== sectionId)
        .sort((a, b) => a.order - b.order)
        .map((section, order) => ({ ...section, order }));

      return {
        ...current,
        sections: nextSections,
      };
    });

    if (selectedSectionId === sectionId) {
      setSelectedSectionId(null);
      setSelectedItemId(null);
    }

    if (sectionOptionsMenu?.sectionId === sectionId) {
      setSectionOptionsMenu(null);
    }
  }

  function addItem(sectionId) {
    const section = config?.sections.find((entry) => entry.id === sectionId);
    if (!section || !sectionSupportsItems(section.type)) return;

    const currentItems = Array.isArray(section.items) ? section.items : [];
    const nextItem = createDefaultItemForSection(section.type, currentItems.length);

    updateSection(sectionId, (section) => {
      const safeItems = Array.isArray(section.items) ? section.items : [];
      let nextItems = [];

      if (section.type === "COMMENTARY") {
        nextItems = [nextItem, ...safeItems].map((item, order) => ({
          ...item,
          order,
        }));
      } else {
        nextItems = [...safeItems, { ...nextItem, order: safeItems.length }];
      }

      return {
        ...section,
        items: nextItems,
      };
    });

    setSelectedSectionId(sectionId);
    setSelectedItemId(nextItem.id);
  }

  function reorderItems(sectionId, sourceItemId, targetItemId) {
    updateSection(sectionId, (section) => {
      const ordered = [...section.items].sort((a, b) => a.order - b.order);
      const reordered = reorderById(ordered, sourceItemId, targetItemId).map((item, order) => ({
        ...item,
        order,
      }));

      return {
        ...section,
        items: reordered,
      };
    });
  }

  function updateItem(sectionId, itemId, updater) {
    updateSection(sectionId, (section) => ({
      ...section,
      items: section.items.map((item) => (item.id === itemId ? updater(item) : item)),
    }));
  }

  function addFormField() {
    setConfig((current) => {
      if (!current) return current;

      const fieldId = createTempId("field");
      const nextField = {
        id: fieldId,
        key: `field_${current.formFields.length + 1}`,
        label: "New Field",
        type: "text",
        required: false,
        placeholder: "",
        options: [],
        order: current.formFields.length,
        isVisible: true,
      };

      return {
        ...current,
        formFields: [...current.formFields, nextField],
      };
    });
  }

  function reorderFormFields(sourceFieldId, targetFieldId) {
    setConfig((current) => {
      if (!current) return current;
      const ordered = [...current.formFields].sort((a, b) => a.order - b.order);
      const reordered = reorderById(ordered, sourceFieldId, targetFieldId).map((field, order) => ({
        ...field,
        order,
      }));

      return {
        ...current,
        formFields: reordered,
      };
    });
  }

  function moveFormField(fieldId, direction) {
    if (!config) return;
    const ordered = [...config.formFields].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((field) => field.id === fieldId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
      return;
    }

    reorderFormFields(fieldId, ordered[targetIndex].id);
  }

  function removeFormField(fieldId) {
    setConfig((current) => {
      if (!current) return current;

      const nextFields = current.formFields
        .filter((field) => field.id !== fieldId)
        .sort((a, b) => a.order - b.order)
        .map((field, order) => ({ ...field, order }));

      return {
        ...current,
        formFields: nextFields,
      };
    });

    if (selectedFormFieldId === fieldId) {
      setSelectedFormFieldId(null);
    }
  }

  function updateFormField(fieldId, updater) {
    setConfig((current) => {
      if (!current) return current;

      return {
        ...current,
        formFields: current.formFields.map((field) =>
          field.id === fieldId ? updater(field) : field
        ),
      };
    });
  }

  async function handleSave() {
    if (!config) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/landing-config", {
        method: "PUT",
        headers: createCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(config),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save.");
      }

      setConfig(payload.config);
      setSuccess("Landing page saved successfully.");
    } catch (saveError) {
      setError(saveError.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function addTemplateSection() {
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/landing-config", {
        method: "POST",
        headers: createCsrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ templateType }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to add section.");
      }

      setConfig(payload.config);
      setSuccess("Template section added.");
    } catch (addError) {
      setError(addError.message || "Failed to add section.");
    }
  }

  async function uploadFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/upload", {
      method: "POST",
      headers: createCsrfHeaders(),
      body: formData,
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Upload failed.");
    }

    return payload.url;
  }

  async function handleItemUpload(sectionId, itemId, file) {
    if (!file) return;

    setError("");

    try {
      const url = await uploadFile(file);
      updateItem(sectionId, itemId, (item) => ({ ...item, imageUrl: url }));
      setSuccess("Image uploaded.");
    } catch (uploadError) {
      setError(uploadError.message || "Upload failed.");
    }
  }

  async function handleSectionUpload(sectionId, settingKey, file) {
    if (!file) return;

    setError("");

    try {
      const url = await uploadFile(file);
      updateSection(sectionId, (section) => ({
        ...section,
        settings: {
          ...(section.settings || {}),
          [settingKey]: url,
        },
      }));
      setSuccess("Image uploaded.");
    } catch (uploadError) {
      setError(uploadError.message || "Upload failed.");
    }
  }

  function selectSection(sectionId) {
    setSelectedSectionId(sectionId);
    setSelectedItemId(null);
    setSelectedFormFieldId(null);
  }

  function selectItem(sectionId, itemId) {
    setSelectedSectionId(sectionId);
    setSelectedItemId(itemId);
    setSelectedFormFieldId(null);
  }

  function selectFormField(fieldId) {
    setSelectedItemId(null);
    setSelectedFormFieldId(fieldId);
  }

  function openSectionOptions(sectionId, position) {
    selectSection(sectionId);
    setSectionOptionsMenu({
      sectionId,
      ...clampContextMenuPosition(position),
    });
  }

  function closeSectionOptions() {
    setSectionOptionsMenu(null);
  }

  function handlePreviewSectionDrop(targetSectionId) {
    if (!dragSectionId) return;
    reorderSections(dragSectionId, targetSectionId);
    setDragSectionId(null);
  }

  function handlePreviewItemDrop(sectionId, targetItemId) {
    if (!dragItemRef || dragItemRef.sectionId !== sectionId) return;
    reorderItems(sectionId, dragItemRef.itemId, targetItemId);
    setDragItemRef(null);
  }

  function updateSectionTitleFromPreview(sectionId, value) {
    updateSection(sectionId, (current) => ({
      ...current,
      title: value,
    }));
  }

  function updateSectionSettingFromPreview(sectionId, key, value) {
    updateSection(sectionId, (current) => {
      const nextSettings = { ...(current.settings || {}) };

      if (key === "dynamicWords") {
        nextSettings.dynamicWords = toStringArray(value);
      } else if (key === "maxHomeItems") {
        const parsed = Number.parseInt(String(value), 10);
        nextSettings.maxHomeItems = Number.isFinite(parsed) ? Math.max(1, Math.min(24, parsed)) : 6;
      } else if (key === "textStyle") {
        nextSettings.textStyle = normalizeTextStyle(value);
      } else {
        nextSettings[key] = value;
      }

      return {
        ...current,
        settings: nextSettings,
      };
    });
  }

  function updateItemFromPreview(sectionId, itemId, key, value) {
    const section = config?.sections.find((entry) => entry.id === sectionId);

    updateItem(sectionId, itemId, (current) => {
      if (section?.type === "SERVICES_GRID" && key === "description") {
        return {
          ...current,
          description: clampServiceDescription(value),
        };
      }

      return {
        ...current,
        [key]: value,
      };
    });
  }

  function updateMenuTextStyle(nextPatch) {
    if (!menuSection) return;
    updateSectionSettingFromPreview(menuSection.id, "textStyle", {
      ...menuTextStyle,
      ...(nextPatch || {}),
    });
  }

  function updateFormFieldFromPreview(fieldId, key, value) {
    updateFormField(fieldId, (current) => ({
      ...current,
      [key]: value,
    }));
  }

  if (loading) {
    return <PageState status="loading" resourceLabel="landing configuration" />;
  }

  if (error && !config) {
    return <PageState status="error" errorMessage={error} onRetry={() => setReloadKey((current) => current + 1)} />;
  }

  if (!config) {
    return <PageState status="empty" resourceLabel="landing configuration" />;
  }

  return (
    <section className="landing-editor-shell landing-builder-shell">
      <div className="admin-page-card builder-topbar">
        <div>
          <h1>Landing Page Builder</h1>
          <p>Tap text to edit in place. Right-click or long-press any section for advanced settings.</p>
        </div>

        <div className="builder-topbar-controls">
          <label>
            Site Title
            <Input
              type="text"
              value={config.siteTitle}
              onChange={(event) =>
                setConfig((current) => ({
                  ...current,
                  siteTitle: event.target.value,
                }))
              }
            />
          </label>

          <div className="template-add-box">
            <label htmlFor="templateType">Add Section Template</label>
            <div>
              <SelectNative
                id="templateType"
                value={templateType}
                onChange={(event) => setTemplateType(event.target.value)}
              >
                {TEMPLATE_SECTIONS.map((template) => (
                  <option key={template.type} value={template.type}>
                    {template.label}
                  </option>
                ))}
              </SelectNative>
              <Button type="button" onClick={addTemplateSection}>
                Add
              </Button>
            </div>
          </div>

          <Button type="button" className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}
      </div>

      <div className="builder-workspace builder-workspace-single">
        <div className="section-editor-card builder-canvas builder-live-preview">
          <div className="builder-canvas-head">
            <h2>Live Landing Preview</h2>
            <p>Drag sections/items and tap text directly. Use right-click or long-press to open advanced options.</p>
          </div>

          <div className="builder-preview-frame">
            <PublicLanding
              config={config}
              editorMode
              selectedSectionId={selectedSectionId}
              selectedItemRef={
                selectedSectionId && selectedItemId
                  ? { sectionId: selectedSectionId, itemId: selectedItemId }
                  : null
              }
              selectedFormFieldId={selectedFormFieldId}
              onSelectSection={selectSection}
              onSelectItem={selectItem}
              onSelectFormField={selectFormField}
              onUpdateSectionTitle={updateSectionTitleFromPreview}
              onUpdateSectionSetting={updateSectionSettingFromPreview}
              onUpdateItemField={updateItemFromPreview}
              onUpdateFormField={updateFormFieldFromPreview}
              onUploadItemImage={handleItemUpload}
              onUploadSectionImage={handleSectionUpload}
              onRequestSectionOptions={openSectionOptions}
              onSectionDragStart={setDragSectionId}
              onSectionDrop={handlePreviewSectionDrop}
              onSectionDragEnd={() => setDragSectionId(null)}
              onItemDragStart={(sectionId, itemId) => setDragItemRef({ sectionId, itemId })}
              onItemDrop={handlePreviewItemDrop}
              onItemDragEnd={() => setDragItemRef(null)}
            />
          </div>
        </div>
      </div>

      {sectionOptionsMenu && menuSection ? (
        <>
          <Button
            type="button"
            className="section-context-backdrop"
            aria-label="Close section options"
            onClick={closeSectionOptions}
          />

          <div
            className="section-context-menu"
            ref={sectionOptionsRef}
            style={{ left: `${sectionOptionsMenu.x}px`, top: `${sectionOptionsMenu.y}px` }}
          >
            <div className="section-context-head">
              <div>
                <h3>{menuSection.title || "Section"}</h3>
                <p>{menuSection.type}</p>
              </div>
              <Button type="button" onClick={closeSectionOptions}>
                Close
              </Button>
            </div>

            <div className="section-context-actions">
              <Button type="button" onClick={() => moveSection(menuSection.id, "up")}>Move Up</Button>
              <Button type="button" onClick={() => moveSection(menuSection.id, "down")}>Move Down</Button>
              <Button
                type="button"
                onClick={() =>
                  updateSection(menuSection.id, (current) => ({
                    ...current,
                    isVisible: !current.isVisible,
                  }))
                }
              >
                {menuSection.isVisible ? "Hide" : "Show"}
              </Button>
              {sectionSupportsItems(menuSection.type) ? (
                <Button type="button" onClick={() => addItem(menuSection.id)}>Add Item</Button>
              ) : null}
              {menuSection.type === "CAMPAIGN_FORM" ? (
                <Button type="button" onClick={addFormField}>Add Form Field</Button>
              ) : null}
              <Button type="button" className="danger-btn" onClick={() => removeSection(menuSection.id)}>
                Remove Section
              </Button>
            </div>

            <div className="section-context-body">
              <div className="section-context-editor">
                <div className="section-context-group">
                  <h4 className="section-context-group-title">General</h4>
                  <div className="section-context-grid">
                <label className="field-full">
                  Section Title
                  <Input
                    type="text"
                    value={menuSection.title}
                    onChange={(event) =>
                      updateSection(menuSection.id, (current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Component Variant
                  <SelectNative
                    value={menuSection.componentVariant}
                    onChange={(event) =>
                      updateSection(menuSection.id, (current) => ({
                        ...current,
                        componentVariant: event.target.value,
                      }))
                    }
                  >
                    {COMPONENT_VARIANT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </SelectNative>
                </label>

                <label>
                  Text Animation
                  <SelectNative
                    value={menuSection.textAnimation}
                    onChange={(event) =>
                      updateSection(menuSection.id, (current) => ({
                        ...current,
                        textAnimation: event.target.value,
                      }))
                    }
                  >
                    {TEXT_ANIMATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </SelectNative>
                </label>

                <label>
                  Section Animation
                  <SelectNative
                    value={menuSection.sectionAnimation}
                    onChange={(event) =>
                      updateSection(menuSection.id, (current) => ({
                        ...current,
                        sectionAnimation: event.target.value,
                      }))
                    }
                  >
                    {SECTION_ANIMATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </SelectNative>
                </label>

                <label>
                  Scroll Animation
                  <SelectNative
                    value={menuSection.scrollAnimation}
                    onChange={(event) =>
                      updateSection(menuSection.id, (current) => ({
                        ...current,
                        scrollAnimation: event.target.value,
                      }))
                    }
                  >
                    {SCROLL_ANIMATION_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </SelectNative>
                </label>
                  </div>
                </div>

                <div className="section-context-group">
                  <h4 className="section-context-group-title">Text Style</h4>
                  <div className="section-context-grid">
                <label>
                  Font Size (px)
                  <Input
                    type="number"
                    min={12}
                    max={120}
                    value={menuTextStyle.fontSize ?? ""}
                    placeholder="Default"
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      updateMenuTextStyle({
                        fontSize: rawValue === "" ? null : rawValue,
                      });
                    }}
                  />
                </label>

                <label className="field-color">
                  Text Color
                  <Input
                    type="color"
                    value={menuTextStyle.color || "#10254e"}
                    onChange={(event) =>
                      updateMenuTextStyle({
                        color: event.target.value,
                      })
                    }
                  />
                </label>

                <label>
                  Bold
                  <SelectNative
                    value={menuTextStyle.bold ? "yes" : "no"}
                    onChange={(event) =>
                      updateMenuTextStyle({
                        bold: event.target.value === "yes",
                      })
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </SelectNative>
                </label>

                <label>
                  Italic
                  <SelectNative
                    value={menuTextStyle.italic ? "yes" : "no"}
                    onChange={(event) =>
                      updateMenuTextStyle({
                        italic: event.target.value === "yes",
                      })
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </SelectNative>
                </label>

                <label>
                  Underline
                  <SelectNative
                    value={menuTextStyle.underline ? "yes" : "no"}
                    onChange={(event) =>
                      updateMenuTextStyle({
                        underline: event.target.value === "yes",
                      })
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </SelectNative>
                </label>

                <label className="field-full">
                  Text Style Reset
                  <Button
                    type="button"
                    className="section-reset-btn"
                    onClick={() =>
                      updateSectionSettingFromPreview(menuSection.id, "textStyle", {
                        fontSize: null,
                        color: "",
                        bold: false,
                        italic: false,
                        underline: false,
                      })
                    }
                  >
                    Reset Text Style
                  </Button>
                </label>
                  </div>
                </div>

                {menuSection.type === "HERO" ? (
                  <div className="section-context-group">
                    <h4 className="section-context-group-title">Hero Content</h4>
                    <div className="section-context-grid">
                  <label className="field-full">
                    Static Hero Text
                    <Textarea
                      value={menuSection.settings?.staticText || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "staticText", event.target.value)
                      }
                    />
                  </label>

                  <label className="field-full">
                    Dynamic Words (comma or new line separated)
                    <Textarea
                      value={toStringArray(menuSection.settings?.dynamicWords).join("\n")}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "dynamicWords", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Primary CTA Text
                    <Input
                      type="text"
                      value={menuSection.settings?.primaryCtaText || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "primaryCtaText", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Primary CTA Link
                    <Input
                      type="text"
                      value={menuSection.settings?.primaryCtaLink || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "primaryCtaLink", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Secondary CTA Text
                    <Input
                      type="text"
                      value={menuSection.settings?.secondaryCtaText || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "secondaryCtaText", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Secondary CTA Link
                    <Input
                      type="text"
                      value={menuSection.settings?.secondaryCtaLink || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "secondaryCtaLink", event.target.value)
                      }
                    />
                  </label>
                    </div>
                  </div>
                ) : null}

                {menuSection.type === "SERVICES_GRID" ? (
                  <div className="section-context-group">
                    <h4 className="section-context-group-title">Services Settings</h4>
                    <div className="section-context-grid">
                  <label>
                    Home Service Limit
                    <Input
                      type="number"
                      min={1}
                      max={24}
                      value={menuSection.settings?.maxHomeItems || 6}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "maxHomeItems", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    See All Link
                    <Input
                      type="text"
                      value={menuSection.settings?.seeAllLink || "/services"}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "seeAllLink", event.target.value)
                      }
                    />
                  </label>

                  <label className="field-full">
                    See All Button Text
                    <Input
                      type="text"
                      value={menuSection.settings?.seeAllText || "See all services"}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "seeAllText", event.target.value)
                      }
                    />
                  </label>
                    </div>
                  </div>
                ) : null}

                {menuSection.type === "PRICING" ? (
                  <div className="section-context-group">
                    <h4 className="section-context-group-title">Pricing Settings</h4>
                    <div className="section-context-grid">
                  <label className="field-full">
                    Recommended Plan
                    <SelectNative
                      value={menuSection.settings?.recommendedPlanKey || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "recommendedPlanKey", event.target.value)
                      }
                    >
                      <option value="">None</option>
                      {menuSection.items.map((item) => {
                        const key = String(item.extra?.key || item.id || "");
                        return (
                          <option key={item.id} value={key}>
                            {item.title || "Untitled plan"}
                          </option>
                        );
                      })}
                    </SelectNative>
                  </label>
                    </div>
                  </div>
                ) : null}

                {menuSection.type === "FOOTER" ? (
                  <div className="section-context-group">
                    <h4 className="section-context-group-title">Footer Settings</h4>
                    <div className="section-context-grid">
                  <label className="field-full">
                    Brand Description
                    <Textarea
                      value={menuSection.settings?.brandDescription || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "brandDescription", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Contact Heading
                    <Input
                      type="text"
                      value={menuSection.settings?.contactHeading || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "contactHeading", event.target.value)
                      }
                    />
                  </label>

                  <label className="field-full">
                    Contact Email
                    <Input
                      type="email"
                      value={menuSection.settings?.contactEmail || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "contactEmail", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Contact Phone
                    <Input
                      type="text"
                      value={menuSection.settings?.contactPhone || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "contactPhone", event.target.value)
                      }
                    />
                  </label>

                  <label className="field-full">
                    Contact Address
                    <Textarea
                      value={menuSection.settings?.contactAddress || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "contactAddress", event.target.value)
                      }
                    />
                  </label>

                  <label className="field-full">
                    Support Hours
                    <Input
                      type="text"
                      value={menuSection.settings?.supportHours || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "supportHours", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Copyright Text
                    <Input
                      type="text"
                      value={menuSection.settings?.copyrightText || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "copyrightText", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Rights Text
                    <Input
                      type="text"
                      value={menuSection.settings?.rightsText || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "rightsText", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Footer CTA Text
                    <Input
                      type="text"
                      value={menuSection.settings?.ctaText || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "ctaText", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Footer CTA Link
                    <Input
                      type="text"
                      value={menuSection.settings?.ctaLink || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "ctaLink", event.target.value)
                      }
                    />
                  </label>
                    </div>
                  </div>
                ) : null}

                {menuSection.type === "CAMPAIGN_FORM" ? (
                  <div className="section-context-group">
                    <h4 className="section-context-group-title">Form Settings</h4>
                    <div className="section-context-grid">
                  <label>
                    Submit Button Text
                    <Input
                      type="text"
                      value={menuSection.settings?.submitText || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "submitText", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Success Message
                    <Input
                      type="text"
                      value={menuSection.settings?.successMessage || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "successMessage", event.target.value)
                      }
                    />
                  </label>
                    </div>
                  </div>
                ) : null}

                {menuSection.type === "CAMPAIGN_FORM" ? (
                  <div className="builder-subpanel">
                    <div className="builder-inline-head">
                      <h3>Form Field Controls</h3>
                      <Button type="button" onClick={addFormField}>Add Field</Button>
                    </div>

                {selectedFormField ? (
                  <div className="section-context-grid">
                    <label className="field-full">
                      Active Field
                      <SelectNative
                        value={selectedFormField.id}
                        onChange={(event) => setSelectedFormFieldId(event.target.value)}
                      >
                        {config.formFields
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((field) => (
                            <option key={field.id} value={field.id}>
                              {field.label || field.key}
                            </option>
                          ))}
                      </SelectNative>
                    </label>

                    <label>
                      Label
                      <Input
                        type="text"
                        value={selectedFormField.label}
                        onChange={(event) =>
                          updateFormField(selectedFormField.id, (field) => ({
                            ...field,
                            label: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      Key
                      <Input
                        type="text"
                        value={selectedFormField.key}
                        onChange={(event) =>
                          updateFormField(selectedFormField.id, (field) => ({
                            ...field,
                            key: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      Type
                      <SelectNative
                        value={selectedFormField.type}
                        onChange={(event) =>
                          updateFormField(selectedFormField.id, (field) => ({
                            ...field,
                            type: event.target.value,
                          }))
                        }
                      >
                        {FORM_FIELD_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </SelectNative>
                    </label>

                    <label>
                      Placeholder
                      <Input
                        type="text"
                        value={selectedFormField.placeholder || ""}
                        onChange={(event) =>
                          updateFormField(selectedFormField.id, (field) => ({
                            ...field,
                            placeholder: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      Required
                      <SelectNative
                        value={selectedFormField.required ? "yes" : "no"}
                        onChange={(event) =>
                          updateFormField(selectedFormField.id, (field) => ({
                            ...field,
                            required: event.target.value === "yes",
                          }))
                        }
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </SelectNative>
                    </label>

                    <label>
                      Visible
                      <SelectNative
                        value={selectedFormField.isVisible ? "yes" : "no"}
                        onChange={(event) =>
                          updateFormField(selectedFormField.id, (field) => ({
                            ...field,
                            isVisible: event.target.value === "yes",
                          }))
                        }
                      >
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </SelectNative>
                    </label>

                    {selectedFormField.type === "select" ? (
                      <label className="field-full">
                        Select Options (comma separated)
                        <Input
                          type="text"
                          value={Array.isArray(selectedFormField.options) ? selectedFormField.options.join(", ") : ""}
                          onChange={(event) =>
                            updateFormField(selectedFormField.id, (field) => ({
                              ...field,
                              options: event.target.value
                                .split(",")
                                .map((entry) => entry.trim())
                                .filter(Boolean),
                            }))
                          }
                        />
                      </label>
                    ) : null}
                  </div>
                ) : (
                  <p>No form fields yet.</p>
                )}

                    {selectedFormField ? (
                      <div className="section-context-actions">
                        <Button type="button" onClick={() => moveFormField(selectedFormField.id, "up")}>
                          Move Field Up
                        </Button>
                        <Button type="button" onClick={() => moveFormField(selectedFormField.id, "down")}>
                          Move Field Down
                        </Button>
                        <Button type="button" className="danger-btn" onClick={() => removeFormField(selectedFormField.id)}>
                          Remove Field
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <aside className="section-context-preview-panel">
                <div className="section-context-preview-head">
                  <div>
                    <h4>Live Draft Preview</h4>
                    <p>Unsaved edits update here instantly</p>
                  </div>
                  <Button
                    type="button"
                    className="section-context-preview-replay"
                    onClick={() => setPreviewReplayTick((current) => current + 1)}
                  >
                    Replay
                  </Button>
                </div>

                <div
                  key={menuPreviewKey}
                  className={`section-context-preview-canvas ${sectionPreviewAnimationClass(menuSection.sectionAnimation)} ${scrollAnimationClass(menuSection.scrollAnimation)}`.trim()}
                  style={menuPreviewTextVars}
                >
                  <span className="section-context-preview-type">{menuSection.type}</span>

                  <h5 className={`section-context-preview-title ${textAnimationClass(menuSection.textAnimation)}`.trim()}>
                    {menuPreview?.title || "Section preview"}
                    {menuPreview?.dynamicWord ? (
                      <>
                        {" "}
                        <span className="section-context-preview-dynamic">{menuPreview.dynamicWord}</span>
                      </>
                    ) : null}
                  </h5>

                  <p className="section-context-preview-copy">
                    {menuPreview?.body || "Preview your current draft settings before saving."}
                  </p>

                  <div className="section-context-preview-cta">
                    <Button type="button" className="section-context-preview-primary">
                      {menuPreview?.primaryCtaText || "Primary Action"}
                    </Button>
                    {menuPreview?.secondaryCtaText ? (
                      <Button type="button" className="section-context-preview-secondary">
                        {menuPreview.secondaryCtaText}
                      </Button>
                    ) : null}
                  </div>

                  <div className="section-context-preview-meta">
                    <span>{menuSection.textAnimation}</span>
                    <span>{menuSection.sectionAnimation}</span>
                    <span>{menuSection.scrollAnimation}</span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
