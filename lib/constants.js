export const SESSION_COOKIE_NAME = "admin_session";
export const SESSION_IDLE_TIMEOUT_MINUTES = 5;
export const SESSION_COOKIE_LIFETIME_DAYS = 7;
export const OTP_EXPIRY_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const SERVICE_DESCRIPTION_MAX_WORDS = 20;
export const DEFAULT_NOTIFY_EMAIL = "leilawaziri@lesaal.com";

export const ADMIN_NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Users", href: "/admin/users" },
  { label: "Campaigns", href: "/admin/campaigns" },
  { label: "Notifications", href: "/admin/notifications" },
  { label: "Landing Page", href: "/admin/landing-page" },
  { label: "CRM", href: "/admin/crm" },
  { label: "Calendar", href: "/admin/calendar" },
  { label: "Profile", href: "/admin/profile" },
];

export const DEDICATED_SECTION_TYPES = [
  "HERO",
  "STATS_BAND",
  "CLIENT_LOGOS",
  "SERVICES_GRID",
  "COMMENTARY",
  "PRICING",
  "FAQ",
  "CAMPAIGN_FORM",
  "FOOTER",
];

export const LEGACY_SECTION_TYPES = [
  "SERVICES",
  "CLIENTS_TESTIMONY",
  "CARDS",
  "LIST",
  "TABLE",
  "RICH_TEXT",
  "CTA",
  "FORM",
];

export const SECTION_TYPE_OPTIONS = [...DEDICATED_SECTION_TYPES, ...LEGACY_SECTION_TYPES];

export const COMPONENT_VARIANT_OPTIONS = ["DEFAULT", "CARD", "LIST", "TABLE", "GRID"];
export const TEXT_ANIMATION_OPTIONS = ["NONE", "FADE_UP", "SLIDE_IN", "ZOOM_IN", "TYPEWRITER"];
export const SECTION_ANIMATION_OPTIONS = ["NONE", "FADE_IN", "SCALE_IN", "SLIDE_UP"];
export const SCROLL_ANIMATION_OPTIONS = ["NONE", "PARALLAX", "STICKY", "REVEAL"];

export const TEMPLATE_SECTIONS = [
  { label: "Hero", type: "HERO", variant: "DEFAULT" },
  { label: "Stats Band", type: "STATS_BAND", variant: "GRID" },
  { label: "Client Logos", type: "CLIENT_LOGOS", variant: "GRID" },
  { label: "Services Grid", type: "SERVICES_GRID", variant: "CARD" },
  { label: "Commentary", type: "COMMENTARY", variant: "DEFAULT" },
  { label: "Pricing", type: "PRICING", variant: "CARD" },
  { label: "FAQ", type: "FAQ", variant: "LIST" },
  { label: "Campaign Form", type: "CAMPAIGN_FORM", variant: "DEFAULT" },
  { label: "Footer", type: "FOOTER", variant: "DEFAULT" },
];

export const FORM_FIELD_TYPES = ["text", "email", "tel", "textarea", "select"];
