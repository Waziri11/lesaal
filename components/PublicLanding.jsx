"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

const SECTION_ANCHOR_BASES = {
  HERO: "top",
  STATS_BAND: "stats",
  CLIENT_LOGOS: "clients",
  SERVICES_GRID: "services-grid",
  COMMENTARY: "commentary",
  PRICING: "pricing",
  FAQ: "faq",
  CAMPAIGN_FORM: "campaign-form",
  FOOTER: "footer",
};

const LANDING_NAV_ITEMS = [
  { key: "home", label: "Home" },
  { key: "services", label: "Services", preferredTypes: ["SERVICES_GRID"] },
  { key: "campaigns", label: "Campaigns", preferredTypes: ["CAMPAIGN_FORM", "COMMENTARY"] },
  { key: "pricing", label: "Pricing", preferredTypes: ["PRICING"] },
  { key: "faq", label: "FAQ", preferredTypes: ["FAQ"] },
];

function getSectionMotion(preset) {
  if (preset === "NONE") {
    return {
      initial: { opacity: 0, y: 28 },
      whileInView: { opacity: 1, y: 0 },
      transition: { duration: 0.5, ease: "easeOut" },
      viewport: { once: true, amount: 0.15 },
    };
  }

  if (preset === "SCALE_IN") {
    return {
      initial: { opacity: 0, scale: 0.96 },
      whileInView: { opacity: 1, scale: 1 },
      transition: { duration: 0.55, ease: "easeOut" },
      viewport: { once: true, amount: 0.2 },
    };
  }

  if (preset === "SLIDE_UP") {
    return {
      initial: { opacity: 0, y: 48 },
      whileInView: { opacity: 1, y: 0 },
      transition: { duration: 0.55, ease: "easeOut" },
      viewport: { once: true, amount: 0.2 },
    };
  }

  if (preset === "FADE_IN") {
    return {
      initial: { opacity: 0 },
      whileInView: { opacity: 1 },
      transition: { duration: 0.5, ease: "easeOut" },
      viewport: { once: true, amount: 0.2 },
    };
  }

  return {};
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

function toOptionsArray(options) {
  return Array.isArray(options) ? options : [];
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

function textStyleToCssVars(value) {
  const raw = value && typeof value === "object" ? value : {};
  const vars = {};
  const parsedSize = Number.parseInt(String(raw.fontSize ?? ""), 10);
  const color = normalizeHexColor(raw.color);

  if (Number.isFinite(parsedSize)) {
    vars["--lp-text-size"] = `${Math.max(12, Math.min(120, parsedSize))}px`;
  }

  if (color) {
    vars["--lp-text-color"] = color;
  }

  if (raw.bold) {
    vars["--lp-text-weight"] = "700";
  }

  if (raw.italic) {
    vars["--lp-text-style"] = "italic";
  }

  if (raw.underline) {
    vars["--lp-text-decoration"] = "underline";
  }

  return vars;
}

function EditableText({
  editorMode,
  value,
  fallback = "",
  className = "",
  as = "span",
  style,
  multiline = false,
  placeholder = "Tap to edit text",
  onCommit,
  onActivate,
}) {
  const Tag = as;
  const resolvedValue = value ?? fallback ?? "";
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(resolvedValue);

  useEffect(() => {
    if (!isEditing) {
      setDraft(resolvedValue);
    }
  }, [resolvedValue, isEditing]);

  function commit(nextValue = draft) {
    setIsEditing(false);

    if (typeof onCommit === "function" && nextValue !== resolvedValue) {
      onCommit(nextValue);
    }
  }

  function cancel() {
    setDraft(resolvedValue);
    setIsEditing(false);
  }

  if (!editorMode) {
    return <Tag className={`${className} live-editable-text`.trim()} style={style}>{resolvedValue}</Tag>;
  }

  if (isEditing) {
    if (multiline) {
      return (
        <textarea
          className={`live-editable-input live-editable-input-multi ${className}`.trim()}
          style={style}
          value={draft}
          autoFocus
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit()}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              commit();
            }

            if (event.key === "Escape") {
              cancel();
            }
          }}
        />
      );
    }

    return (
      <input
        className={`live-editable-input ${className}`.trim()}
        style={style}
        value={draft}
        autoFocus
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
          }

          if (event.key === "Escape") {
            cancel();
          }
        }}
      />
    );
  }

  return (
    <Tag
      className={`${className} live-editable-text`.trim()}
      style={style}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onActivate?.();
        setIsEditing(true);
      }}
    >
      {resolvedValue || placeholder}
    </Tag>
  );
}

function InlineImageUploader({ label, onUpload }) {
  return (
    <label
      className="image-replace-control"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {label}
      <input
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          onUpload(file);
          event.target.value = "";
        }}
      />
    </label>
  );
}

