"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PublicLanding from "../PublicLanding";
import {
  COMPONENT_VARIANT_OPTIONS,
  FORM_FIELD_TYPES,
  SCROLL_ANIMATION_OPTIONS,
  SECTION_ANIMATION_OPTIONS,
  SERVICE_DESCRIPTION_MAX_WORDS,
  TEMPLATE_SECTIONS,
  TEXT_ANIMATION_OPTIONS,
} from "../../lib/constants";

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

  const menuWidth = 620;
  const menuHeight = 820;
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

export default function LandingEditor() {
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
  }, []);

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
    updateSection(sectionId, (section) => {
      const nextItemId = createTempId("item");
      const nextItems = [
        ...section.items,
        {
          id: nextItemId,
          order: section.items.length,
          label: "",
          title: "",
          description: "",
          imageUrl: "",
          value: "",
          extra: {
            key: createTempId("plan"),
          },
        },
      ];

      return {
        ...section,
        items: nextItems,
      };
    });

    setSelectedSectionId(sectionId);
    setSelectedItemId(null);
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
    return <section className="admin-page-card">Loading landing configuration...</section>;
  }

  if (!config) {
    return <section className="admin-page-card">No landing configuration found.</section>;
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
            <input
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
              <select
                id="templateType"
                value={templateType}
                onChange={(event) => setTemplateType(event.target.value)}
              >
                {TEMPLATE_SECTIONS.map((template) => (
                  <option key={template.type} value={template.type}>
                    {template.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={addTemplateSection}>
                Add
              </button>
            </div>
          </div>

          <button type="button" className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
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
          <button
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
              <button type="button" onClick={closeSectionOptions}>
                Close
              </button>
            </div>

            <div className="section-context-actions">
              <button type="button" onClick={() => moveSection(menuSection.id, "up")}>Move Up</button>
              <button type="button" onClick={() => moveSection(menuSection.id, "down")}>Move Down</button>
              <button
                type="button"
                onClick={() =>
                  updateSection(menuSection.id, (current) => ({
                    ...current,
                    isVisible: !current.isVisible,
                  }))
                }
              >
                {menuSection.isVisible ? "Hide" : "Show"}
              </button>
              <button type="button" onClick={() => addItem(menuSection.id)}>Add Item</button>
              {menuSection.type === "CAMPAIGN_FORM" ? (
                <button type="button" onClick={addFormField}>Add Form Field</button>
              ) : null}
              <button type="button" className="danger-btn" onClick={() => removeSection(menuSection.id)}>
                Remove Section
              </button>
            </div>

            <div className="section-context-group">
              <h4 className="section-context-group-title">General</h4>
              <div className="section-context-grid">
                <label className="field-full">
                  Section Title
                  <input
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
                  <select
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
                  </select>
                </label>

                <label>
                  Text Animation
                  <select
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
                  </select>
                </label>

                <label>
                  Section Animation
                  <select
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
                  </select>
                </label>

                <label>
                  Scroll Animation
                  <select
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
                  </select>
                </label>
              </div>
            </div>

            <div className="section-context-group">
              <h4 className="section-context-group-title">Text Style</h4>
              <div className="section-context-grid">
                <label>
                  Font Size (px)
                  <input
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
                  <input
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
                  <select
                    value={menuTextStyle.bold ? "yes" : "no"}
                    onChange={(event) =>
                      updateMenuTextStyle({
                        bold: event.target.value === "yes",
                      })
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>

                <label>
                  Italic
                  <select
                    value={menuTextStyle.italic ? "yes" : "no"}
                    onChange={(event) =>
                      updateMenuTextStyle({
                        italic: event.target.value === "yes",
                      })
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>

                <label>
                  Underline
                  <select
                    value={menuTextStyle.underline ? "yes" : "no"}
                    onChange={(event) =>
                      updateMenuTextStyle({
                        underline: event.target.value === "yes",
                      })
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>

                <label className="field-full">
                  Text Style Reset
                  <button
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
                  </button>
                </label>
              </div>
            </div>

            {menuSection.type === "HERO" ? (
              <div className="section-context-group">
                <h4 className="section-context-group-title">Hero Content</h4>
                <div className="section-context-grid">
                  <label className="field-full">
                    Static Hero Text
                    <textarea
                      value={menuSection.settings?.staticText || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "staticText", event.target.value)
                      }
                    />
                  </label>

                  <label className="field-full">
                    Dynamic Words (comma or new line separated)
                    <textarea
                      value={toStringArray(menuSection.settings?.dynamicWords).join("\n")}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "dynamicWords", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Primary CTA Text
                    <input
                      type="text"
                      value={menuSection.settings?.primaryCtaText || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "primaryCtaText", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Primary CTA Link
                    <input
                      type="text"
                      value={menuSection.settings?.primaryCtaLink || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "primaryCtaLink", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Secondary CTA Text
                    <input
                      type="text"
                      value={menuSection.settings?.secondaryCtaText || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "secondaryCtaText", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Secondary CTA Link
                    <input
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
                    <input
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
                    <input
                      type="text"
                      value={menuSection.settings?.seeAllLink || "/services"}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "seeAllLink", event.target.value)
                      }
                    />
                  </label>

                  <label className="field-full">
                    See All Button Text
                    <input
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
                    <select
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
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            {menuSection.type === "FOOTER" ? (
              <div className="section-context-group">
                <h4 className="section-context-group-title">Footer Settings</h4>
                <div className="section-context-grid">
                  <label className="field-full">
                    Contact Email
                    <input
                      type="email"
                      value={menuSection.settings?.contactEmail || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "contactEmail", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Footer CTA Text
                    <input
                      type="text"
                      value={menuSection.settings?.ctaText || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "ctaText", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Footer CTA Link
                    <input
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
                    <input
                      type="text"
                      value={menuSection.settings?.submitText || ""}
                      onChange={(event) =>
                        updateSectionSettingFromPreview(menuSection.id, "submitText", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    Success Message
                    <input
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
                  <button type="button" onClick={addFormField}>Add Field</button>
                </div>

                {selectedFormField ? (
                  <div className="section-context-grid">
                    <label className="field-full">
                      Active Field
                      <select
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
                      </select>
                    </label>

                    <label>
                      Label
                      <input
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
                      <input
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
                      <select
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
                      </select>
                    </label>

                    <label>
                      Placeholder
                      <input
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
                      <select
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
                      </select>
                    </label>

                    <label>
                      Visible
                      <select
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
                      </select>
                    </label>

                    {selectedFormField.type === "select" ? (
                      <label className="field-full">
                        Select Options (comma separated)
                        <input
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
                    <button type="button" onClick={() => moveFormField(selectedFormField.id, "up")}>
                      Move Field Up
                    </button>
                    <button type="button" onClick={() => moveFormField(selectedFormField.id, "down")}>
                      Move Field Down
                    </button>
                    <button type="button" className="danger-btn" onClick={() => removeFormField(selectedFormField.id)}>
                      Remove Field
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
