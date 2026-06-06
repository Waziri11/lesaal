import { ensureDatabaseReady, prisma } from "./prisma";

export const CAMPAIGN_FIELD_TYPES = ["text", "email", "tel", "textarea", "select"];

const DEFAULT_CAMPAIGN_QUESTIONS = [
  {
    key: "full_name",
    label: "Full Name",
    type: "text",
    required: true,
    placeholder: "Jane Doe",
    options: [],
    isVisible: true,
  },
  {
    key: "email",
    label: "Email",
    type: "email",
    required: true,
    placeholder: "you@example.com",
    options: [],
    isVisible: true,
  },
  {
    key: "phone",
    label: "Phone Number",
    type: "tel",
    required: false,
    placeholder: "+1 555 000 000",
    options: [],
    isVisible: true,
  },
  {
    key: "message",
    label: "Tell us about your interest",
    type: "textarea",
    required: true,
    placeholder: "Share why you want to join this campaign.",
    options: [],
    isVisible: true,
  },
];

const DEFAULT_SECTION_TITLE = "General Information";

const adminCampaignInclude = {
  questions: { orderBy: { order: "asc" } },
  responses: {
    orderBy: { submittedAt: "desc" },
    take: 1,
    select: { submittedAt: true },
  },
  _count: {
    select: {
      responses: true,
    },
  },
};

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeQuestionKey(value, fallback) {
  const next = String(value || fallback || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "");

  return next || fallback;
}

function normalizeSectionKey(value, fallback) {
  const next = String(value || fallback || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "");

  return next || fallback;
}

function normalizeOptions(value) {
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

function parseCampaignDeadline(value) {
  const raw = value instanceof Date ? value : String(value || "").trim();

  if (!raw) {
    throw new Error("Campaign deadline is required.");
  }

  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map((part) => Number.parseInt(part, 10));
    const asUtcEndOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

    if (Number.isNaN(asUtcEndOfDay.getTime())) {
      throw new Error("Campaign deadline is invalid.");
    }

    return asUtcEndOfDay;
  }

  const parsed = raw instanceof Date ? new Date(raw.getTime()) : new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Campaign deadline is invalid.");
  }

  return parsed;
}

function sanitizeQuestion(question, index, usedQuestionKeys) {
  const fallbackKey = `field_${index + 1}`;
  const baseKey = normalizeQuestionKey(question?.key || question?.label, fallbackKey);

  let uniqueKey = baseKey;
  let suffix = 2;
  while (usedQuestionKeys.has(uniqueKey)) {
    uniqueKey = `${baseKey}_${suffix}`;
    suffix += 1;
  }
  usedQuestionKeys.add(uniqueKey);

  const type = CAMPAIGN_FIELD_TYPES.includes(question?.type) ? question.type : "text";

  return {
    key: uniqueKey,
    label: String(question?.label || `Question ${index + 1}`).trim(),
    type,
    required: Boolean(question?.required),
    placeholder: question?.placeholder ? String(question.placeholder).trim() : null,
    options: type === "select" ? normalizeOptions(question?.options) : [],
    isVisible: question?.isVisible !== false,
  };
}

