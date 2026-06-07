import {
  COMPONENT_VARIANT_OPTIONS,
  DEDICATED_SECTION_TYPES,
  FORM_FIELD_TYPES,
  LEGACY_SECTION_TYPES,
  SCROLL_ANIMATION_OPTIONS,
  SECTION_ANIMATION_OPTIONS,
  SECTION_TYPE_OPTIONS,
  SERVICE_DESCRIPTION_MAX_WORDS,
  TEXT_ANIMATION_OPTIONS,
} from "./constants";
import { createTemplateSection, DEFAULT_SITE_TITLE, getDefaultFormFields, getDefaultLandingSections } from "./landing-defaults";
import { ensureDatabaseReady, prisma } from "./prisma";
import { unstable_cache } from "next/cache";

const LEGACY_SCREENSHOT_HERO_IMAGE = "/images/hero/default-growth-hero.webp";
const LEGACY_SCREENSHOT_COMMENTARY_IMAGE = "/images/commentary/default-commentary.webp";
const REPLACEMENT_HERO_IMAGE = "/images/services/social-media-management.webp";
const REPLACEMENT_COMMENTARY_IMAGE = "/images/services/content-creation.webp";
export const LANDING_CONFIG_CACHE_TAG = "landing-config";

function coerceEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
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

function normalizeWordCount(value, maxWords) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");
}

function toInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeHexColor(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized.toLowerCase() : "";
}

function sanitizeLink(value, fallback = "") {
  const trimmed = String(value || "").trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "mailto:") {
      return trimmed;
    }
  } catch (_error) {
    return fallback;
  }

  return fallback;
}

