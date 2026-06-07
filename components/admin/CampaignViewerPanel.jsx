"use client";

import { useMemo, useState } from "react";
import Swal from "sweetalert2";
import { Eye } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

function formatSubmittedAt(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDisplayResponder(data) {
  if (!data || typeof data !== "object") return "Anonymous";

  const possibleNameKeys = ["full_name", "name", "fullName", "first_name", "firstname", "applicant_name"];
  for (const key of possibleNameKeys) {
    const value = String(data[key] || "").trim();
    if (value) return value;
  }

  const possibleEmailKeys = ["email", "email_address", "mail"];
  for (const key of possibleEmailKeys) {
    const value = String(data[key] || "").trim();
    if (value) return value;
  }

  return "Anonymous";
}

function getAnsweredCount(data) {
  if (!data || typeof data !== "object") return 0;
  return Object.values(data).filter((value) => String(value ?? "").trim()).length;
}

function stringifyAnswerValue(value) {
  if (value == null || value === "") return "—";

  if (Array.isArray(value)) {
    const cleaned = value.map((entry) => String(entry || "").trim()).filter(Boolean);
    return cleaned.length ? cleaned.join(", ") : "—";
  }

  if (typeof value === "object") {
    const entries = Object.entries(value);
    if (!entries.length) return "—";
    return entries
      .map(([key, entryValue]) => `${key}: ${String(entryValue ?? "").trim() || "—"}`)
      .join("\n");
  }

  const cleaned = String(value).trim();
  return cleaned || "—";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getResponseAnswerRows(questions, responseData) {
  const data = responseData && typeof responseData === "object" ? responseData : {};

  if (Array.isArray(questions) && questions.length) {
    return questions.map((question) => ({
      label: question?.label || question?.key || "Question",
      value: stringifyAnswerValue(data[question?.key]),
    }));
  }

  return Object.entries(data).map(([key, value]) => ({
    label: key,
    value: stringifyAnswerValue(value),
  }));
}

function createAnswerDetailsHtml(answerRows) {
  if (!answerRows.length) {
    return `<p style="margin:0;color:#9fb3d7;">No answer data found for this submission.</p>`;
  }

  const items = answerRows
    .map(
      (row) => `
      <div style="padding:10px 0;border-bottom:1px solid rgba(160,185,230,0.2);">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#8db2ff;">${escapeHtml(row.label)}</p>
        <p style="margin:0;color:#e9f0ff;white-space:pre-wrap;">${escapeHtml(row.value)}</p>
      </div>
    `
    )
    .join("");

  return `
    <div style="max-height:60vh;overflow:auto;text-align:left;padding-right:4px;">
      ${items}
    </div>
  `;
}

function SectionOverview({ sections }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5 md:p-6">
        <p className="text-sm font-semibold text-[color:var(--ui-foreground)]">Form sections</p>
        {sections.length ? (
          sections.map((section, index) => (
            <div
              key={section?.id || section?.key || `${index}-${section?.title || "section"}`}
              className="rounded-xl border border-[color:var(--ui-border)] p-3"
            >
              <p className="text-sm font-semibold text-[color:var(--ui-foreground)]">{section?.title || `Section ${index + 1}`}</p>
              {section?.description ? (
                <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">{section.description}</p>
              ) : null}

              <div className="mt-3 space-y-2">
                {(section?.questions || []).map((question, questionIndex) => (
                  <div
                    key={question?.id || question?.key || `${index}-${questionIndex}`}
                    className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-[color:var(--ui-foreground)]">
                        {question?.label || question?.key || `Question ${questionIndex + 1}`}
                      </span>
                      <Badge variant="default" className="text-xs">
                        {question?.type || "text"}
                      </Badge>
                      {question?.required ? (
                        <Badge variant="secondary" className="text-xs">
                          Required
                        </Badge>
                      ) : null}
                    </div>
                    {question?.placeholder ? (
                      <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">Placeholder: {question.placeholder}</p>
                    ) : null}
                    {question?.type === "select" && Array.isArray(question?.options) && question.options.length ? (
                      <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">Options: {question.options.join(", ")}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-[color:var(--ui-muted-foreground)]">No form sections configured.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ResponsesTable({ questions, responses }) {
  async function handleOpenResponseDetails(response) {
    const answerRows = getResponseAnswerRows(questions, response?.data);

    await Swal.fire({
      title: "Submission details",
      html: createAnswerDetailsHtml(answerRows),
      width: "min(900px, 92vw)",
      confirmButtonText: "Close",
      showCloseButton: true,
      background: "#071633",
      color: "#edf3ff",
      confirmButtonColor: "#2563eb",
    });
  }

  if (!responses.length) {
    return (
      <Card>
        <CardContent className="p-5 md:p-6">
          <p className="text-sm text-[color:var(--ui-muted-foreground)]">No responses submitted yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-0">
        <div className="flex items-center justify-between px-5 pt-5 md:px-6 md:pt-6">
          <p className="text-sm font-semibold text-[color:var(--ui-foreground)]">Responses</p>
          <p className="text-xs text-[color:var(--ui-muted-foreground)]">Click any row to view full answers</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Responder</TableHead>
              <TableHead>Submitted at</TableHead>
              <TableHead className="w-36 text-right">Answered</TableHead>
              <TableHead className="w-36 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.map((response, index) => (
              <TableRow
                key={response.id || `response-${index}`}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => handleOpenResponseDetails(response)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleOpenResponseDetails(response);
                  }
                }}
              >
                <TableCell className="text-[color:var(--ui-muted-foreground)]">{index + 1}</TableCell>
                <TableCell className="font-medium">{getDisplayResponder(response?.data)}</TableCell>
                <TableCell>{formatSubmittedAt(response?.submittedAt)}</TableCell>
                <TableCell className="text-right">{getAnsweredCount(response?.data)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="pointer-events-none h-8 gap-1.5"
                    tabIndex={-1}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function CampaignViewerPanel({ sections = [], questions = [], responses = [] }) {
  const [activeTab, setActiveTab] = useState("info");

  const tabs = useMemo(
    () => [
      { key: "info", label: "Info" },
      { key: "responses", label: "Responses" },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <div className="inline-flex items-center rounded-xl border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-1">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-[color:var(--ui-surface)] text-[color:var(--ui-foreground)] shadow-sm"
                  : "text-[color:var(--ui-muted-foreground)] hover:text-[color:var(--ui-foreground)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "info" ? <SectionOverview sections={sections} /> : <ResponsesTable questions={questions} responses={responses} />}
    </div>
  );
}
