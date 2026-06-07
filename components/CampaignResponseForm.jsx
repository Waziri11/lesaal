"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import PageState from "./shared/PageState";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Spinner } from "./ui/spinner";
import { Textarea } from "./ui/textarea";

function toOptionsArray(value) {
  return Array.isArray(value) ? value : [];
}

function buildSections(campaign) {
  if (Array.isArray(campaign?.sections) && campaign.sections.length) {
    return campaign.sections
      .map((section, index) => ({
        ...section,
        key: section.key || `section_${index + 1}`,
        title: section.title || `Section ${index + 1}`,
        description: section.description || "",
        order: Number(section.order || index),
        questions: (Array.isArray(section.questions) ? section.questions : []).filter((question) => question?.isVisible !== false),
      }))
      .filter((section) => section.questions.length)
      .sort((a, b) => a.order - b.order);
  }

  const visibleQuestions = (Array.isArray(campaign?.questions) ? campaign.questions : []).filter((question) => question?.isVisible !== false);

  if (!visibleQuestions.length) {
    return [];
  }

  return [
    {
      key: "section_1",
      title: "Form Questions",
      description: "",
      order: 0,
      questions: visibleQuestions,
    },
  ];
}

export default function CampaignResponseForm({ campaign, turnstileSiteKey = "" }) {
  const router = useRouter();
  const [formData, setFormData] = useState({});
  const [honeypotWebsite, setHoneypotWebsite] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaReady, setCaptchaReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const captchaRef = useRef(null);
  const widgetIdRef = useRef(null);

  const sections = useMemo(() => buildSections(campaign), [campaign]);
  const questions = useMemo(() => sections.flatMap((section) => section.questions), [sections]);

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
      if (isCancelled || !window.turnstile || !captchaRef.current || widgetIdRef.current !== null) {
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
        if (widgetIdRef.current !== null && window.turnstile?.remove) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch (error) {
            console.warn("Unable to remove Turnstile widget during cleanup.", error);
          } finally {
            widgetIdRef.current = null;
          }
        }
      };
    }

    const existingScript = document.querySelector('script[data-turnstile-script="true"]');

    if (existingScript) {
      existingScript.addEventListener("load", renderTurnstile);
      return () => {
        isCancelled = true;
        existingScript.removeEventListener("load", renderTurnstile);
        if (widgetIdRef.current !== null && window.turnstile?.remove) {
          try {
            window.turnstile.remove(widgetIdRef.current);
          } catch (error) {
            console.warn("Unable to remove Turnstile widget during cleanup.", error);
          } finally {
            widgetIdRef.current = null;
          }
        }
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
      if (widgetIdRef.current !== null && window.turnstile?.remove) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (error) {
          console.warn("Unable to remove Turnstile widget during cleanup.", error);
        } finally {
          widgetIdRef.current = null;
        }
      }
    };
  }, [turnstileSiteKey]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");

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

      setFormData({});
      setHoneypotWebsite("");
      setCaptchaToken("");
      if (widgetIdRef.current !== null && window.turnstile?.reset && captchaRef.current && document.body.contains(captchaRef.current)) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch (error) {
          console.warn("Unable to reset Turnstile widget.", error);
        }
      }

      const decision = await Swal.fire({
        icon: "success",
        title: "Response received successfully",
        text: "What would you like to do next?",
        showDenyButton: true,
        confirmButtonText: "More Campaigns",
        denyButtonText: "Home",
        allowOutsideClick: false,
        allowEscapeKey: false,
      });

      if (decision.isConfirmed) {
        router.push("/campaigns");
      } else if (decision.isDenied) {
        router.push("/");
      }
    } catch (submitError) {
      setError(submitError.message || "Unable to submit response.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderQuestion(question) {
    const value = formData[question.key] || "";
    const options = toOptionsArray(question.options);
    const key = question.id || question.key;

    if (question.type === "textarea") {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>{question.label}</Label>
          <Textarea
            id={key}
            value={value}
            required={question.required}
            placeholder={question.placeholder || ""}
            onChange={(event) => setValue(question.key, event.target.value)}
          />
        </div>
      );
    }

    if (question.type === "select") {
      return (
        <div key={key} className="space-y-2">
          <Label>{question.label}</Label>
          <Select value={value} onValueChange={(nextValue) => setValue(question.key, nextValue)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div key={key} className="space-y-2">
        <Label htmlFor={key}>{question.label}</Label>
        <Input
          id={key}
          type={question.type || "text"}
          value={value}
          required={question.required}
          placeholder={question.placeholder || ""}
          onChange={(event) => setValue(question.key, event.target.value)}
        />
      </div>
    );
  }

  if (!questions.length) {
    return <PageState status="empty" resourceLabel="campaign form fields" />;
  }

  return (
    <form className="space-y-4 rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-5 md:p-6" onSubmit={handleSubmit}>
      <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="website-field">
          Website
          <Input
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

      {sections.map((section, index) => (
        <section key={section.key || `section_${index + 1}`} className="space-y-3 rounded-lg border border-[color:var(--ui-border)] p-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--ui-primary)]">Section {index + 1}</p>
            <h3 className="text-lg font-semibold text-[color:var(--ui-foreground)]">{section.title}</h3>
            {section.description ? <p className="text-sm text-[color:var(--ui-muted-foreground)]">{section.description}</p> : null}
          </div>

          <div className="space-y-4">{section.questions.map((question) => renderQuestion(question))}</div>
        </section>
      ))}

      {turnstileSiteKey ? (
        <div className="space-y-2 rounded-lg border border-[color:var(--ui-border)] p-3">
          <div ref={captchaRef} />
          {!captchaReady ? (
            <p className="flex items-center gap-2 text-sm text-[color:var(--ui-muted-foreground)]">
              <Spinner />
              Loading captcha challenge...
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[color:var(--ui-destructive)]">Captcha is not configured.</p>
      )}

      {error ? <p className="text-sm text-[color:var(--ui-destructive)]">{error}</p> : null}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Response"}
      </Button>
    </form>
  );
}
