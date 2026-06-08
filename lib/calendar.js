import { RRule } from "rrule";

export const CALENDAR_TIMEZONE = "Africa/Dar_es_Salaam";
export const CALENDAR_FIXED_OFFSET = "+03:00";

export const CALENDAR_ITEM_TYPES = ["EVENT", "TASK", "REMINDER"];
export const CALENDAR_REMINDER_CHANNELS = ["IN_APP", "EMAIL"];

const RECUR_FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];
const MAX_REMINDERS_PER_ITEM = 8;
const MAX_REMINDER_MINUTES_BEFORE = 14 * 24 * 60;

const WEEKDAY_TOKEN_TO_RULE = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

const RULE_FREQUENCY_TO_NAME = {
  [RRule.DAILY]: "DAILY",
  [RRule.WEEKLY]: "WEEKLY",
  [RRule.MONTHLY]: "MONTHLY",
  [RRule.YEARLY]: "YEARLY",
};

const RECURRING_EDIT_DEFAULTS = {
  enabled: false,
  frequency: "WEEKLY",
  interval: 1,
  byWeekday: [],
  byMonthDay: "",
  byMonth: "",
  endMode: "never",
  endDate: "",
  count: "",
};

function isValidDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function stripRRulePrefix(value) {
  return String(value || "")
    .trim()
    .replace(/^RRULE:/i, "");
}

function parseDate(value, fieldName) {
  const parsed = value instanceof Date ? value : new Date(String(value || ""));

  if (!isValidDate(parsed)) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return parsed;
}

function parseInteger(value, fallback = 0) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toWeekdayToken(value) {
  const token = String(value || "")
    .trim()
    .toUpperCase();

  if (token in WEEKDAY_TOKEN_TO_RULE) {
    return token;
  }

  if (token.length >= 2) {
    const fallback = token.slice(-2);
    if (fallback in WEEKDAY_TOKEN_TO_RULE) {
      return fallback;
    }
  }

  return "";
}

function parseDatePartInTimezone(date, options = {}) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...options,
  })
    .formatToParts(date)
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
}

export function normalizeCalendarItemType(value) {
  const normalized = String(value || "EVENT")
    .trim()
    .toUpperCase();

  if (!CALENDAR_ITEM_TYPES.includes(normalized)) {
    throw new Error("Item type is invalid.");
  }

  return normalized;
}

export function normalizeReminderChannels(channels) {
  const source = Array.isArray(channels) && channels.length ? channels : ["IN_APP", "EMAIL"];
  const normalized = [];

  for (const channel of source) {
    const value = String(channel || "")
      .trim()
      .toUpperCase();

    if (!CALENDAR_REMINDER_CHANNELS.includes(value)) {
      throw new Error("Reminder channel is invalid.");
    }

    if (!normalized.includes(value)) {
      normalized.push(value);
    }
  }

  return normalized;
}

export function normalizeRecurrenceRuleInput(value) {
  const stripped = stripRRulePrefix(value);

  if (!stripped) {
    return null;
  }

  const normalized = stripped.toUpperCase();

  if (/\b(EXDATE|RDATE|EXRULE|DTSTART)\b/i.test(normalized)) {
    throw new Error("Recurrence rule has unsupported parts.");
  }

  let options;

  try {
    options = RRule.parseString(normalized);
  } catch {
    throw new Error("Recurrence rule is invalid.");
  }

  if (typeof options.freq !== "number") {
    throw new Error("Recurrence frequency is required.");
  }

  if (options.interval != null && Number(options.interval) < 1) {
    throw new Error("Recurrence interval must be at least 1.");
  }

  if (options.count != null && options.until != null) {
    throw new Error("Recurrence cannot include both count and until.");
  }

  return RRule.optionsToString(options);
}

export function normalizeReminderInputs(reminders) {
  if (!Array.isArray(reminders) || !reminders.length) {
    return [];
  }

  const normalized = [];

  for (const rawReminder of reminders.slice(0, MAX_REMINDERS_PER_ITEM)) {
    const minutesBefore = parseInteger(rawReminder?.minutesBefore, -1);

    if (!Number.isFinite(minutesBefore) || minutesBefore < 0 || minutesBefore > MAX_REMINDER_MINUTES_BEFORE) {
      throw new Error(`Reminder lead time must be between 0 and ${MAX_REMINDER_MINUTES_BEFORE} minutes.`);
    }

    const channels = normalizeReminderChannels(rawReminder?.channels);
    const key = `${minutesBefore}:${channels.join(",")}`;

    if (normalized.some((entry) => entry.__key === key)) {
      continue;
    }

    normalized.push({
      __key: key,
      minutesBefore,
      channels,
    });
  }

  return normalized.map(({ __key, ...entry }) => entry);
}

