"use client";

import { useMemo, useState } from "react";

function toOptionsArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function CampaignResponseForm({ campaign }) {
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/public/campaigns/${campaign.slug}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: formData }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to submit response.");
      }

      setSuccess(payload.message || "Response submitted successfully.");
      setFormData({});
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

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        <button type="submit" className="lp-btn lp-btn-primary" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Response"}
        </button>
      </form>
    </section>
  );
}