function sanitizeSections(payloadSections, payloadQuestions) {
  const legacySectionSource =
    Array.isArray(payloadQuestions) && payloadQuestions.length
      ? [
          {
            key: "general_information",
            title: DEFAULT_SECTION_TITLE,
            description: "",
            questions: payloadQuestions,
          },
        ]
      : [];

  const sectionSource =
    Array.isArray(payloadSections) && payloadSections.length
      ? payloadSections
      : legacySectionSource.length
        ? legacySectionSource
        : [
            {
              key: "general_information",
              title: DEFAULT_SECTION_TITLE,
              description: "",
              questions: DEFAULT_CAMPAIGN_QUESTIONS,
            },
          ];

  const usedSectionKeys = new Set();
  const usedQuestionKeys = new Set();
  const flattenedQuestions = [];
  const sections = [];

  for (let sectionIndex = 0; sectionIndex < sectionSource.length; sectionIndex += 1) {
    const rawSection = sectionSource[sectionIndex];
    const fallbackSectionKey = `section_${sectionIndex + 1}`;
    const baseSectionKey = normalizeSectionKey(rawSection?.key || rawSection?.title, fallbackSectionKey);

    let uniqueSectionKey = baseSectionKey;
    let sectionSuffix = 2;
    while (usedSectionKeys.has(uniqueSectionKey)) {
      uniqueSectionKey = `${baseSectionKey}_${sectionSuffix}`;
      sectionSuffix += 1;
    }
    usedSectionKeys.add(uniqueSectionKey);

    const title = String(rawSection?.title || `Section ${sectionIndex + 1}`).trim();
    const description = String(rawSection?.description || "").trim();
    const rawQuestions = Array.isArray(rawSection?.questions) ? rawSection.questions : [];

    if (!rawQuestions.length) {
      throw new Error(`Section \"${title}\" must include at least one question.`);
    }

    const sectionQuestions = rawQuestions.map((question, localQuestionIndex) => {
      const normalizedQuestion = sanitizeQuestion(question, flattenedQuestions.length + localQuestionIndex, usedQuestionKeys);

      return {
        ...normalizedQuestion,
        order: flattenedQuestions.length + localQuestionIndex,
        sectionKey: uniqueSectionKey,
        sectionTitle: title,
        sectionDescription: description || null,
        sectionOrder: sectionIndex,
      };
    });

    sections.push({
      key: uniqueSectionKey,
      title,
      description,
      order: sectionIndex,
      questions: sectionQuestions,
    });

    flattenedQuestions.push(...sectionQuestions);
  }

  return {
    sections,
    questions: flattenedQuestions,
  };
}

function buildSectionsFromQuestions(questions) {
  const grouped = new Map();
  const ordered = (questions || [])
    .slice()
    .sort((a, b) => {
      const sectionDelta = Number(a.sectionOrder || 0) - Number(b.sectionOrder || 0);
      if (sectionDelta !== 0) return sectionDelta;
      return Number(a.order || 0) - Number(b.order || 0);
    });

  for (const question of ordered) {
    const sectionOrder = Number(question.sectionOrder || 0);
    const sectionKey = question.sectionKey || `section_${sectionOrder + 1}`;

    if (!grouped.has(sectionKey)) {
      grouped.set(sectionKey, {
        id: sectionKey,
        key: sectionKey,
        title: question.sectionTitle || `Section ${sectionOrder + 1}`,
        description: question.sectionDescription || "",
        order: sectionOrder,
        questions: [],
      });
    }

    grouped.get(sectionKey).questions.push(serializeQuestion(question));
  }

  return Array.from(grouped.values()).sort((a, b) => a.order - b.order);
}

function getActiveCampaignWhereClause(now = new Date()) {
  return {
    isPublished: true,
    OR: [{ deadline: null }, { deadline: { gte: now } }],
  };
}

export function sanitizeCampaignPayload(payload) {
  const title = String(payload?.title || "").trim();
  const description = String(payload?.description || "").trim();
  const targetMarket = String(payload?.targetMarket || "").trim();

  if (!title) {
    throw new Error("Campaign title is required.");
  }

  if (!description) {
    throw new Error("Campaign description is required.");
  }

  if (!targetMarket) {
    throw new Error("Campaign target market is required.");
  }

  const baseSlug = slugify(payload?.slug || title);

  if (!baseSlug) {
    throw new Error("Campaign slug is invalid.");
  }

  const { sections, questions } = sanitizeSections(payload?.sections, payload?.questions);
  const orderCandidate = Number.parseInt(String(payload?.order), 10);

  return {
    title,
    slug: baseSlug,
    targetMarket,
    deadline: parseCampaignDeadline(payload?.deadline),
    description,
    imageUrl: payload?.imageUrl ? String(payload.imageUrl).trim() : null,
    isPublished: payload?.isPublished !== false,
    order: Number.isFinite(orderCandidate) ? Math.max(0, orderCandidate) : null,
    sections,
    questions,
  };
}

export function isCampaignTableMissingError(error) {
  if (!error) return false;

  if (error?.code === "P2021" || error?.code === "P2022") {
    return true;
  }

  const message = String(error?.message || "").toLowerCase();
  return message.includes("campaign") && message.includes("does not exist");
}