function sanitizeEmailAddress(value, fallback) {
  const trimmed = String(value || "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : fallback;
}

function sanitizeItemExtra(type, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const extra = { ...value };

  if (typeof extra.ctaLink === "string") {
    extra.ctaLink = sanitizeLink(extra.ctaLink, "#campaign-form");
  }

  if (typeof extra.ctaText === "string") {
    extra.ctaText = String(extra.ctaText);
  }

  if (typeof extra.key === "string") {
    extra.key = String(extra.key).trim();
  }

  if (Array.isArray(extra.features)) {
    extra.features = extra.features.map((entry) => String(entry || "").trim()).filter(Boolean);
  }

  if (typeof extra.monthlyPrice === "string") {
    extra.monthlyPrice = String(extra.monthlyPrice);
  }

  if (typeof extra.annualPrice === "string") {
    extra.annualPrice = String(extra.annualPrice);
  }

  if (type === "SERVICES_GRID" && Array.isArray(extra.tags)) {
    extra.tags = extra.tags.map((entry) => String(entry || "").trim()).filter(Boolean);
  }

  return extra;
}

function sanitizeTextStyle(value) {
  const raw = value && typeof value === "object" ? value : {};
  const parsedSize = Number.parseInt(String(raw.fontSize ?? ""), 10);
  const fontSize = Number.isFinite(parsedSize) ? Math.max(12, Math.min(120, parsedSize)) : null;

  return {
    fontSize,
    color: normalizeHexColor(raw.color),
    bold: Boolean(raw.bold),
    italic: Boolean(raw.italic),
    underline: Boolean(raw.underline),
  };
}

function sanitizeSectionSettings(type, settings, items) {
  const raw = settings && typeof settings === "object" ? settings : {};

  switch (type) {
    case "HERO":
      return {
        staticText: String(raw.staticText || raw.heading || "Let us help you grow your reach through"),
        dynamicWords: toStringArray(raw.dynamicWords).length
          ? toStringArray(raw.dynamicWords)
          : ["Social media management", "SEO optimization", "paid advertising"],
        description: String(raw.description || raw.body || ""),
        imageUrl: String(raw.imageUrl || ""),
        primaryCtaText: String(raw.primaryCtaText || raw.ctaText || "Start your free trial"),
        primaryCtaLink: sanitizeLink(raw.primaryCtaLink || raw.ctaLink, "#campaign-form"),
        secondaryCtaText: String(raw.secondaryCtaText || "Demo"),
        secondaryCtaLink: sanitizeLink(raw.secondaryCtaLink, "#services-grid"),
        textStyle: sanitizeTextStyle(raw.textStyle),
      };
    case "STATS_BAND":
      return {
        heading: String(raw.heading || "Build Something Great"),
        subheading: String(raw.subheading || raw.body || ""),
        textStyle: sanitizeTextStyle(raw.textStyle),
      };
    case "CLIENT_LOGOS":
      return {
        heading: String(raw.heading || "Clients we have worked with"),
        subheading: String(raw.subheading || raw.body || ""),
        textStyle: sanitizeTextStyle(raw.textStyle),
      };
    case "SERVICES_GRID":
      return {
        heading: String(raw.heading || "Services"),
        subheading: String(raw.subheading || raw.body || ""),
        seeAllText: String(raw.seeAllText || "See all services"),
        seeAllLink: sanitizeLink(raw.seeAllLink, "/services"),
        maxHomeItems: Math.max(1, Math.min(24, toInteger(raw.maxHomeItems, 6))),
        textStyle: sanitizeTextStyle(raw.textStyle),
      };
    case "COMMENTARY":
      return {
        heading: String(raw.heading || "Commentary"),
        subheading: String(raw.subheading || raw.body || ""),
        textStyle: sanitizeTextStyle(raw.textStyle),
      };
    case "PRICING": {
      const billingMode = String(raw.defaultBillingMode || "").toLowerCase();
      const defaultBillingMode = billingMode === "annual" ? "annual" : "monthly";

      return {
        heading: String(raw.heading || "Pricing"),
        subheading: String(raw.subheading || raw.body || ""),
        recommendedPlanKey: String(raw.recommendedPlanKey || raw.recommendedPlanId || ""),
        monthlyLabel: String(raw.monthlyLabel || "Monthly billing"),
        annualLabel: String(raw.annualLabel || "Annual billing"),
        saveLabel: String(raw.saveLabel || "Save 30%"),
        defaultBillingMode,
        textStyle: sanitizeTextStyle(raw.textStyle),
      };
    }
    case "FAQ":
      return {
        heading: String(raw.heading || "Frequently asked questions"),
        subheading: String(raw.subheading || raw.body || ""),
        textStyle: sanitizeTextStyle(raw.textStyle),
      };
    case "CAMPAIGN_FORM":
      return {
        heading: String(raw.heading || "Join our latest campaigns"),
        subheading: String(raw.subheading || raw.body || ""),
        submitText: String(raw.submitText || raw.ctaText || "See all campaigns"),
        successMessage: String(raw.successMessage || "Response submitted successfully."),
        textStyle: sanitizeTextStyle(raw.textStyle),
      };
    case "FOOTER":
      return {
        heading: String(raw.heading || "Start your 30-day free trial"),
        body: String(raw.body || raw.subheading || ""),
        ctaText: String(raw.ctaText || raw.primaryCtaText || "Get started"),
        ctaLink: sanitizeLink(raw.ctaLink || raw.primaryCtaLink, "#campaign-form"),
        brandDescription: String(raw.brandDescription || "Boost sales with customer care, ads, and social media packages."),
        contactHeading: String(raw.contactHeading || raw.contactTitle || "Contact"),
        contactEmail: sanitizeEmailAddress(raw.contactEmail, "leilawaziri@lesaal.com"),
        contactPhone: String(raw.contactPhone ?? raw.phone ?? "+255 700 000 000").trim(),
        contactAddress: String(raw.contactAddress ?? raw.address ?? "Dar es Salaam, Tanzania").trim(),
        supportHours: String(raw.supportHours ?? "Mon - Fri, 9:00 AM - 6:00 PM").trim(),
        copyrightText: String(raw.copyrightText || "Lesaal cc 2023"),
        rightsText: String(raw.rightsText || "All rights reserved."),
        textStyle: sanitizeTextStyle(raw.textStyle),
      };
    default:
      return raw;
  }
}

function sanitizeSectionItem(type, item, itemIndex) {
  const normalizedDescription =
    type === "SERVICES_GRID"
      ? normalizeWordCount(item?.description, SERVICE_DESCRIPTION_MAX_WORDS)
      : item?.description
        ? String(item.description)
        : null;

  return {
    id: item?.id,
    order: itemIndex,
    label: item?.label ? String(item.label) : null,
    title: item?.title ? String(item.title) : null,
    description: normalizedDescription,
    imageUrl: item?.imageUrl ? String(item.imageUrl) : null,
    value:
      item?.value != null
        ? type === "FOOTER"
          ? sanitizeLink(item.value, "")
          : String(item.value)
        : null,
    extra: sanitizeItemExtra(type, item?.extra),
  };
}

function sanitizeSection(section, order) {
  const sectionType = coerceEnum(section?.type, SECTION_TYPE_OPTIONS, "HERO");
  const items = Array.isArray(section?.items) ? section.items : [];
  const normalizedItems = items.map((item, itemIndex) => sanitizeSectionItem(sectionType, item, itemIndex));

  return {
    id: section?.id,
    type: sectionType,
    title: String(section?.title || "Untitled Section"),
    isVisible: section?.isVisible !== false,
    order,
    componentVariant: coerceEnum(section?.componentVariant, COMPONENT_VARIANT_OPTIONS, "DEFAULT"),
    textAnimation: coerceEnum(section?.textAnimation, TEXT_ANIMATION_OPTIONS, "FADE_UP"),
    sectionAnimation: coerceEnum(section?.sectionAnimation, SECTION_ANIMATION_OPTIONS, "FADE_IN"),
    scrollAnimation: coerceEnum(section?.scrollAnimation, SCROLL_ANIMATION_OPTIONS, "NONE"),
    settings: sanitizeSectionSettings(sectionType, section?.settings, normalizedItems),
    items: normalizedItems,
  };
}

function sanitizeField(field, order) {
  const options = Array.isArray(field?.options)
    ? field.options
    : typeof field?.options === "string"
      ? field.options
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      : [];

  return {
    id: field?.id,
    key: String(field?.key || `field_${order + 1}`)
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_]/g, "")
      .toLowerCase(),
    label: String(field?.label || "Field"),
    type: FORM_FIELD_TYPES.includes(field?.type) ? field.type : "text",
    required: Boolean(field?.required),
    placeholder: field?.placeholder ? String(field.placeholder) : null,
    options,
    order,
    isVisible: field?.isVisible !== false,
  };
}

