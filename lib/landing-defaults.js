import { SERVICE_DESCRIPTION_MAX_WORDS, TEMPLATE_SECTIONS } from "./constants";

export const DEFAULT_SITE_TITLE = "Lesaal";

const DEFAULT_HERO_IMAGE = "/images/services/social-media-management.webp";
const DEFAULT_COMMENTARY_IMAGE = "/images/services/content-creation.webp";

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeWords(value, maxWords) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(" ");
}

function buildDefaultServices() {
  return [
    {
      title: "Social Media Management",
      description: "Plan, create, and publish social content that attracts qualified leads and builds consistent audience trust.",
      imageUrl: "/images/services/social-media-management.webp",
      label: "Growth",
      value: "Audience",
      extra: { tags: ["Content", "Community", "Growth"] },
      order: 0,
    },
    {
      title: "SEO Optimization",
      description: "Improve search visibility with technical fixes, on-page optimization, and content mapped to high-intent customer queries.",
      imageUrl: "/images/services/seo-optimization.webp",
      label: "Search",
      value: "Visibility",
      extra: { tags: ["Technical", "On-page", "Authority"] },
      order: 1,
    },
    {
      title: "PPC Advertising",
      description: "Launch measurable paid campaigns across search and social with budget controls and conversion-focused creative testing.",
      imageUrl: "/images/services/ppc-advertising.webp",
      label: "Paid Media",
      value: "Conversions",
      extra: { tags: ["Meta Ads", "Google Ads", "Optimization"] },
      order: 2,
    },
    {
      title: "Email Marketing",
      description: "Design lifecycle email flows and campaigns that nurture prospects, recover opportunities, and increase customer retention.",
      imageUrl: "/images/services/email-marketing.webp",
      label: "Retention",
      value: "Lifecycle",
      extra: { tags: ["Automation", "Nurture", "Retention"] },
      order: 3,
    },
    {
      title: "Lead Generation",
      description: "Create high-converting funnels with landing pages, offers, and targeting strategies that drive quality inbound leads.",
      imageUrl: "/images/services/lead-generation.webp",
      label: "Pipeline",
      value: "Demand",
      extra: { tags: ["Funnels", "Offers", "Lead Quality"] },
      order: 4,
    },
    {
      title: "Marketing Automation",
      description: "Connect marketing tools and automate repetitive workflows to scale outreach while keeping messaging personalized.",
      imageUrl: "/images/services/marketing-automation.webp",
      label: "Systems",
      value: "Scale",
      extra: { tags: ["CRM", "Automation", "Workflows"] },
      order: 5,
    },
    {
      title: "Brand Strategy",
      description: "Clarify your positioning, voice, and messaging to ensure every campaign communicates a consistent brand identity.",
      imageUrl: "/images/services/brand-strategy.webp",
      label: "Brand",
      value: "Positioning",
      extra: { tags: ["Messaging", "Positioning", "Voice"] },
      order: 6,
    },
    {
      title: "Analytics & Reporting",
      description: "Track the right KPIs with dashboards and reporting cadences that turn campaign data into clear growth decisions.",
      imageUrl: "/images/services/analytics-reporting.webp",
      label: "Insights",
      value: "Performance",
      extra: { tags: ["Dashboards", "Attribution", "KPIs"] },
      order: 7,
    },
  ].map((item) => ({
    ...item,
    description: normalizeWords(item.description, SERVICE_DESCRIPTION_MAX_WORDS),
  }));
}

export function getDefaultFormFields() {
  return [
    {
      key: "full_name",
      label: "Full Name",
      type: "text",
      placeholder: "Your full name",
      required: true,
      isVisible: true,
      order: 0,
      options: [],
    },
    {
      key: "email",
      label: "Email",
      type: "email",
      placeholder: "you@example.com",
      required: true,
      isVisible: true,
      order: 1,
      options: [],
    },
    {
      key: "phone",
      label: "Phone",
      type: "tel",
      placeholder: "+255 ...",
      required: false,
      isVisible: true,
      order: 2,
      options: [],
    },
    {
      key: "service_interest",
      label: "Service Interest",
      type: "select",
      placeholder: "",
      required: true,
      isVisible: true,
      order: 3,
      options: [
        "Social Media Management",
        "SEO Optimization",
        "PPC Advertising",
        "Email Marketing",
        "Lead Generation",
        "Marketing Automation",
      ],
    },
    {
      key: "message",
      label: "Project Brief",
      type: "textarea",
      placeholder: "Tell us about your goals, timeline, and desired outcomes.",
      required: true,
      isVisible: true,
      order: 4,
      options: [],
    },
  ];
}

