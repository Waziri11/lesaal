"use client";

import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SmoothScroll from "./SmoothScroll";
import { METRICS, SERVICES, STORY_PANELS, TESTIMONIALS } from "../data/siteData";

gsap.registerPlugin(ScrollTrigger);

export default function ModernLanding() {
  const rootRef = useRef(null);
  const storyRef = useRef(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-animate", {
        y: 72,
        opacity: 0,
        duration: 1.1,
        stagger: 0.14,
        ease: "power3.out",
      });

      gsap.to(".hero-orb", {
        yPercent: -30,
        scale: 1.25,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "+=900",
          scrub: true,
        },
      });

      gsap.utils.toArray(".reveal").forEach((section) => {
        gsap.from(section, {
          y: 80,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 82%",
          },
        });
      });

      gsap.utils.toArray(".service-card").forEach((card, index) => {
        gsap.from(card, {
          y: 72,
          rotateX: 8,
          opacity: 0,
          duration: 0.9,
          delay: index * 0.05,
          ease: "power3.out",
          scrollTrigger: {
            trigger: card,
            start: "top 90%",
          },
        });
      });

      ScrollTrigger.matchMedia({
        "(min-width: 900px)": () => {
          const panels = gsap.utils.toArray(".story-panel");
          if (!panels.length) return;

          gsap.to(panels, {
            xPercent: -100 * (panels.length - 1),
            ease: "none",
            scrollTrigger: {
              trigger: storyRef.current,
              start: "top top",
              end: () => `+=${window.innerWidth * (panels.length - 1)}`,
              pin: true,
              scrub: 1,
              snap: 1 / (panels.length - 1),
              invalidateOnRefresh: true,
            },
          });
        },
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <>
      <SmoothScroll />
      <div className="site-shell" ref={rootRef}>
        <header className="site-nav">
          <a href="#top" className="brand-mark">
            LESAAL <span>MARKETING</span>
          </a>
          <nav className="nav-links">
            <a href="#services">Services</a>
            <a href="#results">Results</a>
            <a href="#contact">Contact</a>
          </nav>
          <motion.a
            href="#contact"
            className="nav-cta"
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
          >
            Book Strategy Call
          </motion.a>
        </header>

        <main>
          <section id="top" className="hero">
            <div className="hero-grid" aria-hidden="true" />
            <div className="hero-orb" aria-hidden="true" />
            <p className="hero-eyebrow hero-animate">Growth Marketing Studio</p>
            <h1 className="hero-title hero-animate">
              A modern growth engine built to turn traffic into real revenue.
            </h1>
            <p className="hero-copy hero-animate">
              Lesaal Marketing is a tech-driven digital marketing agency dedicated to the
              Tanzanian market. We provide realistic, localized marketing solutions designed to help
              new businesses launch successfully and established brands scale. By combining
              innovative technology with a deep understanding of local culture, we ensure your
              message resonates authentically with Tanzanian audiences.
            </p>
            <div className="hero-actions hero-animate">
              <motion.a
                href="#services"
                className="primary-btn"
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                Explore Services
              </motion.a>
              <motion.a
                href="#results"
                className="ghost-btn"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
              >
                See Proof
              </motion.a>
            </div>
          </section>

          <section className="metrics reveal" aria-label="Key metrics">
            {METRICS.map((metric) => (
              <article className="metric-card" key={metric.label}>
                <h2>{metric.value}</h2>
                <p>{metric.label}</p>
              </article>
            ))}
          </section>

          <section className="story" ref={storyRef}>
            <div className="story-track">
              {STORY_PANELS.map((panel) => (
                <article className="story-panel" key={panel.title}>
                  <p className="story-eyebrow">{panel.eyebrow}</p>
                  <h3>{panel.title}</h3>
                  <p>{panel.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section id="services" className="services reveal">
            <div className="section-header">
              <p>Services</p>
              <h2>Everything wired to performance, not vanity.</h2>
            </div>
            <div className="services-grid">
              {SERVICES.map((service) => (
                <motion.article
                  key={service.title}
                  className="service-card"
                  whileHover={{ y: -8, rotateX: -2 }}
                  transition={{ type: "spring", stiffness: 220, damping: 18 }}
                >
                  <div className="service-image-wrap">
                    <img src={service.image} alt={service.title} loading="lazy" />
                  </div>
                  <div className="service-content">
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                    <div className="tag-row">
                      {service.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </section>

          <section id="results" className="testimonials reveal">
            <div className="section-header">
              <p>Client Feedback</p>
              <h2>Teams choose us when they need momentum now.</h2>
            </div>
            <div className="testimonial-grid">
              {TESTIMONIALS.map((item) => (
                <motion.blockquote
                  key={item.author}
                  className="testimonial-card"
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 240, damping: 20 }}
                >
                  <p>“{item.quote}”</p>
                  <footer>
                    <strong>{item.author}</strong>
                    <span>{item.role}</span>
                  </footer>
                </motion.blockquote>
              ))}
            </div>
          </section>

          <section id="contact" className="cta reveal">
            <p>Ready to scale with clarity?</p>
            <h2>Let’s build your next growth sprint.</h2>
            <motion.a
              href="mailto:hello@lesaal.com"
              className="primary-btn"
              whileHover={{ y: -3, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              hello@lesaal.com
            </motion.a>
          </section>
        </main>

        <footer className="site-footer">© {new Date().getFullYear()} Lesaal Marketing. Built for growth.</footer>
      </div>
    </>
  );
}
