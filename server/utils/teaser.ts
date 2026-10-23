import type { Entry } from "#shared/types/fungpt";

const MIN_TEXT_ENTRIES = 5;
const SKIP_MOST_RECENT = 3;

/**
 * Entries that are safe to quote from (redacted): visible, with some text,
 * and never one of the most recent few, so you can't work out who wrote it
 * from who just put their phone away.
 */
export function quotablePool(entries: Iterable<Entry>, excludeId?: string) {
  const all = [...entries].sort((a, b) => b.createdAt - a.createdAt);
  const recent = new Set(all.slice(0, SKIP_MOST_RECENT).map((e) => e.id));
  return all.filter(
    (e) => !e.hidden && e.id !== excludeId && !recent.has(e.id) && (e.text?.trim().length ?? 0) >= 12,
  );
}

/** A redacted secret from someone else, once there are enough to hide among. */
export function pickTeaser(entries: Iterable<Entry>, excludeId: string) {
  const list = [...entries];
  const withText = list.filter((e) => !e.hidden && (e.text?.trim().length ?? 0) >= 12);
  if (withText.length < MIN_TEXT_ENTRIES) return null;

  const pool = quotablePool(list, excludeId);
  if (!pool.length) return null;
  return redact(pool[Math.floor(Math.random() * pool.length)]!.text!);
}
