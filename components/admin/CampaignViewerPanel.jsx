"use client";

import { useMemo, useState } from "react";
import Swal from "sweetalert2";
import { Download, Eye } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { SelectNative } from "../ui/select-native";
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

function normalizeMediaAnswer(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const mediaType = String(value.mediaType || "").trim().toLowerCase();
  const url = String(value.url || "").trim();

  if (!url || (mediaType !== "image" && mediaType !== "video")) {
    return null;
  }

  return {
    mediaType,
    url,
  };
}

function stringifyAnswerValue(value) {
  if (value == null || value === "") return "—";

  if (Array.isArray(value)) {
    const cleaned = value.map((entry) => String(entry || "").trim()).filter(Boolean);
    return cleaned.length ? cleaned.join(", ") : "—";
  }

  if (typeof value === "object") {
    const mediaAnswer = normalizeMediaAnswer(value);
    if (mediaAnswer) {
      const label = mediaAnswer.mediaType === "video" ? "Video" : "Image";
      return `${label}: ${mediaAnswer.url}`;
    }

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

function hasMeaningfulValue(value) {
  if (value == null) return false;

  if (Array.isArray(value)) {
    return value.some((entry) => String(entry ?? "").trim());
  }

  if (typeof value === "object") {
    const mediaAnswer = normalizeMediaAnswer(value);
    if (mediaAnswer) {
      return Boolean(mediaAnswer.url);
    }

    return Object.values(value).some((entry) => String(entry ?? "").trim());
  }

  return Boolean(String(value).trim());
}

function normalizeExportValue(value) {
  if (value == null) return "";

  if (Array.isArray(value)) {
    return value.map((entry) => String(entry ?? "").trim()).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    const mediaAnswer = normalizeMediaAnswer(value);
    if (mediaAnswer) {
      return mediaAnswer.url;
    }

    return JSON.stringify(value);
  }

  return String(value);
}

function toCsvString(columns, rows) {
  const neutralizeCsvFormula = (value) => {
    const normalized = String(value ?? "");
    return /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
  };

  const escapeCsv = (value) => `"${neutralizeCsvFormula(value).replace(/"/g, '""')}"`;
  const header = columns.map((column) => escapeCsv(column.label)).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsv(row[column.key])).join(","));
  return [header, ...body].join("\n");
}

function toExcelTsv(columns, rows) {
  const neutralizeTsvFormula = (value) => {
    const normalized = String(value ?? "");
    return /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
  };

  const escapeTsv = (value) => neutralizeTsvFormula(value).replace(/\t/g, " ").replace(/\r?\n/g, " ");
  const header = columns.map((column) => escapeTsv(column.label)).join("\t");
  const body = rows.map((row) => columns.map((column) => escapeTsv(row[column.key])).join("\t"));
  return [header, ...body].join("\n");
}