export async function ensureUniqueCampaignSlug(baseSlug, excludeCampaignId = null) {
  await ensureDatabaseReady();

  const normalized = slugify(baseSlug) || `campaign-${Date.now()}`;
  let candidate = normalized;
  let suffix = 2;

  // Keep checking until no conflicting slug remains.
  while (true) {
    const existing = await prisma.campaign.findFirst({
      where: {
        slug: candidate,
        ...(excludeCampaignId
          ? {
              id: {
                not: excludeCampaignId,
              },
            }
          : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }

    candidate = `${normalized}-${suffix}`;
    suffix += 1;
  }
}

function serializeQuestion(question) {
  return {
    id: question.id,
    key: question.key,
    label: question.label,
    type: question.type,
    required: question.required,
    placeholder: question.placeholder,
    options: Array.isArray(question.options) ? question.options : [],
    order: question.order,
    isVisible: question.isVisible,
    sectionKey: question.sectionKey || null,
    sectionTitle: question.sectionTitle || null,
    sectionDescription: question.sectionDescription || null,
    sectionOrder: Number(question.sectionOrder || 0),
  };
}

function serializeAdminCampaign(campaign) {
  const questions = (campaign.questions || []).slice().sort((a, b) => a.order - b.order);

  return {
    id: campaign.id,
    title: campaign.title,
    slug: campaign.slug,
    targetMarket: campaign.targetMarket,
    deadline: campaign.deadline,
    description: campaign.description,
    imageUrl: campaign.imageUrl,
    isPublished: campaign.isPublished,
    order: campaign.order,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    questionCount: Array.isArray(campaign.questions) ? campaign.questions.length : 0,
    responseCount: campaign?._count?.responses || 0,
    lastResponseAt: campaign?.responses?.[0]?.submittedAt || null,
    questions: questions.map(serializeQuestion),
    sections: buildSectionsFromQuestions(questions),
  };
}

function serializePublicCampaign(campaign) {
  return {
    id: campaign.id,
    title: campaign.title,
    slug: campaign.slug,
    targetMarket: campaign.targetMarket,
    deadline: campaign.deadline,
    description: campaign.description,
    imageUrl: campaign.imageUrl,
    order: campaign.order,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

export async function getPublishedCampaigns() {
  await ensureDatabaseReady();

  const campaigns = await prisma.campaign.findMany({
    where: getActiveCampaignWhereClause(),
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });

  return campaigns.map(serializePublicCampaign);
}

export async function getAdminCampaigns() {
  await ensureDatabaseReady();

  const campaigns = await prisma.campaign.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: adminCampaignInclude,
  });

  return campaigns.map(serializeAdminCampaign);
}

export async function getCampaignBySlugForPublic(slug) {
  await ensureDatabaseReady();

  const campaign = await prisma.campaign.findFirst({
    where: {
      slug,
      ...getActiveCampaignWhereClause(),
    },
    include: {
      questions: {
        where: { isVisible: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!campaign) {
    return null;
  }

  const questions = campaign.questions || [];

  return {
    ...serializePublicCampaign(campaign),
    questions: questions.map(serializeQuestion),
    sections: buildSectionsFromQuestions(questions),
  };
}

export async function getCampaignByIdForAdmin(campaignId) {
  await ensureDatabaseReady();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: adminCampaignInclude,
  });

  return campaign ? serializeAdminCampaign(campaign) : null;
}

export async function createCampaign(payload) {
  await ensureDatabaseReady();

  const normalized = sanitizeCampaignPayload(payload);
  const slug = await ensureUniqueCampaignSlug(normalized.slug);

  const nextOrder =
    normalized.order == null
      ? ((await prisma.campaign.findFirst({ orderBy: { order: "desc" }, select: { order: true } }))?.order ?? -1) + 1
      : normalized.order;

  const created = await prisma.campaign.create({
    data: {
      title: normalized.title,
      slug,
      targetMarket: normalized.targetMarket,
      deadline: normalized.deadline,
      description: normalized.description,
      imageUrl: normalized.imageUrl,
      isPublished: normalized.isPublished,
      order: nextOrder,
      questions: {
        create: normalized.questions.map((question, index) => ({
          key: question.key,
          label: question.label,
          type: question.type,
          required: question.required,
          placeholder: question.placeholder,
          options: question.options,
          order: index,
          isVisible: question.isVisible,
          sectionKey: question.sectionKey,
          sectionTitle: question.sectionTitle,
          sectionDescription: question.sectionDescription,
          sectionOrder: question.sectionOrder,
        })),
      },
    },
    include: adminCampaignInclude,
  });

  return serializeAdminCampaign(created);
}

export async function updateCampaign(campaignId, payload) {
  await ensureDatabaseReady();

  const existingCampaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });

  if (!existingCampaign) {
    throw new Error("Campaign not found.");
  }

  const normalized = sanitizeCampaignPayload(payload);
  const slug = await ensureUniqueCampaignSlug(normalized.slug, campaignId);

  await prisma.$transaction(async (tx) => {
    await tx.campaign.update({
      where: { id: campaignId },
      data: {
        title: normalized.title,
        slug,
        targetMarket: normalized.targetMarket,
        deadline: normalized.deadline,
        description: normalized.description,
        imageUrl: normalized.imageUrl,
        isPublished: normalized.isPublished,
        ...(normalized.order == null ? {} : { order: normalized.order }),
      },
    });

    await tx.campaignQuestion.deleteMany({
      where: { campaignId },
    });

    await tx.campaignQuestion.createMany({
      data: normalized.questions.map((question, index) => ({
        campaignId,
        key: question.key,
        label: question.label,
        type: question.type,
        required: question.required,
        placeholder: question.placeholder,
        options: question.options,
        order: index,
        isVisible: question.isVisible,
        sectionKey: question.sectionKey,
        sectionTitle: question.sectionTitle,
        sectionDescription: question.sectionDescription,
        sectionOrder: question.sectionOrder,
      })),
    });
  });

  const updated = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: adminCampaignInclude,
  });

  if (!updated) {
    throw new Error("Campaign not found.");
  }

  return serializeAdminCampaign(updated);
}

export async function setCampaignPublishedState(campaignId, isPublished) {
  await ensureDatabaseReady();

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      isPublished: Boolean(isPublished),
    },
    include: adminCampaignInclude,
  });

  return serializeAdminCampaign(updated);
}