export function getDefaultLandingSections() {
  return [
    {
      type: "HERO",
      title: "Hero",
      isVisible: true,
      order: 0,
      componentVariant: "DEFAULT",
      textAnimation: "FADE_UP",
      sectionAnimation: "FADE_IN",
      scrollAnimation: "PARALLAX",
      settings: {
        staticText: "Let us help you grow your reach through",
        dynamicWords: [
          "Social media management",
          "SEO optimization",
          "paid advertising",
          "content strategy",
          "marketing automation",
        ],
        description:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. We help brands launch faster and grow with confidence using data-driven campaigns.",
        imageUrl: DEFAULT_HERO_IMAGE,
        primaryCtaText: "Start your free trial",
        primaryCtaLink: "#campaign-form",
        secondaryCtaText: "Demo",
        secondaryCtaLink: "#services-grid",
      },
      items: [],
    },
    {
      type: "STATS_BAND",
      title: "Stats",
      isVisible: true,
      order: 1,
      componentVariant: "GRID",
      textAnimation: "FADE_UP",
      sectionAnimation: "FADE_IN",
      scrollAnimation: "NONE",
      settings: {
        heading: "Build Something Great",
        subheading: "Everything you need to build modern marketing campaigns that perform.",
      },
      items: [
        { title: "400+", description: "Readymade resources", label: "", value: "", order: 0 },
        { title: "600%", description: "Profit success", label: "", value: "", order: 1 },
        { title: "10K", description: "Global users", label: "", value: "", order: 2 },
        { title: "200+", description: "5-star reviews", label: "", value: "", order: 3 },
      ],
    },
    {
      type: "CAMPAIGN_FORM",
      title: "Campaign Form",
      isVisible: true,
      order: 2,
      componentVariant: "DEFAULT",
      textAnimation: "FADE_UP",
      sectionAnimation: "SLIDE_UP",
      scrollAnimation: "REVEAL",
      settings: {
        heading: "Ready to join our campaigns",
        subheading: "Be a part of our large community",
        submitText: "See all campaigns",
        successMessage: "Response submitted successfully.",
      },
      items: [],
    },
    {
      type: "CLIENT_LOGOS",
      title: "Clients",
      isVisible: true,
      order: 3,
      componentVariant: "GRID",
      textAnimation: "SLIDE_IN",
      sectionAnimation: "FADE_IN",
      scrollAnimation: "REVEAL",
      settings: {
        heading: "Clients we have worked with",
        subheading: "Trusted by teams across finance, health, commerce, and technology.",
      },
      items: [
        { title: "Boltshift", description: "", label: "", value: "", imageUrl: "/images/clients/boltshift.svg", order: 0 },
        { title: "Lightbox", description: "", label: "", value: "", imageUrl: "/images/clients/lightbox.svg", order: 1 },
        { title: "FeatherDev", description: "", label: "", value: "", imageUrl: "/images/clients/featherdev.svg", order: 2 },
        { title: "GlobalBank", description: "", label: "", value: "", imageUrl: "/images/clients/globalbank.svg", order: 3 },
        { title: "Spherule", description: "", label: "", value: "", imageUrl: "/images/clients/spherule.svg", order: 4 },
        { title: "Nitezsche", description: "", label: "", value: "", imageUrl: "/images/clients/nitezsche.svg", order: 5 },
      ],
    },
    {
      type: "SERVICES_GRID",
      title: "Services",
      isVisible: true,
      order: 4,
      componentVariant: "CARD",
      textAnimation: "FADE_UP",
      sectionAnimation: "FADE_IN",
      scrollAnimation: "REVEAL",
      settings: {
        heading: "All The Services You Need In One Place",
        subheading: "Choose the right service package for your growth stage.",
        seeAllText: "See all services",
        seeAllLink: "/services",
        maxHomeItems: 6,
      },
      items: buildDefaultServices(),
    },
    {
      type: "COMMENTARY",
      title: "Commentary",
      isVisible: true,
      order: 5,
      componentVariant: "DEFAULT",
      textAnimation: "FADE_UP",
      sectionAnimation: "SLIDE_UP",
      scrollAnimation: "REVEAL",
      settings: {
        heading: "What our clients say",
        subheading: "Real feedback from teams we support every month.",
      },
      items: [
        {
          title: "Lana Steiner",
          label: "Designer, Layers",
          description: "We've been using Lesaal to start every new marketing campaign and cannot imagine working without it.",
          imageUrl: DEFAULT_COMMENTARY_IMAGE,
          value: "5/5",
          order: 0,
          extra: {
            stars: 5,
          },
        },
      ],
    },
    {
      type: "PRICING",
      title: "Pricing",
      isVisible: true,
      order: 6,
      componentVariant: "CARD",
      textAnimation: "FADE_UP",
      sectionAnimation: "FADE_IN",
      scrollAnimation: "REVEAL",
      settings: {
        heading: "Plans that fit your scale",
        subheading: "Simple, transparent pricing that grows with your business.",
        recommendedPlanKey: "business-plan",
        monthlyLabel: "Monthly billing",
        annualLabel: "Annual billing",
        saveLabel: "Save 30%",
        defaultBillingMode: "monthly",
      },
      items: [
        {
          title: "Basic Plan",
          label: "For small teams",
          description: "Great for early-stage brands launching their first campaigns.",
          value: "$15 / month",
          order: 0,
          extra: {
            key: "basic-plan",
            ctaText: "Get started",
            ctaLink: "#campaign-form",
            monthlyPrice: "$15 / month",
            annualPrice: "$144 / year",
            features: [
              "Access to basic features",
              "Basic reporting and analytics",
              "Up to 3 campaigns",
              "Email support",
            ],
          },
        },
        {
          title: "Business Plan",
          label: "Recommended",
          description: "Advanced features and reporting for growing teams.",
          value: "$49 / month",
          order: 1,
          extra: {
            key: "business-plan",
            ctaText: "Get started",
            ctaLink: "#campaign-form",
            monthlyPrice: "$49 / month",
            annualPrice: "$470 / year",
            features: [
              "Everything in Basic",
              "Advanced analytics dashboard",
              "Up to 20 campaigns",
              "Priority support",
            ],
          },
        },
        {
          title: "Scale Plan",
          label: "For large teams",
          description: "Full-suite support, strategy consulting, and custom integrations.",
          value: "$99 / month",
          order: 2,
          extra: {
            key: "scale-plan",
            ctaText: "Talk to sales",
            ctaLink: "#campaign-form",
            monthlyPrice: "$99 / month",
            annualPrice: "$950 / year",
            features: [
              "Everything in Business",
              "Unlimited campaigns",
              "Dedicated account manager",
              "Custom integrations",
            ],
          },
        },
      ],
    },
    {
      type: "FAQ",
      title: "FAQ",
      isVisible: true,
      order: 7,
      componentVariant: "LIST",
      textAnimation: "FADE_UP",
      sectionAnimation: "FADE_IN",
      scrollAnimation: "NONE",
      settings: {
        heading: "Frequently asked questions",
        subheading: "Everything you need to know about the product and billing.",
      },
      items: [
        {
          title: "Is there a free trial available?",
          description: "Yes. Try us for free for 30 days with a personalized onboarding call for your team.",
          label: "",
          value: "",
          order: 0,
        },
        {
          title: "Can I change my plan later?",
          description: "Yes. You can upgrade or downgrade any time based on your monthly campaign needs.",
          label: "",
          value: "",
          order: 1,
        },
        {
          title: "What is your cancellation policy?",
          description: "You can cancel any time before your next billing period. No hidden lock-in contracts.",
          label: "",
          value: "",
          order: 2,
        },
        {
          title: "Can other info be added to an invoice?",
          description: "Yes. Share your preferred invoice details and we will include them for future billing cycles.",
          label: "",
          value: "",
          order: 3,
        },
        {
          title: "How does billing work?",
          description: "Billing is monthly by default. Annual billing can be enabled and includes discounted pricing.",
          label: "",
          value: "",
          order: 4,
        },
      ],
    },
    {
      type: "FOOTER",
      title: "Footer",
      isVisible: true,
      order: 8,
      componentVariant: "DEFAULT",
      textAnimation: "NONE",
      sectionAnimation: "FADE_IN",
      scrollAnimation: "NONE",
      settings: {
        heading: "Start your 30-day free trial",
        body: "Join over 4,000+ startups already growing with Lesaal.",
        ctaText: "Get started",
        ctaLink: "#campaign-form",
        brandDescription: "Boost sales with customer care, ads, and social media packages.",
        contactHeading: "Contact",
        contactEmail: "leilawaziri@lesaal.com",
        contactPhone: "+255 700 000 000",
        contactAddress: "Dar es Salaam, Tanzania",
        supportHours: "Mon - Fri, 9:00 AM - 6:00 PM",
        copyrightText: "Lesaal cc 2023",
        rightsText: "All rights reserved.",
      },
      items: [
        { title: "Product", label: "Explore", description: "", value: "#services-grid", order: 0 },
        { title: "Pricing", label: "Explore", description: "", value: "#pricing", order: 1 },
        { title: "FAQ", label: "Explore", description: "", value: "#faq", order: 2 },
        { title: "Privacy policy", label: "Legal", description: "", value: "#", order: 3 },
        { title: "Terms of service", label: "Legal", description: "", value: "#", order: 4 },
        { title: "Contact", label: "Support", description: "", value: "mailto:leilawaziri@lesaal.com", order: 5 },
      ],
    },
  ];
}

export function createTemplateSection(type, order) {
  const templateType = TEMPLATE_SECTIONS.some((section) => section.type === type) ? type : TEMPLATE_SECTIONS[0].type;
  const template = getDefaultLandingSections().find((section) => section.type === templateType) || getDefaultLandingSections()[0];

  return {
    ...cloneValue(template),
    type: templateType,
    order,
    title: template.title,
    items: (template.items || []).map((item, itemOrder) => ({
      ...cloneValue(item),
      order: itemOrder,
    })),
  };
}
