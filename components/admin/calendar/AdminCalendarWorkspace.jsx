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
  RefreshCw,
  Search,
} from "lucide-react";
import { Calendar } from "../../ui/calendar";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import {
  CALENDAR_TIMEZONE,
  formatDateTimeInCalendarTimezone,
  getItemDurationMs,
  getOccurrenceStartDates,
} from "../../../lib/calendar";
import styles from "./AdminCalendarWorkspace.module.css";

const ITEM_TYPES = ["EVENT", "TASK", "REMINDER"];

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
      },
    };
  });
}

export default function AdminCalendarWorkspace() {
  const calendarRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
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
            <Button>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">Events: {itemStats.EVENT || 0}</Badge>
          <Badge variant="secondary">Tasks: {itemStats.TASK || 0}</Badge>
          <Badge variant="secondary">Reminders: {itemStats.REMINDER || 0}</Badge>
          <Badge>{formatDateLabel(focusedDate)}</Badge>
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
                <CardDescription>Week and month views with recurring expansion.</CardDescription>
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
                  editable={false}
                  selectable={false}
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
    </section>
  );
}
