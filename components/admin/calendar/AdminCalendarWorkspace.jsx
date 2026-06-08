"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  CalendarDays,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Calendar } from "../../ui/calendar";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Checkbox } from "../../ui/checkbox";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Switch } from "../../ui/switch";
import { Textarea } from "../../ui/textarea";
import {
  buildRRuleFromEditorState,
  CALENDAR_TIMEZONE,
  formatDateTimeInCalendarTimezone,
  formatDateInputValue,
  getDefaultRecurrenceEditorState,
  getItemDurationMs,
  getOccurrenceStartDates,
  parseDateTimeLocalValue,
  parseRRuleToEditorState,
  toDateTimeLocalValue,
} from "../../../lib/calendar";
import { createCsrfHeaders } from "../../../lib/csrf-client";
import styles from "./AdminCalendarWorkspace.module.css";

const ITEM_TYPES = ["EVENT", "TASK", "REMINDER"];
const WEEKDAY_OPTIONS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

const TYPE_COLORS = {
  EVENT: "#4B8CFB",
  TASK: "#14B8A6",
  REMINDER: "#F59E0B",
};

function formatDateLabel(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: CALENDAR_TIMEZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function buildFetchQuery({ rangeStart, rangeEnd, searchTerm, typeFilters }) {
  const query = new URLSearchParams();
  query.set("from", rangeStart.toISOString());
  query.set("to", rangeEnd.toISOString());

  const trimmedSearch = searchTerm.trim();
  if (trimmedSearch) {
    query.set("q", trimmedSearch);
  }

  if (typeFilters.length && typeFilters.length !== ITEM_TYPES.length) {
    query.set("types", typeFilters.join(","));
  }

  query.set("limit", "400");

  return query.toString();
}

function mapItemToEvents(item, rangeStart, rangeEnd) {
  const durationMs = getItemDurationMs(item);
  const occurrenceStarts = getOccurrenceStartDates(item, rangeStart, rangeEnd);

  return occurrenceStarts.map((occurrenceStart) => {
    const start = new Date(occurrenceStart);
    const end = new Date(start.getTime() + durationMs);

    return {
      id: `${item.id}__${start.toISOString()}`,
      title: item.title,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: item.allDay,
      backgroundColor: item.color || TYPE_COLORS[item.type] || "#4B8CFB",
      borderColor: item.color || TYPE_COLORS[item.type] || "#4B8CFB",
      textColor: "#ffffff",
      classNames: item.type === "TASK" && item.isCompleted ? ["fc-event-completed"] : [],
      extendedProps: {
        itemId: item.id,
        occurrenceStartAt: start.toISOString(),
        itemType: item.type,
        isCompleted: item.isCompleted,
        recurring: Boolean(item.recurrenceRule),
      },
    };
  });
}

function createEditorForm({ startAt, endAt, allDay = false } = {}) {
  const start = startAt ? new Date(startAt) : new Date();
  const end = endAt ? new Date(endAt) : new Date(start.getTime() + 60 * 60 * 1000);

  return {
    id: null,
    type: "EVENT",
    title: "",
    description: "",
    location: "",
    color: "",
    allDay,
    startAtValue: allDay ? formatDateInputValue(start) : toDateTimeLocalValue(start),
    endAtValue: allDay ? formatDateInputValue(end) : toDateTimeLocalValue(end),
    isCompleted: false,
    recurrence: getDefaultRecurrenceEditorState(),
    reminders: [{ minutesBefore: "10", channels: ["IN_APP", "EMAIL"] }],
  };
}

function createEditorFormFromItem(item) {
  const reminders = Array.isArray(item?.reminders)
    ? item.reminders.map((reminder) => ({
        minutesBefore: String(reminder.minutesBefore),
        channels: Array.isArray(reminder.channels) ? reminder.channels : ["IN_APP", "EMAIL"],
      }))
    : [];

  return {
    id: item.id,
    type: item.type,
    title: item.title || "",
    description: item.description || "",
    location: item.location || "",
    color: item.color || "",
    allDay: Boolean(item.allDay),
    startAtValue: item.allDay ? formatDateInputValue(item.startAt) : toDateTimeLocalValue(item.startAt),
    endAtValue: item.allDay ? formatDateInputValue(item.endAt) : toDateTimeLocalValue(item.endAt),
    isCompleted: Boolean(item.isCompleted),
    recurrence: parseRRuleToEditorState(item.recurrenceRule),
    reminders: reminders.length ? reminders : [{ minutesBefore: "10", channels: ["IN_APP", "EMAIL"] }],
  };
}

function getDatePart(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return "";
  }

  return normalized.includes("T") ? normalized.slice(0, 10) : normalized;
}

