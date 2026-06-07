"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import HeroTypewriter from "./HeroTypewriter";

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

function formatCampaignTimeRemaining(value, nowTimestamp = Date.now()) {
  if (!value) return "No deadline";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No deadline";

  const diffMs = parsed.getTime() - nowTimestamp;

  if (diffMs <= 0) {
    return "Expired";
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  if (totalMinutes < 60) {
    return `${Math.max(1, totalMinutes)} minute${totalMinutes === 1 ? "" : "s"}`;
  }

  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours} hour${totalHours === 1 ? "" : "s"}`;
  }

  const totalDays = Math.floor(totalHours / 24);
  if (totalDays < 30) {
    return `${totalDays} day${totalDays === 1 ? "" : "s"}`;
  }

  const totalMonths = Math.floor(totalDays / 30);
  if (totalMonths < 12) {
    return `${totalMonths} month${totalMonths === 1 ? "" : "s"}`;
  }

  const totalYears = Math.floor(totalDays / 365);
  return `${totalYears} year${totalYears === 1 ? "" : "s"}`;
}

function toPhoneHref(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");

  return normalized ? `tel:${normalized}` : "";
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

function shouldUnoptimizeImage(src) {
  if (typeof src !== "string" || !src) {
    return true;
  }

  if (!src.startsWith("/")) {
    return true;
  }

  const normalizedPath = src.split("?")[0].toLowerCase();
  return normalizedPath.endsWith(".svg");
}

function LandingImage({ src, alt, className, sizes, width = 1200, height = 800, priority = false }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      unoptimized={shouldUnoptimizeImage(src)}
      className={className}
    />
  );
}

export default function PublicLandingRuntime({ config, campaigns = [] }) {
  const [activeFaqItemId, setActiveFaqItemId] = useState(null);
  const [activeCampaignIndex, setActiveCampaignIndex] = useState(0);
  const [nowTimestamp, setNowTimestamp] = useState(() => Date.now());

  const sections = Array.isArray(config?.sections) ? config.sections : [];

  const visibleSections = useMemo(
    () => sections.filter((section) => section?.isVisible).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [sections]
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

  const campaignHighlights = useMemo(() => (Array.isArray(campaigns) ? campaigns : []), [campaigns]);

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

  useEffect(() => {
    if (!campaignHighlights.length) {
      setActiveCampaignIndex(0);
      return;
    }

    setActiveCampaignIndex((current) => Math.min(current, campaignHighlights.length - 1));
  }, [campaignHighlights.length]);

  useEffect(() => {
    if (campaignHighlights.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveCampaignIndex((current) => (current >= campaignHighlights.length - 1 ? 0 : current + 1));
    }, 5500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [campaignHighlights.length]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowTimestamp(Date.now());
    }, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  function goToCampaign(index) {
    if (!campaignHighlights.length) return;
    const lastIndex = campaignHighlights.length - 1;
    const nextIndex = Math.min(lastIndex, Math.max(0, Number(index) || 0));
    setActiveCampaignIndex(nextIndex);
  }

  function goToPrevCampaign() {
    if (!campaignHighlights.length) return;
    const lastIndex = campaignHighlights.length - 1;
    setActiveCampaignIndex((current) => (current <= 0 ? lastIndex : current - 1));
  }

  function goToNextCampaign() {
    if (!campaignHighlights.length) return;
    const lastIndex = campaignHighlights.length - 1;
    setActiveCampaignIndex((current) => (current >= lastIndex ? 0 : current + 1));
  }

  return (
    <div className="lp-shell">
      <header className="lp-header">
        <a href="#top" className="lp-brand">
          <LandingImage src="/images/logo/LESAAL.png" alt="Lesaal logo" width={96} height={96} sizes="96px" priority />
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
                    <LandingImage
                      src={settings.imageUrl}
                      alt="Marketing growth visual"
                      width={1600}
                      height={1000}
                      sizes="100vw"
                      priority
                    />
                  ) : (
                    <div className="lp-image-placeholder">No image selected</div>
                  )}
                </div>

                <div className="lp-hero-content">
                  <h1 className={`lp-hero-headline ${textClass}`}>
                    <span className="lp-hero-headline-static">
                      {settings.staticText || "Let us help you grow your reach through"}
                    </span>{" "}
                    <HeroTypewriter
                      className="lp-hero-headline-dynamic is-type-active"
                      words={settings.dynamicWords}
                      fallback="Social media management"
                    />
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
                          <LandingImage
                            src={item.imageUrl}
                            alt={`${item.title || "Client"} logo`}
                            width={320}
                            height={160}
                            sizes="(min-width: 1024px) 12vw, (min-width: 768px) 18vw, 28vw"
                          />
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
                            <LandingImage
                              src={item.imageUrl}
                              alt={item.title || "Service image"}
                              width={960}
                              height={640}
                              sizes="(min-width: 1280px) 24vw, (min-width: 768px) 42vw, 100vw"
                            />
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
                      <LandingImage
                        src={commentaryItem.imageUrl}
                        alt={commentaryItem.title || "Client commentary"}
                        width={1200}
                        height={800}
                        sizes="(min-width: 1024px) 55vw, 100vw"
                      />
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
                            <LandingImage
                              src={item.imageUrl}
                              alt={item.title || "Pricing plan"}
                              width={900}
                              height={600}
                              sizes="(min-width: 1280px) 24vw, (min-width: 768px) 42vw, 100vw"
                            />
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
                                <LandingImage
                                  src={item.imageUrl}
                                  alt={item.title || "FAQ visual"}
                                  width={960}
                                  height={640}
                                  sizes="(min-width: 1024px) 40vw, 100vw"
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
                className={`lp-section lp-campaign lp-campaign-featured ${scrollClass}`}
                {...sectionMotion}
                style={sectionTextVars}
              >
                <div className="lp-section-heading">
                  <h2 className={textClass}>{settings.heading || section.title}</h2>
                  <p className={`lp-section-copy ${textClass}`}>{settings.subheading || "Tap to edit this section intro."}</p>
                </div>

                <div className="lp-campaign-carousel" aria-label="Campaign highlights">
                  {campaignHighlights.length ? (
                    <>
                      <div className="lp-campaign-track" style={{ transform: `translateX(-${activeCampaignIndex * 100}%)` }}>
                        {campaignHighlights.map((campaign, index) => (
                          <article key={campaign.id || campaign.slug} className="lp-campaign-slide" aria-hidden={index !== activeCampaignIndex}>
                            <div className="lp-campaign-slide-media">
                              <a href={`/campaigns/${campaign.slug}`} aria-label={`Open ${campaign.title || "campaign"} form`}>
                                {campaign.imageUrl ? (
                                  <LandingImage
                                    src={campaign.imageUrl}
                                    alt={campaign.title || "Campaign"}
                                    width={1920}
                                    height={1080}
                                    sizes="100vw"
                                  />
                                ) : (
                                  <div className="lp-image-placeholder">Campaign image</div>
                                )}
                              </a>
                            </div>

                            <div className="lp-campaign-slide-content">
                              <h3>{campaign.title || "Campaign"}</h3>
                              <p>{campaign.description || "Campaign details coming soon."}</p>
                              <div className="lp-campaign-meta">
                                {campaign.targetMarket ? (
                                  <p>
                                    <strong>Target market:</strong> {campaign.targetMarket}
                                  </p>
                                ) : null}
                              </div>
                              <div className="lp-campaign-meta-row">
                                <p className="lp-campaign-time-remaining">
                                  <strong>Time remaining:</strong> {formatCampaignTimeRemaining(campaign.deadline, nowTimestamp)}
                                </p>
                                <a href={`/campaigns/${campaign.slug}`} className="lp-btn lp-btn-primary lp-campaign-slide-cta">
                                  Apply Now
                                </a>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>

                      {campaignHighlights.length > 1 ? (
                        <>
                          <div className="lp-campaign-controls">
                            <button type="button" onClick={goToPrevCampaign} aria-label="Previous campaign">
                              ‹
                            </button>
                            <button type="button" onClick={goToNextCampaign} aria-label="Next campaign">
                              ›
                            </button>
                          </div>

                          <div className="lp-campaign-dots" role="tablist" aria-label="Choose campaign slide">
                            {campaignHighlights.map((campaign, index) => (
                              <button
                                key={campaign.id || campaign.slug || index}
                                type="button"
                                role="tab"
                                aria-selected={index === activeCampaignIndex}
                                aria-label={`View ${campaign.title || `campaign ${index + 1}`}`}
                                className={index === activeCampaignIndex ? "is-active" : ""}
                                onClick={() => goToCampaign(index)}
                              />
                            ))}
                          </div>
                        </>
                      ) : null}
                    </>
                  ) : (
                    <article className="lp-campaign-slide lp-campaign-slide-empty">
                      <div className="lp-campaign-slide-content">
                        <h3>No campaigns published yet</h3>
                        <p>Create and publish campaigns in the admin dashboard to populate this carousel.</p>
                      </div>
                    </article>
                  )}
                </div>
              </motion.section>
            );
          }

          if (section.type === "FOOTER") {
            const brandDescription = settings.brandDescription || "Boost sales with customer care, ads, and social media packages.";
            const contactHeading = settings.contactHeading || "Contact";
            const contactEmail = settings.contactEmail || "leilawaziri@lesaal.com";
            const contactPhone = String(settings.contactPhone || "").trim();
            const contactAddress = String(settings.contactAddress || "").trim();
            const supportHours = String(settings.supportHours || "").trim();
            const copyrightText = settings.copyrightText || "Lesaal cc 2023";
            const rightsText = settings.rightsText || "All rights reserved.";
            const contactPhoneHref = toPhoneHref(contactPhone);
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
                      <LandingImage src="/images/logo/LESAAL.png" alt="Lesaal logo" width={84} height={84} sizes="84px" />
                      <span>Lesaal</span>
                    </a>
                    <p>{brandDescription}</p>
                  </div>

                  <div className="lp-footer-links">
                    {linkItems.map((item) => (
                      <a key={item.id} href={item.value || "#"} className="lp-footer-link">
                        {item.title || "Footer Link"}
                      </a>
                    ))}
                  </div>

                  <div className="lp-footer-contact">
                    <h4>{contactHeading}</h4>
                    <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
                    {contactPhone && contactPhoneHref ? <a href={contactPhoneHref}>{contactPhone}</a> : null}
                    {contactAddress ? <p>{contactAddress}</p> : null}
                    {supportHours ? <p>{supportHours}</p> : null}
                  </div>
                </div>

                <div className="lp-footer-bottom">
                  <p>{copyrightText}</p>
                  <p>{rightsText}</p>
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