export default function PublicLanding({
  config,
  editorMode = false,
  selectedSectionId = null,
  selectedItemRef = null,
  selectedFormFieldId = null,
  onSelectSection,
  onSelectItem,
  onSelectFormField,
  onUpdateSectionTitle,
  onUpdateSectionSetting,
  onUpdateItemField,
  onUpdateFormField,
  onUploadItemImage,
  onUploadSectionImage,
  onRequestSectionOptions,
  onSectionDragStart,
  onSectionDrop,
  onSectionDragEnd,
  onItemDragStart,
  onItemDrop,
  onItemDragEnd,
}) {
  const [formData, setFormData] = useState({});
  const [formLoading, setFormLoading] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [activeFaqItemId, setActiveFaqItemId] = useState(null);
  const [dynamicWordIndex, setDynamicWordIndex] = useState(0);
  const [typedDynamicWord, setTypedDynamicWord] = useState("");
  const [isDeletingDynamicWord, setIsDeletingDynamicWord] = useState(false);
  const longPressTimerRef = useRef(null);

  const visibleSections = useMemo(
    () => config.sections.filter((section) => section.isVisible).sort((a, b) => a.order - b.order),
    [config.sections]
  );

  const heroSection = useMemo(
    () => visibleSections.find((section) => section.type === "HERO") || null,
    [visibleSections]
  );

  const statsBandSection = useMemo(
    () => visibleSections.find((section) => section.type === "STATS_BAND") || null,
    [visibleSections]
  );

  const sectionAnchors = useMemo(() => {
    const counts = {};
    const anchorsById = {};

    for (const section of visibleSections) {
      const base = SECTION_ANCHOR_BASES[section.type] || `section-${section.id}`;
      const count = counts[base] || 0;
      counts[base] = count + 1;
      anchorsById[section.id] = count === 0 ? base : `${base}-${count + 1}`;
    }

    return anchorsById;
  }, [visibleSections]);

  const navigationLinks = useMemo(() => {
    const firstSectionByType = new Map();
    for (const section of visibleSections) {
      if (!firstSectionByType.has(section.type)) {
        firstSectionByType.set(section.type, section);
      }
    }

    const homeSection = firstSectionByType.get("HERO") || visibleSections[0] || null;
    const links = [];

    for (const item of LANDING_NAV_ITEMS) {
      if (item.key === "home") {
        links.push({
          key: item.key,
          label: item.label,
          href: "#top",
          sectionId: homeSection?.id || null,
        });
        continue;
      }

      const targetSection = (item.preferredTypes || [])
        .map((type) => firstSectionByType.get(type))
        .find(Boolean);

      if (!targetSection) {
        continue;
      }

      links.push({
        key: item.key,
        label: item.label,
        href: `#${sectionAnchors[targetSection.id]}`,
        sectionId: targetSection.id,
      });
    }

    return links;
  }, [sectionAnchors, visibleSections]);

  const campaignFields = useMemo(
    () => config.formFields.filter((field) => field.isVisible).sort((a, b) => a.order - b.order),
    [config.formFields]
  );

  const heroDynamicWords = useMemo(
    () => toStringArray(heroSection?.settings?.dynamicWords),
    [heroSection]
  );

  const heroRotationWords = useMemo(() => {
    const fallbackWords = ["Social media management", "SEO optimization"];
    return heroDynamicWords.length ? heroDynamicWords : fallbackWords;
  }, [heroDynamicWords]);

  useEffect(() => {
    setDynamicWordIndex(0);
    setTypedDynamicWord("");
    setIsDeletingDynamicWord(false);
  }, [heroSection?.id]);

  useEffect(() => {
    if (!heroRotationWords.length) {
      setDynamicWordIndex(0);
      setTypedDynamicWord("");
      setIsDeletingDynamicWord(false);
      return undefined;
    }

    const currentWord = heroRotationWords[dynamicWordIndex % heroRotationWords.length] || "";

    if (editorMode) {
      setTypedDynamicWord(currentWord);
      setIsDeletingDynamicWord(false);
      return undefined;
    }

    const baseTypingSpeed = isDeletingDynamicWord ? 45 : 85;
    let timer;

    if (!isDeletingDynamicWord && typedDynamicWord.length < currentWord.length) {
      timer = setTimeout(() => {
        setTypedDynamicWord(currentWord.slice(0, typedDynamicWord.length + 1));
      }, baseTypingSpeed);
    } else if (!isDeletingDynamicWord && typedDynamicWord.length === currentWord.length) {
      timer = setTimeout(() => {
        setIsDeletingDynamicWord(true);
      }, 950);
    } else if (isDeletingDynamicWord && typedDynamicWord.length > 0) {
      timer = setTimeout(() => {
        setTypedDynamicWord(currentWord.slice(0, typedDynamicWord.length - 1));
      }, 35);
    } else {
      timer = setTimeout(() => {
        setIsDeletingDynamicWord(false);
        setDynamicWordIndex((current) => (current + 1) % heroRotationWords.length);
      }, 220);
    }

    return () => clearTimeout(timer);
  }, [dynamicWordIndex, editorMode, heroRotationWords, isDeletingDynamicWord, typedDynamicWord]);

  useEffect(() => {
    const faqSection = visibleSections.find((section) => section.type === "FAQ");
    if (!faqSection || !faqSection.items.length) {
      setActiveFaqItemId(null);
      return;
    }

    if (!faqSection.items.some((item) => item.id === activeFaqItemId)) {
      setActiveFaqItemId(faqSection.items[0].id);
    }
  }, [visibleSections, activeFaqItemId]);

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  useEffect(() => () => clearLongPressTimer(), []);

  function requestSectionOptions(sectionId, x, y) {
    if (!editorMode) return;

    onSelectSection?.(sectionId);
    onRequestSectionOptions?.(sectionId, { x, y });
  }

  function handleItemImageUpload(sectionId, itemId, file) {
    if (!file || !editorMode) return;

    onSelectSection?.(sectionId);
    onSelectItem?.(sectionId, itemId);
    onUploadItemImage?.(sectionId, itemId, file);
  }

  function handleSectionImageUpload(sectionId, settingKey, file) {
    if (!file || !editorMode) return;

    onSelectSection?.(sectionId);
    onUploadSectionImage?.(sectionId, settingKey, file);
  }

  function getSectionProps(sectionId) {
    const isSelected = editorMode && selectedSectionId === sectionId;

    if (!editorMode) {
      return {
        className: "",
      };
    }

    return {
      className: isSelected ? " is-editor-selected" : "",
      draggable: true,
      onClick: (event) => {
        event.preventDefault();
        onSelectSection?.(sectionId);
      },
      onDragStart: () => {
        onSectionDragStart?.(sectionId);
      },
      onDragOver: (event) => {
        event.preventDefault();
      },
      onDrop: (event) => {
        event.preventDefault();
        onSectionDrop?.(sectionId);
      },
      onDragEnd: () => {
        onSectionDragEnd?.();
      },
      onContextMenu: (event) => {
        event.preventDefault();
        event.stopPropagation();
        requestSectionOptions(sectionId, event.clientX, event.clientY);
      },
      onTouchStart: (event) => {
        const touch = event.touches?.[0];
        if (!touch) return;

        clearLongPressTimer();
        longPressTimerRef.current = setTimeout(() => {
          requestSectionOptions(sectionId, touch.clientX, touch.clientY);
          clearLongPressTimer();
        }, 520);
      },
      onTouchEnd: () => clearLongPressTimer(),
      onTouchMove: () => clearLongPressTimer(),
      onTouchCancel: () => clearLongPressTimer(),
    };
  }

  function getItemProps(sectionId, itemId) {
    const isSelected =
      editorMode &&
      selectedItemRef &&
      selectedItemRef.sectionId === sectionId &&
      selectedItemRef.itemId === itemId;

    if (!editorMode) {
      return {
        className: "",
      };
    }

    return {
      className: isSelected ? " is-editor-selected" : "",
      draggable: true,
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelectSection?.(sectionId);
        onSelectItem?.(sectionId, itemId);
      },
      onDragStart: (event) => {
        event.stopPropagation();
        onItemDragStart?.(sectionId, itemId);
      },
      onDragOver: (event) => {
        event.preventDefault();
        event.stopPropagation();
      },
      onDrop: (event) => {
        event.preventDefault();
        event.stopPropagation();
        onItemDrop?.(sectionId, itemId);
      },
      onDragEnd: () => {
        onItemDragEnd?.();
      },
    };
  }

  function handleFormFieldSelect(sectionId, fieldId, event) {
    if (!editorMode) return;

    event.preventDefault();
    event.stopPropagation();
    onSelectSection?.(sectionId);
    onSelectFormField?.(fieldId);
  }

  function handlePreviewLinkClick(event, sectionId) {
    if (!editorMode) {
      return;
    }

    event.preventDefault();
    if (sectionId) {
      onSelectSection?.(sectionId);
    }
  }

  function setFormValue(fieldKey, value) {
    if (editorMode) return;

    setFormData((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  }

  function renderItemText(sectionId, item, field, fallbackText, multiline = false) {
    const textValue = item?.[field] || "";

    return (
      <EditableText
        editorMode={editorMode}
        value={textValue}
        fallback={fallbackText}
        multiline={multiline}
        onActivate={() => {
          onSelectSection?.(sectionId);
          onSelectItem?.(sectionId, item.id);
        }}
        onCommit={(nextValue) => onUpdateItemField?.(sectionId, item.id, field, nextValue)}
      />
    );
  }

  async function handleCampaignSubmit(event) {
    event.preventDefault();

    if (editorMode) {
      setFormError("");
      setFormMessage("Preview mode: form submission is disabled while editing.");
      return;
    }

    setFormLoading(true);
    setFormMessage("");
    setFormError("");

    try {
      const response = await fetch("/api/public/campaign-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: formData }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Submission failed.");
      }

      setFormMessage(payload.message || "Submission received.");
      setFormData({});
    } catch (submitError) {
      setFormError(submitError.message || "Submission failed.");
    } finally {
      setFormLoading(false);
    }
  }

  function renderSectionHeading(section, textClass) {
    const settings = section.settings || {};

    return (
      <div className="lp-section-heading">
        <EditableText
          editorMode={editorMode}
          as="h2"
          className={textClass}
          value={settings.heading || ""}
          fallback={section.title}
          onActivate={() => onSelectSection?.(section.id)}
          onCommit={(nextValue) => onUpdateSectionSetting?.(section.id, "heading", nextValue)}
        />
        <EditableText
          editorMode={editorMode}
          as="p"
          className={`lp-section-copy ${textClass}`}
          value={settings.subheading || settings.body || settings.description || ""}
          fallback="Tap to edit this section intro."
          multiline
          onActivate={() => onSelectSection?.(section.id)}
          onCommit={(nextValue) => onUpdateSectionSetting?.(section.id, "subheading", nextValue)}
        />
      </div>
    );
  }

  return (
    <div className={`lp-shell${editorMode ? " is-editor-preview" : ""}`}>
      <header className="lp-header">
        <a href="#top" className="lp-brand" onClick={(event) => handlePreviewLinkClick(event)}>
          <img src="/images/logo/LESAAL.png" alt="Lesaal logo" />
          <span>Lesaal</span>
        </a>

        <nav className="lp-nav">
          {navigationLinks.map((link) => (
            <a
              key={link.key}
              href={link.href}
              onClick={(event) => handlePreviewLinkClick(event, link.sectionId)}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="lp-header-actions">
          {editorMode ? (
            <span className="public-admin-login is-preview-badge">Live Preview</span>
          ) : (
            <>
              <a href="/admin/login" className="lp-action-link lp-action-login">
                Log in
              </a>
              <a href="/signup" className="lp-action-link lp-action-signup">
                Sign up
              </a>
            </>
          )}
        </div>
      </header>

      <main className="lp-main">
        {visibleSections.map((section) => {
          const settings = section.settings || {};
          const textClass = textAnimationClass(section.textAnimation);
          const scrollClass = scrollAnimationClass(section.scrollAnimation);
          const sectionMotion = editorMode ? {} : getSectionMotion(section.sectionAnimation);
          const sectionProps = getSectionProps(section.id);
          const anchorId = sectionAnchors[section.id];
          const sectionTextVars = textStyleToCssVars(settings.textStyle);

          if (section.type === "HERO") {
            const heroWords = heroRotationWords.length ? heroRotationWords : ["Social media management"];
            const activeWordIndex = dynamicWordIndex % heroWords.length;
            const currentWord = heroWords[activeWordIndex] || "";
            const displayedDynamicWord = editorMode ? currentWord : typedDynamicWord;
            const heroStatsItems = (statsBandSection?.items || []).slice().sort((a, b) => a.order - b.order).slice(0, 2);
            const statPrimaryItem = heroStatsItems[0] || null;
            const statSecondaryItem = heroStatsItems[1] || null;

            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-hero ${scrollClass}${sectionProps.className}`}
                {...sectionMotion}
                style={sectionTextVars}
                draggable={sectionProps.draggable}
                onClick={sectionProps.onClick}
                onDragStart={sectionProps.onDragStart}
                onDragOver={sectionProps.onDragOver}
                onDrop={sectionProps.onDrop}
                onDragEnd={sectionProps.onDragEnd}
                onContextMenu={sectionProps.onContextMenu}
                onTouchStart={sectionProps.onTouchStart}
                onTouchEnd={sectionProps.onTouchEnd}
                onTouchMove={sectionProps.onTouchMove}
                onTouchCancel={sectionProps.onTouchCancel}
              >
                <div className="lp-hero-background">
                  {settings.imageUrl ? (
                    <img src={settings.imageUrl} alt="Marketing growth visual" />
                  ) : (
                    <div className="lp-image-placeholder">No image selected</div>
                  )}

                  {editorMode ? (
                    <InlineImageUploader
                      label={settings.imageUrl ? "Replace Image" : "Add Image"}
                      onUpload={(file) => handleSectionImageUpload(section.id, "imageUrl", file)}
                    />
                  ) : null}
                </div>

                <div className="lp-hero-content">
                  <h1 className={`lp-hero-headline ${textClass}`}>
                    <EditableText
                      editorMode={editorMode}
                      as="span"
                      className="lp-hero-headline-static"
                      value={settings.staticText || ""}
                      fallback="Let us help you grow your reach through"
                      multiline
                      onActivate={() => onSelectSection?.(section.id)}
                      onCommit={(nextValue) => onUpdateSectionSetting?.(section.id, "staticText", nextValue)}
                    />
                    {" "}
                    <span className={`lp-hero-headline-dynamic${editorMode ? "" : " is-type-active"}`}>
                      <EditableText
                        editorMode={editorMode}
                        as="span"
                        value={displayedDynamicWord}
                        fallback="Social media management"
                        onActivate={() => onSelectSection?.(section.id)}
                        onCommit={(nextValue) => {
                          const nextWords = [...heroWords];
                          nextWords[activeWordIndex] = nextValue;
                          onUpdateSectionSetting?.(section.id, "dynamicWords", nextWords);
                        }}
                      />
                    </span>
                  </h1>

                  {editorMode ? <p className="lp-hero-type-indicator">Dynamic text is editable.</p> : null}

                  <EditableText
                    editorMode={editorMode}
                    as="p"
                    className={`lp-hero-description ${textClass}`}
                    value={settings.description || settings.body || ""}
                    fallback="Add a short value proposition for your homepage hero."
                    multiline
                    onActivate={() => onSelectSection?.(section.id)}
                    onCommit={(nextValue) => onUpdateSectionSetting?.(section.id, "description", nextValue)}
                  />

                  <div className="lp-hero-actions">
                    <a
                      href={settings.primaryCtaLink || "#campaign-form"}
                      className="lp-btn lp-btn-primary"
                      onClick={(event) => handlePreviewLinkClick(event, section.id)}
                    >
                      <EditableText
                        editorMode={editorMode}
                        value={settings.primaryCtaText || ""}
                        fallback="Start your free trial"
                        onActivate={() => onSelectSection?.(section.id)}
                        onCommit={(nextValue) => onUpdateSectionSetting?.(section.id, "primaryCtaText", nextValue)}
                      />
                    </a>

                    <a
                      href={settings.secondaryCtaLink || "#services-grid"}
                      className="lp-btn lp-btn-ghost"
                      onClick={(event) => handlePreviewLinkClick(event, section.id)}
                    >
                      <EditableText
                        editorMode={editorMode}
                        value={settings.secondaryCtaText || ""}
                        fallback="Demo"
                        onActivate={() => onSelectSection?.(section.id)}
                        onCommit={(nextValue) => onUpdateSectionSetting?.(section.id, "secondaryCtaText", nextValue)}
                      />
                    </a>
                  </div>

                  <div className="lp-hero-proof">
                    <div className="lp-proof-avatars" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>

                    <p>
                      {statSecondaryItem
                        ? renderItemText(statsBandSection.id, statSecondaryItem, "description", "From 250+ reviews")
                        : "From 250+ reviews"}
                    </p>
                  </div>
                </div>

                <div className="lp-hero-floating-card">
                  <p>Today&apos;s revenue</p>
                  <strong>
                    {statPrimaryItem
                      ? renderItemText(statsBandSection.id, statPrimaryItem, "title", "$1,280")
                      : "$1,280"}
                  </strong>
                  <span>
                    {statPrimaryItem
                      ? renderItemText(statsBandSection.id, statPrimaryItem, "description", "Performance metric")
                      : "Performance metric"}
                  </span>
                </div>
              </motion.section>
            );
          }

          if (section.type === "STATS_BAND") {
            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-stats-band ${scrollClass}${sectionProps.className}`}
                {...sectionMotion}
                style={sectionTextVars}
                draggable={sectionProps.draggable}
                onClick={sectionProps.onClick}
                onDragStart={sectionProps.onDragStart}
                onDragOver={sectionProps.onDragOver}
                onDrop={sectionProps.onDrop}
                onDragEnd={sectionProps.onDragEnd}
                onContextMenu={sectionProps.onContextMenu}
                onTouchStart={sectionProps.onTouchStart}
                onTouchEnd={sectionProps.onTouchEnd}
                onTouchMove={sectionProps.onTouchMove}
                onTouchCancel={sectionProps.onTouchCancel}
              >
                <div className="lp-section-heading center">
                  <EditableText
                    editorMode={editorMode}
                    as="h2"
                    className={textClass}
                    value={settings.heading || ""}
                    fallback="Build Something Great"
                    onActivate={() => onSelectSection?.(section.id)}
                    onCommit={(nextValue) => onUpdateSectionSetting?.(section.id, "heading", nextValue)}
                  />
                  <EditableText
                    editorMode={editorMode}
                    as="p"
                    className={`lp-section-copy ${textClass}`}
                    value={settings.subheading || ""}
                    fallback="Everything you need to build modern UI and great products."
                    multiline
                    onActivate={() => onSelectSection?.(section.id)}
                    onCommit={(nextValue) => onUpdateSectionSetting?.(section.id, "subheading", nextValue)}
                  />
                </div>

                <div className="lp-stats-grid">
                  {section.items.map((item) => {
                    const itemProps = getItemProps(section.id, item.id);
                    return (
                      <article
                        key={item.id}
                        className={`lp-stat-card${itemProps.className}`}
                        draggable={itemProps.draggable}
                        onClick={itemProps.onClick}
                        onDragStart={itemProps.onDragStart}
                        onDragOver={itemProps.onDragOver}
                        onDrop={itemProps.onDrop}
                        onDragEnd={itemProps.onDragEnd}
                      >
                        <h3>{renderItemText(section.id, item, "title", "400+")}</h3>
                        <p>{renderItemText(section.id, item, "description", "Metric label")}</p>
                      </article>
                    );
                  })}
                </div>
              </motion.section>
            );
          }

          if (section.type === "CLIENT_LOGOS") {
            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-clients ${scrollClass}${sectionProps.className}`}
                {...sectionMotion}
                style={sectionTextVars}
                draggable={sectionProps.draggable}
                onClick={sectionProps.onClick}
                onDragStart={sectionProps.onDragStart}
                onDragOver={sectionProps.onDragOver}
                onDrop={sectionProps.onDrop}
                onDragEnd={sectionProps.onDragEnd}
                onContextMenu={sectionProps.onContextMenu}
                onTouchStart={sectionProps.onTouchStart}
                onTouchEnd={sectionProps.onTouchEnd}
                onTouchMove={sectionProps.onTouchMove}
                onTouchCancel={sectionProps.onTouchCancel}
              >
                {renderSectionHeading(section, textClass)}

                <div className="lp-client-grid">
                  {section.items.map((item) => {
                    const itemProps = getItemProps(section.id, item.id);

                    return (
                      <article
                        key={item.id}
                        className={`lp-client-card${itemProps.className}`}
                        draggable={itemProps.draggable}
                        onClick={itemProps.onClick}
                        onDragStart={itemProps.onDragStart}
                        onDragOver={itemProps.onDragOver}
                        onDrop={itemProps.onDrop}
                        onDragEnd={itemProps.onDragEnd}
                      >
                        <div className="lp-client-logo-wrap">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={`${item.title || "Client"} logo`} />
                          ) : (
                            <div className="lp-image-placeholder">No logo</div>
                          )}

                          {editorMode ? (
                            <InlineImageUploader
                              label={item.imageUrl ? "Replace Logo" : "Add Logo"}
                              onUpload={(file) => handleItemImageUpload(section.id, item.id, file)}
                            />
                          ) : null}
                        </div>
                        <h4>{renderItemText(section.id, item, "title", "Client Name")}</h4>
                      </article>
                    );
                  })}
                </div>
              </motion.section>
            );
          }

          if (section.type === "SERVICES_GRID") {
            const maxHomeItems = Math.max(1, Number.parseInt(String(settings.maxHomeItems || 6), 10) || 6);
            const servicesToRender = editorMode
              ? section.items.slice().sort((a, b) => a.order - b.order)
              : section.items.slice().sort((a, b) => a.order - b.order).slice(0, maxHomeItems);

            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-services ${scrollClass}${sectionProps.className}`}
                {...sectionMotion}
                style={sectionTextVars}
                draggable={sectionProps.draggable}
                onClick={sectionProps.onClick}
                onDragStart={sectionProps.onDragStart}
                onDragOver={sectionProps.onDragOver}
                onDrop={sectionProps.onDrop}
                onDragEnd={sectionProps.onDragEnd}
                onContextMenu={sectionProps.onContextMenu}
                onTouchStart={sectionProps.onTouchStart}
                onTouchEnd={sectionProps.onTouchEnd}
                onTouchMove={sectionProps.onTouchMove}
                onTouchCancel={sectionProps.onTouchCancel}
              >
                {renderSectionHeading(section, textClass)}

                <div className="lp-services-grid">
                  {servicesToRender.map((item) => {
                    const itemProps = getItemProps(section.id, item.id);
                    const tags = Array.isArray(item.extra?.tags) ? item.extra.tags : [];

                    return (
                      <article
                        key={item.id}
                        className={`lp-service-card${itemProps.className}`}
                        draggable={itemProps.draggable}
                        onClick={itemProps.onClick}
                        onDragStart={itemProps.onDragStart}
                        onDragOver={itemProps.onDragOver}
                        onDrop={itemProps.onDrop}
                        onDragEnd={itemProps.onDragEnd}
                      >
                        <div className="lp-service-image-wrap">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title || "Service image"} />
                          ) : (
                            <div className="lp-image-placeholder">No image</div>
                          )}

                          <div className="lp-service-overlay">
                            <h3>{renderItemText(section.id, item, "title", "Service title")}</h3>
                            <p>{renderItemText(section.id, item, "description", "Service description", true)}</p>
                          </div>

                          {editorMode ? (
                            <InlineImageUploader
                              label={item.imageUrl ? "Replace Image" : "Add Image"}
                              onUpload={(file) => handleItemImageUpload(section.id, item.id, file)}
                            />
                          ) : null}
                        </div>
                        {tags.length ? (
                          <div className="lp-tag-row">
                            {tags.map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>

                <div className="lp-section-actions">
                  <a
                    href={settings.seeAllLink || "/services"}
                    className="lp-btn lp-btn-primary"
                    onClick={(event) => handlePreviewLinkClick(event, section.id)}
                  >
                    <EditableText
                      editorMode={editorMode}
                      value={settings.seeAllText || ""}
                      fallback="See all services"
                      onActivate={() => onSelectSection?.(section.id)}
                      onCommit={(nextValue) => onUpdateSectionSetting?.(section.id, "seeAllText", nextValue)}
                    />
                  </a>
                </div>
              </motion.section>
            );
          }

          if (section.type === "COMMENTARY") {
            const commentaryItem = section.items[0];

            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-commentary ${scrollClass}${sectionProps.className}`}
                {...sectionMotion}
                style={sectionTextVars}
                draggable={sectionProps.draggable}
                onClick={sectionProps.onClick}
                onDragStart={sectionProps.onDragStart}
                onDragOver={sectionProps.onDragOver}
                onDrop={sectionProps.onDrop}
                onDragEnd={sectionProps.onDragEnd}
                onContextMenu={sectionProps.onContextMenu}
                onTouchStart={sectionProps.onTouchStart}
                onTouchEnd={sectionProps.onTouchEnd}
                onTouchMove={sectionProps.onTouchMove}
                onTouchCancel={sectionProps.onTouchCancel}
              >
                {renderSectionHeading(section, textClass)}

                <div className="lp-commentary-stage">
                  <div className="lp-commentary-background">
                    {commentaryItem?.imageUrl ? (
                      <img src={commentaryItem.imageUrl} alt={commentaryItem.title || "Client commentary"} />
                    ) : (
                      <div className="lp-image-placeholder">No image</div>
                    )}

                    {editorMode && commentaryItem ? (
                      <InlineImageUploader
                        label={commentaryItem.imageUrl ? "Replace Image" : "Add Image"}
                        onUpload={(file) => handleItemImageUpload(section.id, commentaryItem.id, file)}
                      />
                    ) : null}
                  </div>

                  <div className="lp-commentary-quote">
                    {commentaryItem ? (
                      <>
                        <blockquote>{renderItemText(section.id, commentaryItem, "description", "Client quote", true)}</blockquote>
                        <p className="lp-commentary-name">
                          {renderItemText(section.id, commentaryItem, "title", "Client Name")}
                        </p>
                        <p className="lp-commentary-role">
                          {renderItemText(section.id, commentaryItem, "label", "Role")}
                        </p>
                        <div className="lp-commentary-arrows" aria-hidden="true">
                          <span>←</span>
                          <span>→</span>
                        </div>
                      </>
                    ) : (
                      <p>No commentary item yet.</p>
                    )}
                  </div>
                </div>
              </motion.section>
            );
          }

          if (section.type === "PRICING") {
            const recommendedKey = String(settings.recommendedPlanKey || "").trim();

            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-pricing ${scrollClass}${sectionProps.className}`}
                {...sectionMotion}
                style={sectionTextVars}
                draggable={sectionProps.draggable}
                onClick={sectionProps.onClick}
                onDragStart={sectionProps.onDragStart}
                onDragOver={sectionProps.onDragOver}
                onDrop={sectionProps.onDrop}
                onDragEnd={sectionProps.onDragEnd}
                onContextMenu={sectionProps.onContextMenu}
                onTouchStart={sectionProps.onTouchStart}
                onTouchEnd={sectionProps.onTouchEnd}
                onTouchMove={sectionProps.onTouchMove}
                onTouchCancel={sectionProps.onTouchCancel}
              >
                {renderSectionHeading(section, textClass)}

                <div className="lp-pricing-toggle" aria-hidden="true">
                  <span className="is-active">Monthly billing</span>
                  <span>Annual billing</span>
                  <span>Save 30%</span>
                </div>

                <div className="lp-pricing-grid">
                  {section.items.map((item) => {
                    const itemProps = getItemProps(section.id, item.id);
                    const features = Array.isArray(item.extra?.features) ? item.extra.features : [];
                    const itemKey = String(item.extra?.key || item.id || "");
                    const isRecommended = Boolean(itemKey && itemKey === recommendedKey);
                    const ctaText = String(item.extra?.ctaText || "Get started");
                    const ctaLink = String(item.extra?.ctaLink || "#campaign-form");

                    return (
                      <article
                        key={item.id}
                        className={`lp-plan-card${isRecommended ? " is-recommended" : ""}${itemProps.className}`}
                        draggable={itemProps.draggable}
                        onClick={itemProps.onClick}
                        onDragStart={itemProps.onDragStart}
                        onDragOver={itemProps.onDragOver}
                        onDrop={itemProps.onDrop}
                        onDragEnd={itemProps.onDragEnd}
                      >
                        {isRecommended ? <span className="lp-plan-badge">Recommended</span> : null}
                        {item.imageUrl ? (
                          <div className="lp-plan-media">
                            <img src={item.imageUrl} alt={item.title || "Pricing plan"} />
                            {editorMode ? (
                              <InlineImageUploader
                                label="Replace Image"
                                onUpload={(file) => handleItemImageUpload(section.id, item.id, file)}
                              />
                            ) : null}
                          </div>
                        ) : editorMode ? (
                          <div className="lp-plan-media">
                            <div className="lp-image-placeholder">No image</div>
                            <InlineImageUploader
                              label="Add Image"
                              onUpload={(file) => handleItemImageUpload(section.id, item.id, file)}
                            />
                          </div>
                        ) : null}
                        <h3>{renderItemText(section.id, item, "title", "Plan")}</h3>
                        <p className="lp-plan-label">{renderItemText(section.id, item, "label", "Plan summary")}</p>
                        <p className="lp-plan-price">{renderItemText(section.id, item, "value", "$49 / month")}</p>
                        <p className="lp-plan-description">{renderItemText(section.id, item, "description", "Plan description", true)}</p>

                        <p className="lp-plan-features-label">FEATURES</p>

                        {features.length ? (
                          <ul className="lp-plan-features">
                            {features.map((feature, featureIndex) => (
                              <li key={`${item.id}_feature_${featureIndex}`}>
                                <EditableText
                                  editorMode={editorMode}
                                  value={feature}
                                  fallback="Feature"
                                  onActivate={() => {
                                    onSelectSection?.(section.id);
                                    onSelectItem?.(section.id, item.id);
                                  }}
                                  onCommit={(nextValue) => {
                                    const nextFeatures = [...features];
                                    nextFeatures[featureIndex] = nextValue;
                                    onUpdateItemField?.(section.id, item.id, "extra", {
                                      ...(item.extra || {}),
                                      features: nextFeatures,
                                    });
                                  }}
                                />
                              </li>
                            ))}
                          </ul>
                        ) : null}

                        {editorMode ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onSelectSection?.(section.id);
                              onSelectItem?.(section.id, item.id);
                              onUpdateItemField?.(section.id, item.id, "extra", {
                                ...(item.extra || {}),
                                features: [...features, "New feature"],
                              });
                            }}
                          >
                            Add Feature
                          </button>
                        ) : null}

                        <a
                          href={ctaLink}
                          className="lp-btn lp-btn-primary lp-plan-cta"
                          onClick={(event) => handlePreviewLinkClick(event, section.id)}
                        >
                          <EditableText
                            editorMode={editorMode}
                            value={ctaText}
                            fallback="Get started"
                            onActivate={() => {
                              onSelectSection?.(section.id);
                              onSelectItem?.(section.id, item.id);
                            }}
                            onCommit={(nextValue) =>
                              onUpdateItemField?.(section.id, item.id, "extra", {
                                ...(item.extra || {}),
                                ctaText: nextValue,
                              })
                            }
                          />
                        </a>
                      </article>
                    );
                  })}
                </div>
              </motion.section>
            );
          }

          if (section.type === "FAQ") {
            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-faq ${scrollClass}${sectionProps.className}`}
                {...sectionMotion}
                style={sectionTextVars}
                draggable={sectionProps.draggable}
                onClick={sectionProps.onClick}
                onDragStart={sectionProps.onDragStart}
                onDragOver={sectionProps.onDragOver}
                onDrop={sectionProps.onDrop}
                onDragEnd={sectionProps.onDragEnd}
                onContextMenu={sectionProps.onContextMenu}
                onTouchStart={sectionProps.onTouchStart}
                onTouchEnd={sectionProps.onTouchEnd}
                onTouchMove={sectionProps.onTouchMove}
                onTouchCancel={sectionProps.onTouchCancel}
              >
                {renderSectionHeading(section, textClass)}

                <div className="lp-faq-list">
                  {section.items.map((item) => {
                    const itemProps = getItemProps(section.id, item.id);
                    const isOpen = activeFaqItemId === item.id;

                    return (
                      <article
                        key={item.id}
                        className={`lp-faq-item${isOpen ? " is-open" : ""}${itemProps.className}`}
                        draggable={itemProps.draggable}
                        onClick={itemProps.onClick}
                        onDragStart={itemProps.onDragStart}
                        onDragOver={itemProps.onDragOver}
                        onDrop={itemProps.onDrop}
                        onDragEnd={itemProps.onDragEnd}
                      >
                        <button
                          type="button"
                          className="lp-faq-trigger"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onSelectSection?.(section.id);
                            onSelectItem?.(section.id, item.id);

                            setActiveFaqItemId((current) => (current === item.id ? null : item.id));
                          }}
                        >
                          <EditableText
                            editorMode={editorMode}
                            as="span"
                            value={item.title || ""}
                            fallback="Question"
                            onActivate={() => {
                              onSelectSection?.(section.id);
                              onSelectItem?.(section.id, item.id);
                            }}
                            onCommit={(nextValue) => onUpdateItemField?.(section.id, item.id, "title", nextValue)}
                          />
                          <span>{isOpen ? "−" : "+"}</span>
                        </button>
                        {isOpen ? (
                          <div className="lp-faq-answer">
                            <EditableText
                              editorMode={editorMode}
                              as="p"
                              value={item.description || ""}
                              fallback="Answer"
                              multiline
                              onActivate={() => {
                                onSelectSection?.(section.id);
                                onSelectItem?.(section.id, item.id);
                              }}
                              onCommit={(nextValue) => onUpdateItemField?.(section.id, item.id, "description", nextValue)}
                            />
                            {item.imageUrl ? (
                              <div className="lp-faq-image-wrap">
                                <img src={item.imageUrl} alt={item.title || "FAQ visual"} />
                                {editorMode ? (
                                  <InlineImageUploader
                                    label="Replace Image"
                                    onUpload={(file) => handleItemImageUpload(section.id, item.id, file)}
                                  />
                                ) : null}
                              </div>
                            ) : editorMode ? (
                              <div className="lp-faq-image-wrap">
                                <div className="lp-image-placeholder">No image</div>
                                <InlineImageUploader
                                  label="Add Image"
                                  onUpload={(file) => handleItemImageUpload(section.id, item.id, file)}
                                />
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              </motion.section>
            );
          }

          if (section.type === "CAMPAIGN_FORM") {
            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-campaign ${scrollClass}${sectionProps.className}`}
                {...sectionMotion}
                style={sectionTextVars}
                draggable={sectionProps.draggable}
                onClick={sectionProps.onClick}
                onDragStart={sectionProps.onDragStart}
                onDragOver={sectionProps.onDragOver}
                onDrop={sectionProps.onDrop}
                onDragEnd={sectionProps.onDragEnd}
                onContextMenu={sectionProps.onContextMenu}
                onTouchStart={sectionProps.onTouchStart}
                onTouchEnd={sectionProps.onTouchEnd}
                onTouchMove={sectionProps.onTouchMove}
                onTouchCancel={sectionProps.onTouchCancel}
              >
                {renderSectionHeading(section, textClass)}

                <div className="lp-campaign-grid">
                  <div className="lp-campaign-copy">
                    <h3>Tell us about your project</h3>
                    <p>Complete the form and our team will share a tailored proposal with timelines and expected outcomes.</p>
                  </div>

                  <form className="campaign-form lp-campaign-form" onSubmit={handleCampaignSubmit}>
                    {campaignFields.map((field) => {
                      const options = toOptionsArray(field.options);
                      const value = formData[field.key] || "";
                      const selectedClass = editorMode && selectedFormFieldId === field.id ? "is-editor-selected" : "";

                      if (field.type === "textarea") {
                        return (
                          <label
                            key={field.id}
                            className={selectedClass}
                            onClick={(event) => handleFormFieldSelect(section.id, field.id, event)}
                          >
                            <EditableText
                              editorMode={editorMode}
                              as="span"
                              value={field.label}
                              fallback="Field Label"
                              onActivate={() => {
                                onSelectSection?.(section.id);
                                onSelectFormField?.(field.id);
                              }}
                              onCommit={(nextValue) => onUpdateFormField?.(field.id, "label", nextValue)}
                            />
                            <textarea
                              value={value}
                              required={field.required}
                              placeholder={field.placeholder || ""}
                              onChange={(event) => setFormValue(field.key, event.target.value)}
                            />
                          </label>
                        );
                      }

                      if (field.type === "select") {
                        return (
                          <label
                            key={field.id}
                            className={selectedClass}
                            onClick={(event) => handleFormFieldSelect(section.id, field.id, event)}
                          >
                            <EditableText
                              editorMode={editorMode}
                              as="span"
                              value={field.label}
                              fallback="Field Label"
                              onActivate={() => {
                                onSelectSection?.(section.id);
                                onSelectFormField?.(field.id);
                              }}
                              onCommit={(nextValue) => onUpdateFormField?.(field.id, "label", nextValue)}
                            />
                            <select
                              value={value}
                              required={field.required}
                              onChange={(event) => setFormValue(field.key, event.target.value)}
                            >
                              <option value="">Select an option</option>
                              {options.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </label>
                        );
                      }

                      return (
                        <label
                          key={field.id}
                          className={selectedClass}
                          onClick={(event) => handleFormFieldSelect(section.id, field.id, event)}
                        >
                          <EditableText
                            editorMode={editorMode}
                            as="span"
                            value={field.label}
                            fallback="Field Label"
                            onActivate={() => {
                              onSelectSection?.(section.id);
                              onSelectFormField?.(field.id);
                            }}
                            onCommit={(nextValue) => onUpdateFormField?.(field.id, "label", nextValue)}
                          />
                          <input
                            type={field.type}
                            value={value}
                            required={field.required}
                            placeholder={field.placeholder || ""}
                            onChange={(event) => setFormValue(field.key, event.target.value)}
                          />
                        </label>
                      );
                    })}

                    {formError ? <p className="form-error">{formError}</p> : null}
                    {formMessage ? <p className="form-success">{formMessage}</p> : null}

                    <button type="submit" disabled={formLoading || editorMode}>
                      {formLoading ? "Submitting..." : editorMode ? "Preview Mode" : settings.submitText || "Submit"}
                    </button>
                  </form>
                </div>
              </motion.section>
            );
          }

          if (section.type === "FOOTER") {
            const contactEmail = settings.contactEmail || "leilawaziri@lesaal.com";
            const linkItems = section.items.slice().sort((a, b) => a.order - b.order);

            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-footer-wrap ${scrollClass}${sectionProps.className}`}
                {...sectionMotion}
                style={sectionTextVars}
                draggable={sectionProps.draggable}
                onClick={sectionProps.onClick}
                onDragStart={sectionProps.onDragStart}
                onDragOver={sectionProps.onDragOver}
                onDrop={sectionProps.onDrop}
                onDragEnd={sectionProps.onDragEnd}
                onContextMenu={sectionProps.onContextMenu}
                onTouchStart={sectionProps.onTouchStart}
                onTouchEnd={sectionProps.onTouchEnd}
                onTouchMove={sectionProps.onTouchMove}
                onTouchCancel={sectionProps.onTouchCancel}
              >
                <div className="lp-footer-cta">
                  <div>
                    <EditableText
                      editorMode={editorMode}
                      as="h2"
                      value={settings.heading || ""}
                      fallback="Start your 30-day free trial"
                      onActivate={() => onSelectSection?.(section.id)}
                      onCommit={(nextValue) => onUpdateSectionSetting?.(section.id, "heading", nextValue)}
                    />
                    <EditableText
                      editorMode={editorMode}
                      as="p"
                      value={settings.body || ""}
                      fallback="Join over 4,000+ startups already growing with Lesaal."
                      multiline
                      onActivate={() => onSelectSection?.(section.id)}
                      onCommit={(nextValue) => onUpdateSectionSetting?.(section.id, "body", nextValue)}
                    />
                  </div>
                  <a
                    href={settings.ctaLink || "#campaign-form"}
                    className="lp-btn lp-btn-primary"
                    onClick={(event) => handlePreviewLinkClick(event, section.id)}
                  >
                    <EditableText
                      editorMode={editorMode}
                      value={settings.ctaText || ""}
                      fallback="Get started"
                      onActivate={() => onSelectSection?.(section.id)}
                      onCommit={(nextValue) => onUpdateSectionSetting?.(section.id, "ctaText", nextValue)}
                    />
                  </a>
                </div>

                <div className="lp-footer-main">
                  <div className="lp-footer-brand">
                    <a href="#top" onClick={(event) => handlePreviewLinkClick(event)}>
                      <img src="/images/logo/LESAAL.png" alt="Lesaal logo" />
                      <span>Lesaal</span>
                    </a>
                    <p>Boost sales with customer care, ads, and social media packages.</p>
                  </div>

                  <div className="lp-footer-links">
                    {linkItems.map((item) => {
                      const itemProps = getItemProps(section.id, item.id);

                      return (
                        <a
                          key={item.id}
                          href={item.value || "#"}
                          className={`lp-footer-link${itemProps.className}`}
                          draggable={itemProps.draggable}
                          onClick={(event) => {
                            itemProps.onClick?.(event);
                            handlePreviewLinkClick(event, section.id);
                          }}
                          onDragStart={itemProps.onDragStart}
                          onDragOver={itemProps.onDragOver}
                          onDrop={itemProps.onDrop}
                          onDragEnd={itemProps.onDragEnd}
                        >
                          {renderItemText(section.id, item, "title", "Footer Link")}
                        </a>
                      );
                    })}
                  </div>

                  <div className="lp-footer-contact">
                    <h4>Contact</h4>
                    <a href={`mailto:${contactEmail}`} onClick={(event) => handlePreviewLinkClick(event, section.id)}>
                      <EditableText
                        editorMode={editorMode}
                        value={contactEmail}
                        fallback="leilawaziri@lesaal.com"
                        onActivate={() => onSelectSection?.(section.id)}
                        onCommit={(nextValue) => onUpdateSectionSetting?.(section.id, "contactEmail", nextValue)}
                      />
                    </a>
                  </div>
                </div>
              </motion.section>
            );
          }

          return (
            <motion.section
              id={anchorId}
              key={section.id}
              className={`lp-section ${scrollClass}${sectionProps.className}`}
              {...sectionMotion}
              style={sectionTextVars}
              draggable={sectionProps.draggable}
              onClick={sectionProps.onClick}
              onDragStart={sectionProps.onDragStart}
              onDragOver={sectionProps.onDragOver}
              onDrop={sectionProps.onDrop}
              onDragEnd={sectionProps.onDragEnd}
              onContextMenu={sectionProps.onContextMenu}
              onTouchStart={sectionProps.onTouchStart}
              onTouchEnd={sectionProps.onTouchEnd}
              onTouchMove={sectionProps.onTouchMove}
              onTouchCancel={sectionProps.onTouchCancel}
            >
              {renderSectionHeading(section, textClass)}
            </motion.section>
          );
        })}
      </main>
    </div>
  );
}
