"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function toOptionsArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function CampaignResponseForm({ campaign, turnstileSiteKey = "" }) {
  const [formData, setFormData] = useState({});
  const [honeypotWebsite, setHoneypotWebsite] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReady, setCaptchaReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const captchaRef = useRef(null);
  const widgetIdRef = useRef(null);

  const questions = useMemo(
    () => (Array.isArray(campaign?.questions) ? campaign.questions : []).filter((question) => question?.isVisible !== false),
    [campaign]
  );

  function setValue(key, value) {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));
  }

  useEffect(() => {
    if (!turnstileSiteKey || typeof window === "undefined") {
      return undefined;
    }

    let isCancelled = false;

    function renderTurnstile() {
      if (
        isCancelled ||
        !window.turnstile ||
        !captchaRef.current ||
        widgetIdRef.current !== null
      ) {
        return;
      }

      widgetIdRef.current = window.turnstile.render(captchaRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token) => {
          setCaptchaToken(token || "");
        },
        "expired-callback": () => {
          setCaptchaToken("");
        },
        "error-callback": () => {
          setCaptchaToken("");
        },
      });

      setCaptchaReady(true);
    }

    if (window.turnstile) {
      renderTurnstile();
      return () => {
        isCancelled = true;
      };
    }

    const existingScript = document.querySelector('script[data-turnstile-script="true"]');

    if (existingScript) {
      existingScript.addEventListener("load", renderTurnstile);
      return () => {
        isCancelled = true;
        existingScript.removeEventListener("load", renderTurnstile);
      };
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = "true";
    script.addEventListener("load", renderTurnstile);
    document.head.appendChild(script);

    return () => {
      isCancelled = true;
      script.removeEventListener("load", renderTurnstile);
    };
  }, [turnstileSiteKey]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    if (!turnstileSiteKey) {
      setError("Captcha is not configured.");
      setSubmitting(false);
      return;
    }

    if (!captchaToken) {
      setError("Please complete the captcha challenge.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/public/campaigns/${campaign.slug}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: formData, captchaToken, website: honeypotWebsite }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit response.");
      }

      setSuccess(payload.message || "Response submitted successfully.");
      setFormData({});
      setHoneypotWebsite("");
      setCaptchaToken("");
      if (widgetIdRef.current !== null && window.turnstile?.reset) {
        window.turnstile.reset(widgetIdRef.current);
      }
    } catch (submitError) {
      setError(submitError.message || "Unable to submit response.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!questions.length) {
    return (
      <section className="campaign-form-card">
        <h2>Form unavailable</h2>
        <p>This campaign has no visible questions yet. Please check back later.</p>
      </section>
    );
  }

  return (
    <section className="campaign-form-card">
      <h2>{campaign.title}</h2>
      <p>{campaign.description}</p>

      <form className="campaign-form-grid" onSubmit={handleSubmit}>
        <div style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
          <label htmlFor="website-field">
            Website
            <input
              id="website-field"
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypotWebsite}
              onChange={(event) => setHoneypotWebsite(event.target.value)}
            />
          </label>
        </div>

        {questions.map((question) => {
          const value = formData[question.key] || "";
          const options = toOptionsArray(question.options);

          if (question.type === "textarea") {
            return (
              <label key={question.id || question.key}>
                {question.label}
                <textarea
                  value={value}
                  required={question.required}
                  placeholder={question.placeholder || ""}
                  onChange={(event) => setValue(question.key, event.target.value)}
                />
              </label>
            );
          }

          if (question.type === "select") {
            return (
              <label key={question.id || question.key}>
                {question.label}
                <select
                  value={value}
                  required={question.required}
                  onChange={(event) => setValue(question.key, event.target.value)}
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
            <label key={question.id || question.key}>
              {question.label}
              <input
                type={question.type || "text"}
                value={value}
                required={question.required}
                placeholder={question.placeholder || ""}
                onChange={(event) => setValue(question.key, event.target.value)}
              />
            </label>
          );
        })}

        {turnstileSiteKey ? (
          <div className="campaign-turnstile-block">
            <div ref={captchaRef} />
            {!captchaReady ? <p className="text-sm text-slate-300">Loading captcha challenge...</p> : null}
          </div>
        ) : (
          <p className="form-error">Captcha is not configured.</p>
        )}

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        <button type="submit" className="lp-btn lp-btn-primary" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Response"}
        </button>
      </form>
    </section>
  );
}