function toIsoFromAllDayDate(value, { endOfDay = false } = {}) {
  const datePart = getDatePart(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    throw new Error("Date is invalid.");
  }

  const base = new Date(`${datePart}T00:00:00+03:00`);

  if (endOfDay) {
    base.setDate(base.getDate() + 1);
  }

  return base.toISOString();
}

function buildPayloadFromEditor(editorForm) {
  const title = String(editorForm.title || "").trim();

  if (!title) {
    throw new Error("Title is required.");
  }

  let startAtIso;
  let endAtIso;

  if (editorForm.allDay) {
    startAtIso = toIsoFromAllDayDate(editorForm.startAtValue, { endOfDay: false });
    endAtIso = toIsoFromAllDayDate(editorForm.endAtValue, { endOfDay: true });
  } else {
    startAtIso = parseDateTimeLocalValue(editorForm.startAtValue).toISOString();
    endAtIso = parseDateTimeLocalValue(editorForm.endAtValue).toISOString();
  }

  if (new Date(endAtIso).getTime() <= new Date(startAtIso).getTime()) {
    throw new Error("End must be after start.");
  }

  const recurrenceRule = buildRRuleFromEditorState(editorForm.recurrence);

  const reminders = editorForm.reminders
    .map((reminder) => ({
      minutesBefore: String(reminder.minutesBefore || "").trim(),
      channels: Array.isArray(reminder.channels) ? reminder.channels : [],
    }))
    .filter((reminder) => reminder.minutesBefore !== "")
    .map((reminder) => ({
      minutesBefore: Number.parseInt(reminder.minutesBefore, 10),
      channels: reminder.channels,
    }));

  return {
    type: editorForm.type,
    title,
    description: String(editorForm.description || ""),
    location: String(editorForm.location || ""),
    color: String(editorForm.color || "").trim(),
    allDay: Boolean(editorForm.allDay),
    startAt: startAtIso,
    endAt: endAtIso,
    isCompleted: editorForm.type === "TASK" ? Boolean(editorForm.isCompleted) : false,
    recurrenceRule,
    reminders,
  };
}