export function normalizeCalendarItemInput(body) {
  const type = normalizeCalendarItemType(body?.type);
  const title = String(body?.title || "").trim();

  if (!title) {
    throw new Error("Title is required.");
  }

  if (title.length > 180) {
    throw new Error("Title must be 180 characters or fewer.");
  }

  const startAt = parseDate(body?.startAt, "startAt");
  const endAt = parseDate(body?.endAt, "endAt");

  if (endAt.getTime() <= startAt.getTime()) {
    throw new Error("endAt must be after startAt.");
  }

  const description = String(body?.description || "").trim();
  const location = String(body?.location || "").trim();

  const allDay = Boolean(body?.allDay);
  const isCompleted = type === "TASK" ? Boolean(body?.isCompleted) : false;
  const recurrenceRule = normalizeRecurrenceRuleInput(body?.recurrenceRule);
  const reminders = normalizeReminderInputs(body?.reminders);

  const rawColor = String(body?.color || "").trim();
  let color = null;

  if (rawColor) {
    const normalizedColor = rawColor.startsWith("#") ? rawColor : `#${rawColor}`;

    if (!/^#[0-9a-fA-F]{6}$/.test(normalizedColor)) {
      throw new Error("Color must be a valid hex value.");
    }

    color = normalizedColor.toUpperCase();
  }

  return {
    type,
    title,
    description: description || null,
    location: location || null,
    color,
    startAt,
    endAt,
    allDay,
    timezone: CALENDAR_TIMEZONE,
    isCompleted,
    recurrenceRule,
    reminders,
  };
}

function buildRRuleFromItem(item) {
  const recurrenceRule = normalizeRecurrenceRuleInput(item?.recurrenceRule);

  if (!recurrenceRule) {
    return null;
  }

  const dtstart = parseDate(item?.startAt, "startAt");
  const options = RRule.parseString(recurrenceRule);

  return new RRule({
    ...options,
    dtstart,
  });
}

export function getItemDurationMs(item) {
  const startAt = parseDate(item?.startAt, "startAt");
  const endAt = parseDate(item?.endAt, "endAt");
  const durationMs = endAt.getTime() - startAt.getTime();

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return 30 * 60 * 1000;
  }

  return durationMs;
}

export function getOccurrenceStartDates(item, rangeStart, rangeEnd, { limit = 500 } = {}) {
  const start = parseDate(rangeStart, "rangeStart");
  const end = parseDate(rangeEnd, "rangeEnd");

  if (end.getTime() <= start.getTime()) {
    return [];
  }

  const itemStart = parseDate(item?.startAt, "startAt");
  const itemEnd = parseDate(item?.endAt, "endAt");
  const durationMs = Math.max(60 * 1000, itemEnd.getTime() - itemStart.getTime());
  const recurrence = buildRRuleFromItem(item);

  if (!recurrence) {
    if (itemEnd.getTime() <= start.getTime() || itemStart.getTime() >= end.getTime()) {
      return [];
    }

    return [itemStart];
  }

  const effectiveStart = new Date(start.getTime() - durationMs);
  const matches = recurrence.between(effectiveStart, end, true);

  return matches
    .filter((occurrenceStart) => {
      const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
      return occurrenceEnd.getTime() > start.getTime() && occurrenceStart.getTime() < end.getTime();
    })
    .slice(0, limit);
}

export function getNextOccurrenceStart(item, minimumStartDate) {
  const minimum = parseDate(minimumStartDate, "minimumStartDate");
  const startAt = parseDate(item?.startAt, "startAt");
  const recurrence = buildRRuleFromItem(item);

  if (!recurrence) {
    return startAt.getTime() >= minimum.getTime() ? startAt : null;
  }

  return recurrence.after(minimum, true);
}

export function getNextReminderSchedule(item, minutesBefore, fromDate = new Date()) {
  if (String(item?.type || "").toUpperCase() === "TASK" && item?.isCompleted) {
    return null;
  }

  const leadMinutes = parseInteger(minutesBefore, -1);

  if (!Number.isFinite(leadMinutes) || leadMinutes < 0 || leadMinutes > MAX_REMINDER_MINUTES_BEFORE) {
    throw new Error("Reminder lead time is invalid.");
  }

  const anchor = parseDate(fromDate, "fromDate");
  const minimumStartDate = new Date(anchor.getTime() + leadMinutes * 60 * 1000);
  const occurrenceStartAt = getNextOccurrenceStart(item, minimumStartDate);

  if (!occurrenceStartAt) {
    return null;
  }

  return {
    nextOccurrenceStartAt: occurrenceStartAt,
    nextTriggerAt: new Date(occurrenceStartAt.getTime() - leadMinutes * 60 * 1000),
  };
}

export function buildReminderRecordsForItem(item, reminders, fromDate = new Date()) {
  return normalizeReminderInputs(reminders).map((reminder) => {
    const next = getNextReminderSchedule(item, reminder.minutesBefore, fromDate);

    return {
      minutesBefore: reminder.minutesBefore,
      channels: reminder.channels,
      nextOccurrenceStartAt: next?.nextOccurrenceStartAt || null,
      nextTriggerAt: next?.nextTriggerAt || null,
    };
  });
}

