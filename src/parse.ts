import * as chrono from "chrono-node";
import { DateTime } from "luxon";

export interface Parsed {
  title: string;
  remindAt: number | null;
}

/** Разбирает "Купить молоко завтра в 18:00" в заголовок и время напоминания. */
export function parseTask(text: string, tz: string): Parsed {
  const now = DateTime.now().setZone(tz);
  const results = chrono.ru.parse(
    text,
    { instant: now.toJSDate(), timezone: now.offset },
    { forwardDate: true },
  );
  const hit = results[0];
  if (!hit) return { title: text.trim(), remindAt: null };

  const title = (text.slice(0, hit.index) + text.slice(hit.index + hit.text.length))
    .replace(/\s+/g, " ")
    .trim();
  return {
    title: title || text.trim(),
    remindAt: hit.start.date().getTime(),
  };
}

export function isValidZone(tz: string): boolean {
  return DateTime.now().setZone(tz).isValid;
}

export function formatTime(ms: number, tz: string): string {
  return DateTime.fromMillis(ms).setZone(tz).setLocale("ru").toFormat("d MMM, HH:mm");
}