function normalizeConfigPayload(payload) {
  const sections = Array.isArray(payload?.sections) ? payload.sections.map((section, index) => sanitizeSection(section, index)) : [];
  const formFields = Array.isArray(payload?.formFields) ? payload.formFields.map((field, index) => sanitizeField(field, index)) : [];

  return {
    siteTitle: String(payload?.siteTitle || DEFAULT_SITE_TITLE),
    sections,
    formFields,
  };
}

function hasLegacySectionTypes(config) {
  return config.sections.some((section) => LEGACY_SECTION_TYPES.includes(section.type));
}

function hasMissingDedicatedSectionTypes(config) {
  const existingSectionTypes = new Set(config.sections.map((section) => section.type));
  return DEDICATED_SECTION_TYPES.some((type) => !existingSectionTypes.has(type));
}

async function resetConfigToDedicatedDefaults(configId, siteTitle) {
  const defaultSections = getDefaultLandingSections();
  const defaultFields = getDefaultFormFields();

  await prisma.$transaction(async (tx) => {
    await tx.landingSection.deleteMany({
      where: { configId },
    });

    await tx.campaignFormField.deleteMany({
      where: { configId },
    });

    await tx.landingPageConfig.update({
      where: { id: configId },
      data: {
        siteTitle: siteTitle || DEFAULT_SITE_TITLE,
        sections: {
          create: defaultSections.map((section) => ({
            type: section.type,
            title: section.title,
            isVisible: section.isVisible,
            order: section.order,
            componentVariant: section.componentVariant,
            textAnimation: section.textAnimation,
            sectionAnimation: section.sectionAnimation,
            scrollAnimation: section.scrollAnimation,
            settings: section.settings,
            items: {
              create: (section.items || []).map((item, itemIndex) => ({
                order: typeof item.order === "number" ? item.order : itemIndex,
                label: item.label || null,
                title: item.title || null,
                description:
                  section.type === "SERVICES_GRID"
                    ? normalizeWordCount(item.description, SERVICE_DESCRIPTION_MAX_WORDS)
                    : item.description || null,
                imageUrl: item.imageUrl || null,
                value: item.value || null,
                extra: item.extra || null,
              })),
            },
          })),
        },
        formFields: {
          create: defaultFields.map((field, index) => ({
            key: field.key,
            label: field.label,
            type: field.type,
            required: field.required,
            placeholder: field.placeholder,
            options: field.options,
            order: index,
            isVisible: field.isVisible,
          })),
        },
      },
    });
  });
}