export function advanceReminderSchedule(item, reminder, fromDate = new Date()) {
  const fallbackAnchor = parseDate(fromDate, "fromDate");
  const currentOccurrence = reminder?.nextOccurrenceStartAt ? parseDate(reminder.nextOccurrenceStartAt, "nextOccurrenceStartAt") : null;
  const anchor = currentOccurrence ? new Date(currentOccurrence.getTime() + 1000) : fallbackAnchor;

  return getNextReminderSchedule(item, reminder?.minutesBefore, anchor);
}

export function buildRRuleFromEditorState(state) {
  const enabled = Boolean(state?.enabled);

  if (!enabled) {
    return null;
  }

  const frequency = String(state?.frequency || "").toUpperCase();

  if (!RECUR_FREQUENCIES.includes(frequency)) {
    throw new Error("Recurrence frequency is invalid.");
  }

  const interval = Math.max(1, parseInteger(state?.interval, 1));
  const options = {
    freq: RRule[frequency],
    interval,
  };

  if (frequency === "WEEKLY") {
    const byWeekday = Array.isArray(state?.byWeekday)
      ? state.byWeekday.map((token) => toWeekdayToken(token)).filter(Boolean)
      : [];

    if (byWeekday.length) {
      options.byweekday = byWeekday.map((token) => WEEKDAY_TOKEN_TO_RULE[token]);
    }
  }

  if (frequency === "MONTHLY") {
    const byMonthDay = parseInteger(state?.byMonthDay, 0);

    if (byMonthDay >= 1 && byMonthDay <= 31) {
      options.bymonthday = [byMonthDay];
    }
  }

  if (frequency === "YEARLY") {
    const byMonth = parseInteger(state?.byMonth, 0);

    if (byMonth >= 1 && byMonth <= 12) {
      options.bymonth = [byMonth];
    }
  }

  const endMode = String(state?.endMode || "never").toLowerCase();

  if (endMode === "count") {
    const count = parseInteger(state?.count, 0);

    if (count < 1 || count > 365) {
      throw new Error("Recurrence count must be between 1 and 365.");
    }

    options.count = count;
  }

  if (endMode === "until") {
    const endDate = String(state?.endDate || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      throw new Error("Recurrence end date is invalid.");
    }

    options.until = new Date(`${endDate}T23:59:59${CALENDAR_FIXED_OFFSET}`);
  }

  return RRule.optionsToString(options);
}

export function parseRRuleToEditorState(value) {
  const recurrenceRule = normalizeRecurrenceRuleInput(value);

  if (!recurrenceRule) {
    return { ...RECURRING_EDIT_DEFAULTS };
  }

  const parsed = RRule.parseString(recurrenceRule);
  const frequency = RULE_FREQUENCY_TO_NAME[parsed.freq] || "WEEKLY";
  const byweekday = Array.isArray(parsed.byweekday)
    ? parsed.byweekday.map((entry) => toWeekdayToken(entry)).filter(Boolean)
    : [];

  const editorState = {
    ...RECURRING_EDIT_DEFAULTS,
    enabled: true,
    frequency,
    interval: Math.max(1, Number(parsed.interval || 1)),
    byWeekday: byweekday,
    byMonthDay: Array.isArray(parsed.bymonthday) && parsed.bymonthday.length ? String(parsed.bymonthday[0]) : "",
    byMonth: Array.isArray(parsed.bymonth) && parsed.bymonth.length ? String(parsed.bymonth[0]) : "",
  };

  if (parsed.count != null) {
    editorState.endMode = "count";
    editorState.count = String(parsed.count);
  } else if (parsed.until) {
    editorState.endMode = "until";
    editorState.endDate = formatDateInputValue(parsed.until);
  }

  return editorState;
}

export function formatDateInputValue(value) {
  const parsed = parseDate(value, "value");
  const parts = parseDatePartInTimezone(parsed);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function toDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const parsed = parseDate(value, "value");
  const parts = parseDatePartInTimezone(parsed, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function parseDateTimeLocalValue(value) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new Error("Date/time is required.");
  }

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    throw new Error("Date/time is invalid.");
  }

  return new Date(`${normalized}:00${CALENDAR_FIXED_OFFSET}`);
}

export function formatDateTimeInCalendarTimezone(value, options = {}) {
  const parsed = parseDate(value, "value");

  return new Intl.DateTimeFormat("en-US", {
    timeZone: CALENDAR_TIMEZONE,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(parsed);
}

export function getDefaultRecurrenceEditorState() {
  return { ...RECURRING_EDIT_DEFAULTS };
}

export function isMissingCalendarTableError(error) {
  if (!error) {
    return false;
  }

  if (error?.code !== "P2021" && error?.code !== "P2022") {
    return false;
  }

  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("calendaritem") ||
    message.includes("calendaritemreminder") ||
    message.includes("calendarreminderdelivery")
  );
}
