"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PageState from "./shared/PageState";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Spinner } from "./ui/spinner";
import { Textarea } from "./ui/textarea";

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
    return <PageState status="empty" resourceLabel="campaign form fields" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{campaign.title}</CardTitle>
        <CardDescription>{campaign.description}</CardDescription>
      </CardHeader>

      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
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

          {questions.map((question) => {
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
          })}

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
          {success ? <p className="text-sm text-[color:var(--ui-success)]">{success}</p> : null}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Response"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