function triggerDownload({ fileName, content, mimeType }) {
  const blob = new Blob(["\uFEFF", content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
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
  const [searchTerm, setSearchTerm] = useState("");
  const [questionFilter, setQuestionFilter] = useState("all");

  const normalizedQuestions = Array.isArray(questions) ? questions : [];
  const normalizedResponses = Array.isArray(responses) ? responses : [];

  const filteredResponses = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return normalizedResponses.filter((response) => {
      const responseData = response?.data && typeof response.data === "object" ? response.data : {};

      const matchesSearch = !normalizedSearch
        ? true
        : [getDisplayResponder(responseData), formatSubmittedAt(response?.submittedAt), ...Object.values(responseData)]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch);

      const matchesQuestionFilter =
        questionFilter === "all" ? true : hasMeaningfulValue(responseData[questionFilter]);

      return matchesSearch && matchesQuestionFilter;
    });
  }, [normalizedResponses, questionFilter, searchTerm]);

  async function chooseExportMode() {
    const result = await Swal.fire({
      title: "Export responses",
      input: "radio",
      inputOptions: {
        all: "Export all",
        filtered: "Export filtered",
        field: "Export field",
      },
      inputValue: "all",
      showCancelButton: true,
      confirmButtonText: "Continue",
      background: "#071633",
      color: "#edf3ff",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#334155",
      inputValidator: (value) => (!value ? "Choose one export option." : undefined),
    });

    if (!result.isConfirmed) return null;
    return result.value;
  }

  async function chooseExportFields() {
    if (!normalizedQuestions.length) {
      await Swal.fire({
        icon: "info",
        title: "No questions found",
        text: "There are no campaign fields to export.",
        background: "#071633",
        color: "#edf3ff",
        confirmButtonColor: "#2563eb",
      });
      return null;
    }

    const html = `
      <div style="max-height:52vh;overflow:auto;text-align:left;display:grid;gap:8px;">
        ${normalizedQuestions
          .map(
            (question, index) => `
              <label style="display:flex;gap:10px;align-items:flex-start;padding:6px 0;border-bottom:1px solid rgba(160,185,230,0.18);">
                <input type="checkbox" name="export-field-key" value="${escapeHtml(question?.key || `field_${index}`)}" style="margin-top:2px;" />
                <span style="display:grid;gap:3px;">
                  <span style="font-weight:600;color:#e9f0ff;">${escapeHtml(question?.label || question?.key || `Question ${index + 1}`)}</span>
                  <span style="font-size:12px;color:#9fb3d7;">${escapeHtml(question?.key || "")}</span>
                </span>
              </label>
            `
          )
          .join("")}
      </div>
    `;

    const result = await Swal.fire({
      title: "Select fields to export",
      html,
      width: "min(760px, 92vw)",
      showCancelButton: true,
      confirmButtonText: "Continue",
      background: "#071633",
      color: "#edf3ff",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#334155",
      preConfirm: () => {
        const selected = Array.from(document.querySelectorAll('input[name="export-field-key"]:checked'))
          .map((node) => node.value)
          .filter(Boolean);

        if (!selected.length) {
          Swal.showValidationMessage("Select at least one field.");
          return null;
        }

        return selected;
      },
    });

    if (!result.isConfirmed) return null;
    return Array.isArray(result.value) ? result.value : null;
  }

  async function chooseExportFormat() {
    const result = await Swal.fire({
      title: "Choose file format",
      input: "radio",
      inputOptions: {
        csv: "CSV (.csv)",
        excel: "Excel (.xls)",
      },
      inputValue: "csv",
      showCancelButton: true,
      confirmButtonText: "Export",
      background: "#071633",
      color: "#edf3ff",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#334155",
      inputValidator: (value) => (!value ? "Choose a file format." : undefined),
    });

    if (!result.isConfirmed) return null;
    return result.value;
  }

  function createExportRows(selectedResponses, selectedQuestionKeys) {
    const keys = Array.isArray(selectedQuestionKeys)
      ? selectedQuestionKeys
      : normalizedQuestions.map((question) => question.key);

    const columns = [
      { key: "submittedAt", label: "Submitted At" },
      { key: "responder", label: "Responder" },
      ...keys.map((key) => {
        const matchingQuestion = normalizedQuestions.find((question) => question.key === key);
        return { key, label: matchingQuestion?.label || key };
      }),
    ];

    const rows = selectedResponses.map((response) => {
      const responseData = response?.data && typeof response.data === "object" ? response.data : {};
      const row = {
        submittedAt: formatSubmittedAt(response?.submittedAt),
        responder: getDisplayResponder(responseData),
      };

      for (const key of keys) {
        row[key] = normalizeExportValue(responseData[key]);
      }

      return row;
    });

    return { columns, rows };
  }

  async function handleExportResponses() {
    const mode = await chooseExportMode();
    if (!mode) return;

    let selectedQuestionKeys = null;
    if (mode === "field") {
      selectedQuestionKeys = await chooseExportFields();
      if (!selectedQuestionKeys) return;
    }

    const format = await chooseExportFormat();
    if (!format) return;

    let sourceResponses = normalizedResponses;
    if (mode === "filtered") {
      sourceResponses = filteredResponses;
    }

    if (!sourceResponses.length) {
      await Swal.fire({
        icon: "info",
        title: "Nothing to export",
        text: mode === "filtered" ? "No responses match the current filters." : "No responses available to export.",
        background: "#071633",
        color: "#edf3ff",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    const { columns, rows } = createExportRows(sourceResponses, selectedQuestionKeys);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const baseName = `campaign-responses-${timestamp}`;

    if (format === "excel") {
      const tsv = toExcelTsv(columns, rows);
      triggerDownload({
        fileName: `${baseName}.xls`,
        content: tsv,
        mimeType: "application/vnd.ms-excel;charset=utf-8;",
      });
    } else {
      const csv = toCsvString(columns, rows);
      triggerDownload({
        fileName: `${baseName}.csv`,
        content: csv,
        mimeType: "text/csv;charset=utf-8;",
      });
    }

    await Swal.fire({
      icon: "success",
      title: "Export complete",
      text: `${rows.length} response${rows.length === 1 ? "" : "s"} exported successfully.`,
      background: "#071633",
      color: "#edf3ff",
      confirmButtonColor: "#2563eb",
    });
  }

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
        <div className="space-y-3 px-5 pt-5 md:px-6 md:pt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[color:var(--ui-foreground)]">Responses</p>
            <Button type="button" variant="outline" className="h-9 gap-1.5" onClick={handleExportResponses}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[220px] flex-1">
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search responses..."
                className="h-9"
              />
            </div>

            <div className="w-[220px]">
              <SelectNative
                value={questionFilter}
                onChange={(event) => setQuestionFilter(event.target.value)}
                className="h-9"
                aria-label="Filter responses by answered field"
              >
                <option value="all">All responses</option>
                {normalizedQuestions.map((question, index) => (
                  <option key={question?.key || `question-${index}`} value={question?.key || ""}>
                    Has answer: {question?.label || question?.key || `Question ${index + 1}`}
                  </option>
                ))}
              </SelectNative>
            </div>
          </div>

          <p className="text-xs text-[color:var(--ui-muted-foreground)]">
            Showing {filteredResponses.length} of {normalizedResponses.length} response
            {normalizedResponses.length === 1 ? "" : "s"}. Click any row to view full answers.
          </p>
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
            {filteredResponses.length ? (
              filteredResponses.map((response, index) => (
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
              ))
            ) : (
              <TableRow
                key="no-filtered-results"
              >
                <TableCell colSpan={5} className="h-20 text-center text-[color:var(--ui-muted-foreground)]">
                  No responses match the current filters.
                </TableCell>
              </TableRow>
            )}
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