export async function deleteCampaign(campaignId) {
  await ensureDatabaseReady();

  await prisma.campaign.delete({
    where: { id: campaignId },
  });
}

export function normalizeCampaignResponseData(questions, submittedData) {
  const source = submittedData && typeof submittedData === "object" ? submittedData : null;

  if (!source) {
    throw new Error("Invalid response payload.");
  }

  const missingLabels = [];
  const cleaned = {};

  for (const question of questions) {
    if (!question?.isVisible) {
      continue;
    }

    const rawValue = source[question.key];
    const value = rawValue == null ? "" : String(rawValue).trim();

    if (question.required && !value) {
      missingLabels.push(question.label);
    }

    if (question.type === "select") {
      const options = normalizeOptions(question.options);
      if (value && options.length && !options.includes(value)) {
        throw new Error(`Invalid option selected for ${question.label}.`);
      }
    }

    cleaned[question.key] = value;
  }

  if (missingLabels.length) {
    throw new Error(`Missing required fields: ${missingLabels.join(", ")}`);
  }

  return cleaned;
}

export function toCsvString(columns, rows) {
  function neutralizeCsvFormula(value) {
    if (!value) return value;
    return /^[=+\-@]/.test(value) ? `'${value}` : value;
  }

  function escapeCell(value) {
    const normalized = neutralizeCsvFormula(value == null ? "" : String(value));
    const escaped = normalized.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  const headerRow = columns.map((column) => escapeCell(column.label)).join(",");

  const bodyRows = rows.map((row) => columns.map((column) => escapeCell(row[column.key])).join(","));

  return [headerRow, ...bodyRows].join("\n");
}

export async function getCampaignResponsesForAdmin(campaignId) {
  await ensureDatabaseReady();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
      responses: {
        orderBy: { submittedAt: "desc" },
      },
    },
  });

  if (!campaign) {
    return null;
  }

  return {
    campaign: {
      id: campaign.id,
      title: campaign.title,
      slug: campaign.slug,
      targetMarket: campaign.targetMarket,
      deadline: campaign.deadline,
      description: campaign.description,
      imageUrl: campaign.imageUrl,
      isPublished: campaign.isPublished,
    },
    questions: campaign.questions.map(serializeQuestion),
    responses: campaign.responses.map((response) => ({
      id: response.id,
      submittedAt: response.submittedAt,
      data: response.data && typeof response.data === "object" ? response.data : {},
    })),
  };
}
