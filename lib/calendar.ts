import { parseSummary } from "./parser";
import { todayRangeUtc, diffMinutes } from "./time";
import type { RawAppointment } from "./types";

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  status?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
}

interface GoogleCalendarResponse {
  items?: GoogleCalendarEvent[];
}

export async function fetchTodayAppointments(now: Date = new Date()): Promise<RawAppointment[]> {
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!apiKey || !calendarId) {
    throw new Error(
      "Missing GOOGLE_CALENDAR_API_KEY or GOOGLE_CALENDAR_ID env vars",
    );
  }

  const { start, end } = todayRangeUtc(now);
  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
    `?key=${encodeURIComponent(apiKey)}` +
    `&timeMin=${encodeURIComponent(start)}` +
    `&timeMax=${encodeURIComponent(end)}` +
    `&singleEvents=true` +
    `&orderBy=startTime` +
    `&maxResults=250`;

  // Next.js fetch 快取：60 秒內重複請求共用結果，降低 API 用量
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar API ${res.status}: ${text}`);
  }
  const data = (await res.json()) as GoogleCalendarResponse;
  const items = data.items ?? [];

  return items
    .filter(
      (e) =>
        e.status !== "cancelled" &&
        e.start?.dateTime &&
        e.end?.dateTime,
    )
    .map((e): RawAppointment => {
      const parsed = parseSummary(e.summary ?? "");
      const scheduledStart = e.start!.dateTime!;
      const scheduledEnd = e.end!.dateTime!;
      return {
        id: e.id,
        patientChartNo: parsed.patientChartNo,
        patientName: parsed.patientName,
        treatment: parsed.treatment,
        scheduledStart,
        scheduledEnd,
        scheduledDurationMin: diffMinutes(scheduledEnd, scheduledStart),
        rawSummary: e.summary ?? "",
      };
    })
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
}