async function migrateDeprecatedDefaultImages(config) {
  if (!config?.sections?.length) {
    return false;
  }

  const sectionUpdates = [];
  const itemUpdates = [];

  for (const section of config.sections) {
    if (section.type === "HERO") {
      const currentImage = section.settings?.imageUrl;

      if (currentImage === LEGACY_SCREENSHOT_HERO_IMAGE) {
        sectionUpdates.push({
          id: section.id,
          settings: {
            ...(section.settings || {}),
            imageUrl: REPLACEMENT_HERO_IMAGE,
          },
        });
      }
    }

    if (section.type === "COMMENTARY") {
      for (const item of section.items || []) {
        if (item.imageUrl === LEGACY_SCREENSHOT_COMMENTARY_IMAGE) {
          itemUpdates.push({
            id: item.id,
            imageUrl: REPLACEMENT_COMMENTARY_IMAGE,
          });
        }
      }
    }
  }

  if (!sectionUpdates.length && !itemUpdates.length) {
    return false;
  }

  await prisma.$transaction(async (tx) => {
    for (const update of sectionUpdates) {
      await tx.landingSection.update({
        where: { id: update.id },
        data: {
          settings: update.settings,
        },
      });
    }

    for (const update of itemUpdates) {
      await tx.sectionItem.update({
        where: { id: update.id },
        data: {
          imageUrl: update.imageUrl,
        },
      });
    }
  });

  return true;
}

export function serializeLandingConfig(config) {
  return {
    id: config.id,
    siteTitle: config.siteTitle,
    sections: config.sections
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((section) =>
        sanitizeSection(
          {
            ...section,
            items: (section.items || []).slice().sort((a, b) => a.order - b.order),
          },
          section.order
        )
      ),
    formFields: config.formFields
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((field) => sanitizeField(field, field.order)),
  };
}

export async function getLandingConfigRecord() {
  await ensureDatabaseReady();

  return prisma.landingPageConfig.findFirst({
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: {
          items: { orderBy: { order: "asc" } },
        },
      },
      formFields: {
        orderBy: { order: "asc" },
      },
    },
  });
}

async function ensureLandingConfigRecordExists() {
  let existingConfig = await getLandingConfigRecord();

  if (!existingConfig) {
    const defaultSections = getDefaultLandingSections();
    const defaultFields = getDefaultFormFields();

    await prisma.landingPageConfig.create({
      data: {
        siteTitle: DEFAULT_SITE_TITLE,
        sections: {
          create: defaultSections.map((section) => ({
            type: section.type,
            title: section.title,
            isVisible: section.isVisible,
            order: section.order,
            componentVariant: section.componentVariant,
            textAnimation: section.textAnimation,
            sectionAnimation: section.sectionAnimation,
            scrollAnimation: section.scrollAnimation,
            settings: section.settings,
            items: {
              create: (section.items || []).map((item, itemIndex) => ({
                order: typeof item.order === "number" ? item.order : itemIndex,
                label: item.label || null,
                title: item.title || null,
                description:
                  section.type === "SERVICES_GRID"
                    ? normalizeWordCount(item.description, SERVICE_DESCRIPTION_MAX_WORDS)
                    : item.description || null,
                imageUrl: item.imageUrl || null,
                value: item.value || null,
                extra: item.extra || null,
              })),
            },
          })),
        },
        formFields: {
          create: defaultFields.map((field, index) => ({
            key: field.key,
            label: field.label,
            type: field.type,
            required: field.required,
            placeholder: field.placeholder,
            options: field.options,
            order: index,
            isVisible: field.isVisible,
          })),
        },
      },
    });

    existingConfig = await getLandingConfigRecord();
  }

  return existingConfig;
}

async function runLandingConfigMaintenance(config) {
  let existingConfig = config;

  if (existingConfig && (hasLegacySectionTypes(existingConfig) || hasMissingDedicatedSectionTypes(existingConfig))) {
    await resetConfigToDedicatedDefaults(existingConfig.id, existingConfig.siteTitle);
    existingConfig = await getLandingConfigRecord();
  }

  if (existingConfig) {
    const migratedImages = await migrateDeprecatedDefaultImages(existingConfig);
    if (migratedImages) {
      existingConfig = await getLandingConfigRecord();
    }
  }

  return existingConfig;
}

export async function ensureLandingConfig({ runMaintenance = false } = {}) {
  let config = await ensureLandingConfigRecordExists();

  if (runMaintenance) {
    config = await runLandingConfigMaintenance(config);
  }

  return config;
}