function reminderLabel(minutesBefore) {
  const minutes = Number.parseInt(String(minutesBefore || 0), 10);

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "At time of item";
  }

  if (minutes % (60 * 24) === 0) {
    return `${minutes / (60 * 24)} day(s) before`;
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60} hour(s) before`;
  }

  return `${minutes} minute(s) before`;
}

function buildPayloadFromExistingItem(item, { startAt, endAt, allDay }) {
  return {
    type: item.type,
    title: item.title || "",
    description: item.description || "",
    location: item.location || "",
    color: item.color || "",
    allDay: Boolean(allDay),
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    isCompleted: Boolean(item.isCompleted),
    recurrenceRule: item.recurrenceRule,
    reminders: Array.isArray(item.reminders)
      ? item.reminders.map((reminder) => ({
          minutesBefore: reminder.minutesBefore,
          channels: reminder.channels,
        }))
      : [],
  };
}

export default function AdminCalendarWorkspace() {
  const calendarRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilters, setTypeFilters] = useState([...ITEM_TYPES]);
  const [focusedDate, setFocusedDate] = useState(new Date());
  const [rangeStart, setRangeStart] = useState(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return start;
  });
  const [rangeEnd, setRangeEnd] = useState(() => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(now.getDate() + 45);
    return end;
  });

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorDeleting, setEditorDeleting] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [editorForm, setEditorForm] = useState(() => createEditorForm());

  const itemMap = useMemo(() => {
    const map = new Map();

    for (const item of items) {
      map.set(item.id, item);
    }

    return map;
  }, [items]);

  const eventData = useMemo(
    () => items.flatMap((item) => mapItemToEvents(item, rangeStart, rangeEnd)),
    [items, rangeStart, rangeEnd]
  );

  const upcomingItems = useMemo(() => {
    const now = Date.now();

    return eventData
      .filter((event) => {
        const start = new Date(event.start).getTime();
        return Number.isFinite(start) && start >= now;
      })
      .sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime())
      .slice(0, 8);
  }, [eventData]);

  const itemStats = useMemo(() => {
    return ITEM_TYPES.reduce((stats, type) => {
      stats[type] = items.filter((item) => item.type === type).length;
      return stats;
    }, {});
  }, [items]);

  async function loadItems({ isManualRefresh = false } = {}) {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const query = buildFetchQuery({
        rangeStart,
        rangeEnd,
        searchTerm,
        typeFilters,
      });

      const response = await fetch(`/api/admin/calendar/items?${query}`, {
        cache: "no-store",
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load calendar items.");
      }

      setItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load calendar items.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [rangeStart, rangeEnd, searchTerm, typeFilters]);

  function toggleTypeFilter(type) {
    setTypeFilters((current) => {
      if (current.includes(type)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter((entry) => entry !== type);
      }

      return [...current, type];
    });
  }

  function goToCalendarDate(date) {
    if (!date) return;

    setFocusedDate(date);
    const api = calendarRef.current?.getApi?.();

    if (api) {
      api.gotoDate(date);
    }
  }

  function openEditorForCreate({ startAt, endAt, allDay = false } = {}) {
    setEditorError("");
    setStatusMessage("");
    setEditorForm(createEditorForm({ startAt, endAt, allDay }));
    setEditorOpen(true);
  }

  function openEditorForItem(item) {
    setEditorError("");
    setStatusMessage("");
    setEditorForm(createEditorFormFromItem(item));
    setEditorOpen(true);
  }

  function closeEditor() {
    if (editorSaving || editorDeleting) {
      return;
    }

    setEditorOpen(false);
    setEditorError("");
  }

  function updateRecurrenceField(key, value) {
    setEditorForm((current) => ({
      ...current,
      recurrence: {
        ...current.recurrence,
        [key]: value,
      },
    }));
  }

  function toggleRecurrenceWeekday(weekday) {
    setEditorForm((current) => {
      const selected = current.recurrence.byWeekday || [];
      const next = selected.includes(weekday)
        ? selected.filter((entry) => entry !== weekday)
        : [...selected, weekday];

      return {
        ...current,
        recurrence: {
          ...current.recurrence,
          byWeekday: next,
        },
      };
    });
  }

  function addReminderRow() {
    setEditorForm((current) => ({
      ...current,
      reminders: [...current.reminders, { minutesBefore: "10", channels: ["IN_APP", "EMAIL"] }],
    }));
  }

  function removeReminderRow(index) {
    setEditorForm((current) => ({
      ...current,
      reminders: current.reminders.filter((_, reminderIndex) => reminderIndex !== index),
    }));
  }

  function updateReminderField(index, key, value) {
    setEditorForm((current) => ({
      ...current,
      reminders: current.reminders.map((reminder, reminderIndex) =>
        reminderIndex === index ? { ...reminder, [key]: value } : reminder
      ),
    }));
  }

  function toggleReminderChannel(index, channel, checked) {
    setEditorForm((current) => ({
      ...current,
      reminders: current.reminders.map((reminder, reminderIndex) => {
        if (reminderIndex !== index) {
          return reminder;
        }

        const channels = Array.isArray(reminder.channels) ? reminder.channels : [];
        const nextChannels = checked
          ? Array.from(new Set([...channels, channel]))
          : channels.filter((entry) => entry !== channel);

        return {
          ...reminder,
          channels: nextChannels,
        };
      }),
    }));
  }

  async function handleSaveEditorItem() {
    if (editorSaving) return;

    setEditorSaving(true);
    setEditorError("");

    try {
      const payload = buildPayloadFromEditor(editorForm);
      const isUpdate = Boolean(editorForm.id);
      const endpoint = isUpdate ? `/api/admin/calendar/items/${editorForm.id}` : "/api/admin/calendar/items";
      const method = isUpdate ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: createCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || "Unable to save calendar item.");
      }

      setEditorOpen(false);
      setStatusMessage(isUpdate ? "Calendar item updated." : "Calendar item created.");
      await loadItems({ isManualRefresh: true });
    } catch (saveError) {
      setEditorError(saveError.message || "Unable to save calendar item.");
    } finally {
      setEditorSaving(false);
    }
  }

  async function handleDeleteEditorItem() {
    if (!editorForm.id || editorDeleting) return;

    const shouldDelete = window.confirm("Delete this calendar item?");
    if (!shouldDelete) return;

    setEditorDeleting(true);
    setEditorError("");

    try {
      const response = await fetch(`/api/admin/calendar/items/${editorForm.id}`, {
        method: "DELETE",
        headers: createCsrfHeaders(),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || "Unable to delete calendar item.");
      }

      setEditorOpen(false);
      setStatusMessage("Calendar item deleted.");
      await loadItems({ isManualRefresh: true });
    } catch (deleteError) {
      setEditorError(deleteError.message || "Unable to delete calendar item.");
    } finally {
      setEditorDeleting(false);
    }
  }

  async function handleCalendarEventMutation(changeInfo) {
    const sourceItemId = String(changeInfo.event?.extendedProps?.itemId || "").trim();
    const sourceItem = itemMap.get(sourceItemId);

    if (!sourceItem) {
      changeInfo.revert();
      return;
    }

    const baseStart = new Date(sourceItem.startAt);
    const baseEnd = new Date(sourceItem.endAt);
    const fallbackDurationMs = Math.max(60 * 1000, baseEnd.getTime() - baseStart.getTime());

    const oldOccurrenceStart = changeInfo.oldEvent?.start
      ? new Date(changeInfo.oldEvent.start)
      : new Date(changeInfo.event.extendedProps.occurrenceStartAt || sourceItem.startAt);
    const oldOccurrenceEnd = changeInfo.oldEvent?.end
      ? new Date(changeInfo.oldEvent.end)
      : new Date(oldOccurrenceStart.getTime() + fallbackDurationMs);

    const nextOccurrenceStart = changeInfo.event?.start
      ? new Date(changeInfo.event.start)
      : oldOccurrenceStart;
    const nextOccurrenceEnd = changeInfo.event?.end
      ? new Date(changeInfo.event.end)
      : new Date(nextOccurrenceStart.getTime() + Math.max(60 * 1000, oldOccurrenceEnd.getTime() - oldOccurrenceStart.getTime()));

    const deltaStartMs = nextOccurrenceStart.getTime() - oldOccurrenceStart.getTime();
    const deltaEndMs = nextOccurrenceEnd.getTime() - oldOccurrenceEnd.getTime();

    const nextStart = sourceItem.recurrenceRule
      ? new Date(baseStart.getTime() + deltaStartMs)
      : nextOccurrenceStart;
    const nextEnd = sourceItem.recurrenceRule
      ? new Date(baseEnd.getTime() + deltaEndMs)
      : nextOccurrenceEnd;

    if (nextEnd.getTime() <= nextStart.getTime()) {
      changeInfo.revert();
      return;
    }

    const optimisticItem = {
      ...sourceItem,
      startAt: nextStart.toISOString(),
      endAt: nextEnd.toISOString(),
      allDay: Boolean(changeInfo.event.allDay),
    };

    setItems((current) => current.map((item) => (item.id === sourceItem.id ? optimisticItem : item)));

    try {
      const payload = buildPayloadFromExistingItem(sourceItem, {
        startAt: nextStart,
        endAt: nextEnd,
        allDay: Boolean(changeInfo.event.allDay),
      });

      const response = await fetch(`/api/admin/calendar/items/${sourceItem.id}`, {
        method: "PUT",
        headers: createCsrfHeaders({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || "Unable to reschedule item.");
      }

      if (body?.item) {
        setItems((current) => current.map((item) => (item.id === sourceItem.id ? body.item : item)));
      }

      setStatusMessage(sourceItem.recurrenceRule ? "Series rescheduled." : "Item rescheduled.");
    } catch (requestError) {
      setItems((current) => current.map((item) => (item.id === sourceItem.id ? sourceItem : item)));
      changeInfo.revert();
      setError(requestError.message || "Unable to reschedule item.");
    }
  }

  function eventContentRenderer(eventInfo) {
    return (
      <div className="px-1 py-0.5">
        <p className="truncate text-[11px] font-semibold leading-tight">{eventInfo.event.title}</p>
        {!eventInfo.event.allDay ? (
          <p className="truncate text-[10px] opacity-90">{eventInfo.timeText}</p>
        ) : null}
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">Calendar</CardTitle>
            <CardDescription>
              Plan events, tasks, and reminders with a week/month workspace inspired by Google Calendar.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => loadItems({ isManualRefresh: true })} disabled={refreshing}>
              {refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <Button
              onClick={() =>
                openEditorForCreate({
                  startAt: focusedDate,
                  endAt: new Date(new Date(focusedDate).getTime() + 60 * 60 * 1000),
                })
              }
            >
              <CalendarPlus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Events: {itemStats.EVENT || 0}</Badge>
            <Badge variant="secondary">Tasks: {itemStats.TASK || 0}</Badge>
            <Badge variant="secondary">Reminders: {itemStats.REMINDER || 0}</Badge>
            <Badge>{formatDateLabel(focusedDate)}</Badge>
          </div>

          {statusMessage ? <p className="text-sm text-[color:var(--ui-success)]">{statusMessage}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">Planner</CardTitle>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--ui-muted-foreground)]" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
                placeholder="Search title, notes, location"
              />
            </div>

            <div className="space-y-2 rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-muted)] p-3">
              <p className="inline-flex items-center text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--ui-muted-foreground)]">
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                Types
              </p>
              <div className="flex flex-wrap gap-2">
                {ITEM_TYPES.map((type) => {
                  const active = typeFilters.includes(type);

                  return (
                    <Button key={type} type="button" size="sm" variant={active ? "default" : "outline"} onClick={() => toggleTypeFilter(type)}>
                      {type}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] p-2">
              <Calendar mode="single" selected={focusedDate} onSelect={(date) => goToCalendarDate(date)} className="p-0" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Upcoming</p>
                <Badge variant="outline">{upcomingItems.length}</Badge>
              </div>

              {upcomingItems.length ? (
                <div className="space-y-2">
                  {upcomingItems.map((item) => (
                    <div key={item.id} className="rounded-lg border border-[color:var(--ui-border)] bg-[color:var(--ui-card)] px-3 py-2">
                      <p className="line-clamp-1 text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-[color:var(--ui-muted-foreground)]">
                        {formatDateTimeInCalendarTimezone(item.start)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-[color:var(--ui-border)] px-3 py-4 text-sm text-[color:var(--ui-muted-foreground)]">
                  No upcoming items in this range.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-base">Schedule</CardTitle>
                <CardDescription>Click a slot to create an item, or click an item to edit it.</CardDescription>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => calendarRef.current?.getApi?.().prev()}
                  aria-label="Previous"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => calendarRef.current?.getApi?.().today()}
                  aria-label="Today"
                >
                  <CalendarDays className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => calendarRef.current?.getApi?.().next()}
                  aria-label="Next"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {error ? <p className="text-sm text-[color:var(--ui-destructive)]">{error}</p> : null}
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex h-[620px] items-center justify-center rounded-lg border border-dashed border-[color:var(--ui-border)]">
                <p className="inline-flex items-center text-sm text-[color:var(--ui-muted-foreground)]">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading calendar
                </p>
              </div>
            ) : (
              <div className={styles.calendarShell}>
                <FullCalendar
                  ref={calendarRef}
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  timeZone={CALENDAR_TIMEZONE}
                  height="auto"
                  allDaySlot
                  editable
                  selectable
                  selectMirror
                  headerToolbar={{
                    left: "",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek",
                  }}
                  views={{
                    timeGridWeek: {
                      dayHeaderFormat: {
                        weekday: "short",
                        month: "numeric",
                        day: "numeric",
                      },
                    },
                    dayGridMonth: {
                      dayHeaderFormat: {
                        weekday: "short",
                      },
                    },
                  }}
                  events={eventData}
                  eventContent={eventContentRenderer}
                  eventClick={(info) => {
                    const sourceItemId = String(info.event.extendedProps.itemId || "");
                    const sourceItem = itemMap.get(sourceItemId);

                    if (sourceItem) {
                      openEditorForItem(sourceItem);
                    }
                  }}
                  eventDrop={handleCalendarEventMutation}
                  eventResize={handleCalendarEventMutation}
                  select={(selection) => {
                    openEditorForCreate({
                      startAt: selection.start,
                      endAt: selection.end,
                      allDay: selection.allDay,
                    });
                    selection.view.calendar.unselect();
                  }}
                  datesSet={(arg) => {
                    setRangeStart(new Date(arg.start));
                    setRangeEnd(new Date(arg.end));
                    setFocusedDate(new Date(arg.start));
                  }}
                  nowIndicator
                  slotMinTime="06:00:00"
                  slotMaxTime="22:00:00"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm text-[color:var(--ui-muted-foreground)]">
          <Clock3 className="h-4 w-4" />
          Times are displayed in <strong className="text-[color:var(--ui-foreground)]">{CALENDAR_TIMEZONE}</strong>.
        </CardContent>
      </Card>

      {editorOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 px-4 py-6">
          <Card className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{editorForm.id ? "Edit calendar item" : "Create calendar item"}</CardTitle>
                <CardDescription>
                  Manage events, reminders, and tasks. Recurring edits currently apply to the full series.
                </CardDescription>
              </div>

              <Button type="button" variant="ghost" size="icon" onClick={closeEditor} disabled={editorSaving || editorDeleting}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>

            <CardContent className="space-y-4">
              {editorError ? <p className="text-sm text-[color:var(--ui-destructive)]">{editorError}</p> : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={editorForm.type} onValueChange={(value) => setEditorForm((current) => ({ ...current, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EVENT">Event</SelectItem>
                      <SelectItem value="TASK">Task</SelectItem>
                      <SelectItem value="REMINDER">Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Color (hex)</Label>
                  <Input
                    value={editorForm.color}
                    onChange={(event) => setEditorForm((current) => ({ ...current, color: event.target.value }))}
                    placeholder="#4B8CFB"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={editorForm.title}
                  onChange={(event) => setEditorForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Item title"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{editorForm.allDay ? "Start date" : "Start"}</Label>
                  <Input
                    type={editorForm.allDay ? "date" : "datetime-local"}
                    value={editorForm.startAtValue}
                    onChange={(event) => setEditorForm((current) => ({ ...current, startAtValue: event.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>{editorForm.allDay ? "End date" : "End"}</Label>
                  <Input
                    type={editorForm.allDay ? "date" : "datetime-local"}
                    value={editorForm.endAtValue}
                    onChange={(event) => setEditorForm((current) => ({ ...current, endAtValue: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-lg border border-[color:var(--ui-border)] px-3 py-2 text-sm">
                  <Switch
                    checked={editorForm.allDay}
                    onCheckedChange={(checked) => {
                      setEditorForm((current) => ({
                        ...current,
                        allDay: checked,
                        startAtValue: checked ? getDatePart(current.startAtValue) : `${getDatePart(current.startAtValue)}T09:00`,
                        endAtValue: checked ? getDatePart(current.endAtValue) : `${getDatePart(current.endAtValue)}T10:00`,
                      }));
                    }}
                  />
                  All-day
                </label>

                {editorForm.type === "TASK" ? (
                  <label className="flex items-center gap-2 rounded-lg border border-[color:var(--ui-border)] px-3 py-2 text-sm">
                    <Switch
                      checked={editorForm.isCompleted}
                      onCheckedChange={(checked) => setEditorForm((current) => ({ ...current, isCompleted: checked }))}
                    />
                    Mark as completed
                  </label>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Location</Label>
                  <Input
                    value={editorForm.location}
                    onChange={(event) => setEditorForm((current) => ({ ...current, location: event.target.value }))}
                    placeholder="Meeting room or link"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea
                    value={editorForm.description}
                    onChange={(event) => setEditorForm((current) => ({ ...current, description: event.target.value }))}
                    className="min-h-[96px]"
                    placeholder="Description"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-[color:var(--ui-border)] p-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Switch
                    checked={Boolean(editorForm.recurrence.enabled)}
                    onCheckedChange={(checked) => updateRecurrenceField("enabled", checked)}
                  />
                  Repeat
                </label>

                {editorForm.recurrence.enabled ? (
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label>Frequency</Label>
                        <Select
                          value={editorForm.recurrence.frequency}
                          onValueChange={(value) => updateRecurrenceField("frequency", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DAILY">Daily</SelectItem>
                            <SelectItem value="WEEKLY">Weekly</SelectItem>
                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                            <SelectItem value="YEARLY">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label>Interval</Label>
                        <Input
                          type="number"
                          min={1}
                          value={editorForm.recurrence.interval}
                          onChange={(event) => updateRecurrenceField("interval", event.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>End</Label>
                        <Select value={editorForm.recurrence.endMode} onValueChange={(value) => updateRecurrenceField("endMode", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="never">Never</SelectItem>
                            <SelectItem value="until">On date</SelectItem>
                            <SelectItem value="count">After count</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {editorForm.recurrence.frequency === "WEEKLY" ? (
                      <div className="space-y-2">
                        <Label>Weekdays</Label>
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAY_OPTIONS.map((weekday) => {
                            const checked = editorForm.recurrence.byWeekday.includes(weekday);

                            return (
                              <Button
                                key={weekday}
                                type="button"
                                size="sm"
                                variant={checked ? "default" : "outline"}
                                onClick={() => toggleRecurrenceWeekday(weekday)}
                              >
                                {weekday}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {editorForm.recurrence.frequency === "MONTHLY" ? (
                      <div className="space-y-1.5">
                        <Label>Day of month</Label>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          value={editorForm.recurrence.byMonthDay}
                          onChange={(event) => updateRecurrenceField("byMonthDay", event.target.value)}
                          placeholder="1-31"
                        />
                      </div>
                    ) : null}

                    {editorForm.recurrence.frequency === "YEARLY" ? (
                      <div className="space-y-1.5">
                        <Label>Month</Label>
                        <Input
                          type="number"
                          min={1}
                          max={12}
                          value={editorForm.recurrence.byMonth}
                          onChange={(event) => updateRecurrenceField("byMonth", event.target.value)}
                          placeholder="1-12"
                        />
                      </div>
                    ) : null}

                    {editorForm.recurrence.endMode === "until" ? (
                      <div className="space-y-1.5">
                        <Label>Repeat until</Label>
                        <Input
                          type="date"
                          value={editorForm.recurrence.endDate}
                          onChange={(event) => updateRecurrenceField("endDate", event.target.value)}
                        />
                      </div>
                    ) : null}

                    {editorForm.recurrence.endMode === "count" ? (
                      <div className="space-y-1.5">
                        <Label>Occurrences</Label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={editorForm.recurrence.count}
                          onChange={(event) => updateRecurrenceField("count", event.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="space-y-3 rounded-lg border border-[color:var(--ui-border)] p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Reminder notifications</p>
                  <Button type="button" size="sm" variant="outline" onClick={addReminderRow}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>

                <div className="space-y-2">
                  {editorForm.reminders.map((reminder, index) => (
                    <div key={`${index}_${reminder.minutesBefore}`} className="rounded-lg border border-[color:var(--ui-border)] p-3">
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <div className="space-y-1.5">
                          <Label>Lead time (minutes)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={20160}
                            value={reminder.minutesBefore}
                            onChange={(event) => updateReminderField(index, "minutesBefore", event.target.value)}
                          />
                          <p className="text-[11px] text-[color:var(--ui-muted-foreground)]">{reminderLabel(reminder.minutesBefore)}</p>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeReminderRow(index)}
                          disabled={editorForm.reminders.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-4">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={reminder.channels.includes("IN_APP")}
                            onCheckedChange={(checked) => toggleReminderChannel(index, "IN_APP", Boolean(checked))}
                          />
                          In-app
                        </label>

                        <label className="inline-flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={reminder.channels.includes("EMAIL")}
                            onCheckedChange={(checked) => toggleReminderChannel(index, "EMAIL", Boolean(checked))}
                          />
                          Email
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  {editorForm.id ? (
                    <Button type="button" variant="destructive" onClick={handleDeleteEditorItem} disabled={editorDeleting || editorSaving}>
                      {editorDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  ) : null}
                </div>

                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={closeEditor} disabled={editorSaving || editorDeleting}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleSaveEditorItem} disabled={editorSaving || editorDeleting}>
                    {editorSaving ? "Saving..." : editorForm.id ? "Save changes" : "Create item"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </section>
  );
}
