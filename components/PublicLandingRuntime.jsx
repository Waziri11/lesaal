"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

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

function formatCampaignDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

function sortItems(items) {
  return (Array.isArray(items) ? items : []).slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

export default function PublicLandingRuntime({ config, campaigns = [] }) {
  const [activeFaqItemId, setActiveFaqItemId] = useState(null);
  const [dynamicWordIndex, setDynamicWordIndex] = useState(0);
  const [typedDynamicWord, setTypedDynamicWord] = useState("");
  const [isDeletingDynamicWord, setIsDeletingDynamicWord] = useState(false);

  const sections = Array.isArray(config?.sections) ? config.sections : [];

  const visibleSections = useMemo(
    () => sections.filter((section) => section?.isVisible).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [sections]
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
  }, [dynamicWordIndex, heroRotationWords, isDeletingDynamicWord, typedDynamicWord]);

  useEffect(() => {
    const faqSection = visibleSections.find((section) => section.type === "FAQ");
    const faqItems = sortItems(faqSection?.items);

    if (!faqSection || !faqItems.length) {
      setActiveFaqItemId(null);
      return;
    }

    if (!faqItems.some((item) => item.id === activeFaqItemId)) {
      setActiveFaqItemId(faqItems[0].id);
    }
  }, [visibleSections, activeFaqItemId]);

  const campaignHighlights = Array.isArray(campaigns) ? campaigns : [];

  return (
    <div className="lp-shell">
      <header className="lp-header">
        <a href="#top" className="lp-brand">
          <img src="/images/logo/LESAAL.png" alt="Lesaal logo" />
          <span>Lesaal</span>
        </a>

        <nav className="lp-nav">
          {navigationLinks.map((link) => (
            <a key={link.key} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="lp-header-actions">
          <a href="/admin/login" className="lp-action-link lp-action-login">
            Log in
          </a>
          <a href="/signup" className="lp-action-link lp-action-signup">
            Sign up
          </a>
        </div>
      </header>

      <main className="lp-main">
        {visibleSections.map((section) => {
          const settings = section.settings || {};
          const textClass = textAnimationClass(section.textAnimation);
          const scrollClass = scrollAnimationClass(section.scrollAnimation);
          const sectionMotion = getSectionMotion(section.sectionAnimation);
          const anchorId = sectionAnchors[section.id];
          const sectionTextVars = textStyleToCssVars(settings.textStyle);

          if (section.type === "HERO") {
            const heroWords = heroRotationWords.length ? heroRotationWords : ["Social media management"];
            const activeWordIndex = dynamicWordIndex % heroWords.length;
            const currentWord = heroWords[activeWordIndex] || "";
            const displayedDynamicWord = typedDynamicWord || currentWord;
            const heroStatsItems = sortItems(statsBandSection?.items).slice(0, 2);
            const statPrimaryItem = heroStatsItems[0] || null;
            const statSecondaryItem = heroStatsItems[1] || null;

            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-hero ${scrollClass}`}
                {...sectionMotion}
                style={sectionTextVars}
              >
                <div className="lp-hero-background">
                  {settings.imageUrl ? (
                    <img src={settings.imageUrl} alt="Marketing growth visual" />
                  ) : (
                    <div className="lp-image-placeholder">No image selected</div>
                  )}
                </div>

                <div className="lp-hero-content">
                  <h1 className={`lp-hero-headline ${textClass}`}>
                    <span className="lp-hero-headline-static">
                      {settings.staticText || "Let us help you grow your reach through"}
                    </span>{" "}
                    <span className="lp-hero-headline-dynamic is-type-active">{displayedDynamicWord || "Social media management"}</span>
                  </h1>

                  <p className={`lp-hero-description ${textClass}`}>
                    {settings.description || settings.body || "Add a short value proposition for your homepage hero."}
                  </p>

                  <div className="lp-hero-actions">
                    <a href={settings.primaryCtaLink || "#campaign-form"} className="lp-btn lp-btn-primary">
                      {settings.primaryCtaText || "Start your free trial"}
                    </a>

                    <a href={settings.secondaryCtaLink || "#services-grid"} className="lp-btn lp-btn-ghost">
                      {settings.secondaryCtaText || "Demo"}
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

                    <p>{statSecondaryItem?.description || "From 250+ reviews"}</p>
                  </div>
                </div>

                <div className="lp-hero-floating-card">
                  <p>Today&apos;s revenue</p>
                  <strong>{statPrimaryItem?.title || "$1,280"}</strong>
                  <span>{statPrimaryItem?.description || "Performance metric"}</span>
                </div>
              </motion.section>
            );
          }

          if (section.type === "STATS_BAND") {
            const items = sortItems(section.items);
            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-stats-band ${scrollClass}`}
                {...sectionMotion}
                style={sectionTextVars}
              >
                <div className="lp-section-heading center">
                  <h2 className={textClass}>{settings.heading || "Build Something Great"}</h2>
                  <p className={`lp-section-copy ${textClass}`}>
                    {settings.subheading || "Everything you need to build modern UI and great products."}
                  </p>
                </div>

                <div className="lp-stats-grid">
                  {items.map((item) => (
                    <article key={item.id} className="lp-stat-card">
                      <h3>{item.title || "400+"}</h3>
                      <p>{item.description || "Metric label"}</p>
                    </article>
                  ))}
                </div>
              </motion.section>
            );
          }

          if (section.type === "CLIENT_LOGOS") {
            const items = sortItems(section.items);
            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-clients ${scrollClass}`}
                {...sectionMotion}
                style={sectionTextVars}
              >
                <div className="lp-section-heading">
                  <h2 className={textClass}>{settings.heading || section.title}</h2>
                  <p className={`lp-section-copy ${textClass}`}>{settings.subheading || "Tap to edit this section intro."}</p>
                </div>

                <div className="lp-client-grid">
                  {items.map((item) => (
                    <article key={item.id} className="lp-client-card">
                      <div className="lp-client-logo-wrap">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={`${item.title || "Client"} logo`} />
                        ) : (
                          <div className="lp-image-placeholder">No logo</div>
                        )}
                      </div>
                      <h4>{item.title || "Client Name"}</h4>
                    </article>
                  ))}
                </div>
              </motion.section>
            );
          }

          if (section.type === "SERVICES_GRID") {
            const maxHomeItems = Math.max(1, Number.parseInt(String(settings.maxHomeItems || 6), 10) || 6);
            const servicesToRender = sortItems(section.items).slice(0, maxHomeItems);

            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-services ${scrollClass}`}
                {...sectionMotion}
                style={sectionTextVars}
              >
                <div className="lp-section-heading">
                  <h2 className={textClass}>{settings.heading || section.title}</h2>
                  <p className={`lp-section-copy ${textClass}`}>{settings.subheading || "Tap to edit this section intro."}</p>
                </div>

                <div className="lp-services-grid">
                  {servicesToRender.map((item) => {
                    const tags = Array.isArray(item.extra?.tags) ? item.extra.tags : [];
                    return (
                      <article key={item.id} className="lp-service-card">
                        <div className="lp-service-image-wrap">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title || "Service image"} />
                          ) : (
                            <div className="lp-image-placeholder">No image</div>
                          )}

                          <div className="lp-service-overlay">
                            <h3>{item.title || "Service title"}</h3>
                            <p>{item.description || "Service description"}</p>
                          </div>
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
                  <a href={settings.seeAllLink || "/services"} className="lp-btn lp-btn-primary">
                    {settings.seeAllText || "See all services"}
                  </a>
                </div>
              </motion.section>
            );
          }

          if (section.type === "COMMENTARY") {
            const commentaryItem = sortItems(section.items)[0] || null;

            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-commentary ${scrollClass}`}
                {...sectionMotion}
                style={sectionTextVars}
              >
                <div className="lp-section-heading">
                  <h2 className={textClass}>{settings.heading || section.title}</h2>
                  <p className={`lp-section-copy ${textClass}`}>{settings.subheading || "Tap to edit this section intro."}</p>
                </div>

                <div className="lp-commentary-stage">
                  <div className="lp-commentary-background">
                    {commentaryItem?.imageUrl ? (
                      <img src={commentaryItem.imageUrl} alt={commentaryItem.title || "Client commentary"} />
                    ) : (
                      <div className="lp-image-placeholder">No image</div>
                    )}
                  </div>

                  <div className="lp-commentary-quote">
                    {commentaryItem ? (
                      <>
                        <blockquote>{commentaryItem.description || "Client quote"}</blockquote>
                        <p className="lp-commentary-name">{commentaryItem.title || "Client Name"}</p>
                        <p className="lp-commentary-role">{commentaryItem.label || "Role"}</p>
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
            const items = sortItems(section.items);

            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-pricing ${scrollClass}`}
                {...sectionMotion}
                style={sectionTextVars}
              >
                <div className="lp-section-heading">
                  <h2 className={textClass}>{settings.heading || section.title}</h2>
                  <p className={`lp-section-copy ${textClass}`}>{settings.subheading || "Tap to edit this section intro."}</p>
                </div>

                <div className="lp-pricing-toggle" aria-hidden="true">
                  <span className="is-active">Monthly billing</span>
                  <span>Annual billing</span>
                  <span>Save 30%</span>
                </div>

                <div className="lp-pricing-grid">
                  {items.map((item) => {
                    const features = Array.isArray(item.extra?.features) ? item.extra.features : [];
                    const itemKey = String(item.extra?.key || item.id || "");
                    const isRecommended = Boolean(itemKey && itemKey === recommendedKey);
                    const ctaText = String(item.extra?.ctaText || "Get started");
                    const ctaLink = String(item.extra?.ctaLink || "#campaign-form");

                    return (
                      <article key={item.id} className={`lp-plan-card${isRecommended ? " is-recommended" : ""}`}>
                        {isRecommended ? <span className="lp-plan-badge">Recommended</span> : null}
                        {item.imageUrl ? (
                          <div className="lp-plan-media">
                            <img src={item.imageUrl} alt={item.title || "Pricing plan"} />
                          </div>
                        ) : null}
                        <h3>{item.title || "Plan"}</h3>
                        <p className="lp-plan-label">{item.label || "Plan summary"}</p>
                        <p className="lp-plan-price">{item.value || "$49 / month"}</p>
                        <p className="lp-plan-description">{item.description || "Plan description"}</p>

                        <p className="lp-plan-features-label">FEATURES</p>

                        {features.length ? (
                          <ul className="lp-plan-features">
                            {features.map((feature, featureIndex) => (
                              <li key={`${item.id}_feature_${featureIndex}`}>{feature}</li>
                            ))}
                          </ul>
                        ) : null}

                        <a href={ctaLink} className="lp-btn lp-btn-primary lp-plan-cta">
                          {ctaText}
                        </a>
                      </article>
                    );
                  })}
                </div>
              </motion.section>
            );
          }

          if (section.type === "FAQ") {
            const items = sortItems(section.items);
            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-faq ${scrollClass}`}
                {...sectionMotion}
                style={sectionTextVars}
              >
                <div className="lp-section-heading">
                  <h2 className={textClass}>{settings.heading || section.title}</h2>
                  <p className={`lp-section-copy ${textClass}`}>{settings.subheading || "Tap to edit this section intro."}</p>
                </div>

                <div className="lp-faq-list">
                  {items.map((item) => {
                    const isOpen = activeFaqItemId === item.id;

                    return (
                      <article key={item.id} className={`lp-faq-item${isOpen ? " is-open" : ""}`}>
                        <button
                          type="button"
                          className="lp-faq-trigger"
                          onClick={() => setActiveFaqItemId((current) => (current === item.id ? null : item.id))}
                        >
                          <span>{item.title || "Question"}</span>
                          <span>{isOpen ? "−" : "+"}</span>
                        </button>
                        {isOpen ? (
                          <div className="lp-faq-answer">
                            <p>{item.description || "Answer"}</p>
                            {item.imageUrl ? (
                              <div className="lp-faq-image-wrap">
                                <img src={item.imageUrl} alt={item.title || "FAQ visual"} />
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
                className={`lp-section lp-campaign ${scrollClass}`}
                {...sectionMotion}
                style={sectionTextVars}
              >
                <div className="lp-section-heading">
                  <h2 className={textClass}>{settings.heading || section.title}</h2>
                  <p className={`lp-section-copy ${textClass}`}>{settings.subheading || "Tap to edit this section intro."}</p>
                </div>

                <div className="lp-campaign-carousel">
                  {campaignHighlights.length ? (
                    campaignHighlights.map((campaign) => (
                      <article key={campaign.id || campaign.slug} className="lp-campaign-slide">
                        <div className="lp-campaign-slide-media">
                          <a href={`/campaigns/${campaign.slug}`}>
                            {campaign.imageUrl ? (
                              <img src={campaign.imageUrl} alt={campaign.title || "Campaign"} />
                            ) : (
                              <div className="lp-image-placeholder">Campaign image</div>
                            )}
                          </a>
                        </div>

                        <div className="lp-campaign-slide-content">
                          <h3>{campaign.title || "Campaign"}</h3>
                          <p>{campaign.description || "Campaign details coming soon."}</p>
                          {campaign.targetMarket ? <p>Target market: {campaign.targetMarket}</p> : null}
                          {campaign.deadline ? <p>Active until: {formatCampaignDate(campaign.deadline)}</p> : null}
                          <a href={`/campaigns/${campaign.slug}`} className="lp-btn lp-btn-primary">
                            Join Campaign
                          </a>
                        </div>
                      </article>
                    ))
                  ) : (
                    <article className="lp-campaign-slide lp-campaign-slide-empty">
                      <div className="lp-campaign-slide-content">
                        <h3>No campaigns published yet</h3>
                        <p>Create and publish campaigns in the admin dashboard to populate this carousel.</p>
                      </div>
                    </article>
                  )}
                </div>

                <div className="lp-campaign-cta-row">
                  <a href="/campaigns" className="lp-btn lp-btn-ghost">
                    {settings.submitText || "See all campaigns"}
                  </a>
                </div>
              </motion.section>
            );
          }

          if (section.type === "FOOTER") {
            const contactEmail = settings.contactEmail || "leilawaziri@lesaal.com";
            const linkItems = sortItems(section.items);

            return (
              <motion.section
                id={anchorId}
                key={section.id}
                className={`lp-section lp-footer-wrap ${scrollClass}`}
                {...sectionMotion}
                style={sectionTextVars}
              >
                <div className="lp-footer-cta">
                  <div>
                    <h2>{settings.heading || "Start your 30-day free trial"}</h2>
                    <p>{settings.body || "Join over 4,000+ startups already growing with Lesaal."}</p>
                  </div>
                  <a href={settings.ctaLink || "#campaign-form"} className="lp-btn lp-btn-primary">
                    {settings.ctaText || "Get started"}
                  </a>
                </div>

                <div className="lp-footer-main">
                  <div className="lp-footer-brand">
                    <a href="#top">
                      <img src="/images/logo/LESAAL.png" alt="Lesaal logo" />
                      <span>Lesaal</span>
                    </a>
                    <p>Boost sales with customer care, ads, and social media packages.</p>
                  </div>

                  <div className="lp-footer-links">
                    {linkItems.map((item) => (
                      <a key={item.id} href={item.value || "#"} className="lp-footer-link">
                        {item.title || "Footer Link"}
                      </a>
                    ))}
                  </div>

                  <div className="lp-footer-contact">
                    <h4>Contact</h4>
                    <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                  </div>
                </div>
              </motion.section>
            );
          }

          return (
            <motion.section
              id={anchorId}
              key={section.id}
              className={`lp-section ${scrollClass}`}
              {...sectionMotion}
              style={sectionTextVars}
            >
              <div className="lp-section-heading">
                <h2 className={textClass}>{settings.heading || section.title}</h2>
                <p className={`lp-section-copy ${textClass}`}>{settings.subheading || "Tap to edit this section intro."}</p>
              </div>
            </motion.section>
          );
        })}
      </main>
    </div>
  );
}