async function loadLandingConfig() {
  const config = await ensureLandingConfig();
  return serializeLandingConfig(config);
}

const getLandingConfigCached = unstable_cache(
  async () => loadLandingConfig(),
  ["landing-config:public"],
  {
    revalidate: 60,
    tags: [LANDING_CONFIG_CACHE_TAG],
  }
);

export async function getLandingConfig({ bypassCache = false } = {}) {
  if (bypassCache) {
    return loadLandingConfig();
  }

  return getLandingConfigCached();
}

export async function getLandingConfigForAdmin() {
  const config = await ensureLandingConfig({ runMaintenance: true });
  return serializeLandingConfig(config);
}

export async function addTemplateSectionToConfig(templateType) {
  const config = await ensureLandingConfig({ runMaintenance: true });
  const section = createTemplateSection(templateType, config.sections.length);

  await prisma.landingSection.create({
    data: {
      configId: config.id,
      type: section.type,
      title: section.title,
      isVisible: section.isVisible,
      order: section.order,
      componentVariant: section.componentVariant,
      textAnimation: section.textAnimation,
      sectionAnimation: section.sectionAnimation,
      scrollAnimation: section.scrollAnimation,
      settings: section.settings,
      items: {
        create: (section.items || []).map((item, index) => ({
          order: index,
          label: item.label || null,
          title: item.title || null,
          description:
            section.type === "SERVICES_GRID"
              ? normalizeWordCount(item.description, SERVICE_DESCRIPTION_MAX_WORDS)
              : item.description || null,
          imageUrl: item.imageUrl || null,
          value: item.value || null,
          extra: item.extra || null,
        })),
      },
    },
  });

  const updated = await getLandingConfigRecord();
  return serializeLandingConfig(updated);
}

export async function updateLandingConfig(payload) {
  const config = await ensureLandingConfig({ runMaintenance: true });
  const normalized = normalizeConfigPayload(payload);

  await prisma.$transaction(async (tx) => {
    await tx.landingPageConfig.update({
      where: { id: config.id },
      data: {
        siteTitle: normalized.siteTitle,
        sections: {
          deleteMany: {},
          create: normalized.sections.map((section, sectionIndex) => ({
            type: section.type,
            title: section.title,
            isVisible: section.isVisible,
            order: sectionIndex,
            componentVariant: section.componentVariant,
            textAnimation: section.textAnimation,
            sectionAnimation: section.sectionAnimation,
            scrollAnimation: section.scrollAnimation,
            settings: section.settings,
            items: {
              create: section.items.map((item, itemIndex) => ({
                order: itemIndex,
                label: item.label,
                title: item.title,
                description:
                  section.type === "SERVICES_GRID"
                    ? normalizeWordCount(item.description, SERVICE_DESCRIPTION_MAX_WORDS)
                    : item.description,
                imageUrl: item.imageUrl,
                value: item.value,
                extra: item.extra,
              })),
            },
          })),
        },
        formFields: {
          deleteMany: {},
          create: normalized.formFields.map((field, fieldIndex) => ({
            key: field.key,
            label: field.label,
            type: field.type,
            required: field.required,
            placeholder: field.placeholder,
            options: field.options,
            order: fieldIndex,
            isVisible: field.isVisible,
          })),
        },
      },
    });
  });

  const updated = await getLandingConfigRecord();
  return serializeLandingConfig(updated);
}

export function getFullServicesFromConfig(config) {
  const servicesSection = config.sections.find((section) => section.type === "SERVICES_GRID");

  if (!servicesSection) {
    return [];
  }

  return servicesSection.items
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item) => ({
      ...item,
      description: normalizeWordCount(item.description, SERVICE_DESCRIPTION_MAX_WORDS),
    }));
}

export function getHomepageServicesFromConfig(config) {
  const servicesSection = config.sections.find((section) => section.type === "SERVICES_GRID");

  if (!servicesSection) {
    return [];
  }

  const maxItems = Math.max(
    1,
    Math.min(24, toInteger(servicesSection.settings?.maxHomeItems, 6))
  );

  return servicesSection.items
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, maxItems)
    .map((item) => ({
      ...item,
      description: normalizeWordCount(item.description, SERVICE_DESCRIPTION_MAX_WORDS),
    }));
}

export function getDedicatedSectionTypeOrder() {
  return [...DEDICATED_SECTION_TYPES];
}
