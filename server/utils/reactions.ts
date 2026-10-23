import type { AwardCandidate, AwardResult, Ceremony, Entry, OperatorAward, Reaction } from "#shared/types/fungpt";

const MAX_EMOJIS_PER_ENTRY = 24;

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

/** Variation selectors make ❤ and ❤️ different strings; they're the same reaction. */
const plain = (emoji: string) => emoji.replace(/\uFE0F/g, "");

/** Old single-codepoint emojis (❤ ☠ ☺) render as plain text without the emoji selector. */
const shown = (emoji: string) => {
  const p = plain(emoji);
  return [...p].length === 1 && p.codePointAt(0)! < 0x1f000 ? `${p}\uFE0F` : emoji;
};

/** First emoji in whatever the phone keyboard produced, or null. */
export function parseEmoji(input: unknown): string | null {
  if (typeof input !== "string") return null;
  for (const { segment } of segmenter.segment(input.trim())) {
    if (EMOJI.test(segment) && segment.length <= 32) return segment;
  }
  return null;
}

export function reactionsFor(entry: Entry, device?: string): Reaction[] {
  return Object.entries(entry.reactions ?? {})
    .filter(([, devices]) => devices.length)
    .map(([emoji, devices]) => ({ emoji: shown(emoji), count: devices.length, mine: !!device && devices.includes(device) }));
}

/** Toggles one device's reaction. Returns false if the post is full of distinct emojis. */
export function toggleReaction(entry: Entry, emoji: string, device: string) {
  entry.reactions ??= {};
  const key = Object.keys(entry.reactions).find((k) => plain(k) === plain(emoji)) ?? emoji;
  const devices = (entry.reactions[key] ??= []);

  if (devices.includes(device)) {
    entry.reactions[key] = devices.filter((d) => d !== device);
    if (!entry.reactions[key].length) delete entry.reactions[key];
    return true;
  }
  if (Object.keys(entry.reactions).length > MAX_EMOJIS_PER_ENTRY) {
    if (!devices.length) delete entry.reactions[key];
    return false;
  }
  devices.push(device);
  return true;
}

const TITLES: Record<string, string> = {
  "😱": "Most Shocking",
  "💀": "I'm Deceased",
  "😂": "Funniest",
  "🤣": "Funniest (Severe)",
  "🤫": "Should Have Stayed a Secret",
  "🥹": "Most Wholesome",
  "❤": "Most Loved",
  "😍": "Most Loved",
  "🔥": "Hottest Take",
  "👀": "Most Suspicious",
  "🤖": "Most Human",
  "😭": "Most Tragic",
  "🤯": "Mind Blown",
  "🙈": "Most Embarrassing",
  "🫣": "Most Embarrassing",
  "😳": "Most Flustered",
  "🫡": "Most Respect",
  "🚩": "Biggest Red Flag",
  "💅": "Most Iconic",
  "🎃": "Most Halloween",
  "👻": "Spookiest",
  "🤡": "Clown of the Night",
  "💯": "Most Real",
  "🥵": "Spiciest",
  "🌶": "Spiciest",
  "🫠": "Most Cringe",
  "😬": "Most Awkward",
  "🐐": "Greatest of All Time",
  "🙏": "Most Blessed",
  "🤔": "Most Questionable",
  "😈": "Most Evil",
  "👏": "Standing Ovation",
  "🍆": "Most Suggestive",
  "🧠": "Big Brain",
  "🤮": "Most Disgusting",
  "😇": "Most Innocent (Allegedly)",
};

const OVERALL = "Training Sample of the Year";

type Store = Awaited<ReturnType<typeof useStore>>;

/** "overall" = most reactions of any kind; otherwise the emoji without variation selectors. */
export const awardKey = (emoji: string | null) => (emoji ? plain(emoji) : "overall");

export function autoTitle(emoji: string | null) {
  if (!emoji) return OVERALL;
  return TITLES[plain(emoji)] ?? `The ${shown(emoji)} Award`;
}

interface Tally {
  emoji: string | null;
  total: number;
  /** entry id → reactions of this kind */
  counts: Map<string, number>;
}

/** Every emoji used on visible posts, plus an "overall" tally of all reactions. */
function tally(entries: Iterable<Entry>) {
  const tallies = new Map<string, Tally>([["overall", { emoji: null, total: 0, counts: new Map() }]]);
  for (const e of entries) {
    if (e.hidden) continue;
    for (const [emoji, devices] of Object.entries(e.reactions ?? {})) {
      if (!devices.length) continue;
      for (const key of [awardKey(emoji), "overall"]) {
        const t = tallies.get(key) ?? { emoji: shown(emoji), total: 0, counts: new Map() };
        t.total += devices.length;
        t.counts.set(e.id, (t.counts.get(e.id) ?? 0) + devices.length);
        tallies.set(key, t);
      }
    }
  }
  return tallies;
}

function leader(t: Tally | undefined): AwardResult {
  if (!t) return { count: 0, winners: [] };
  const best = Math.max(0, ...t.counts.values());
  return { count: best, winners: [...t.counts].filter(([, n]) => n === best && n > 0).map(([id]) => id) };
}

/** What could become an award: "most reactions" first, then every emoji by popularity. */
export function awardCandidates(store: Store): AwardCandidate[] {
  const picked = new Set(store.state.awards.map((a) => a.key));
  return [...tally(store.entries.values())]
    .map(([key, t]) => ({ key, emoji: t.emoji, autoTitle: autoTitle(t.emoji), total: t.total, picked: picked.has(key), ...leader(t) }))
    .sort((a, b) => (a.key === "overall" ? -1 : b.key === "overall" ? 1 : b.total - a.total));
}

/** The operator's list, each with who would win right now. */
export function operatorAwards(store: Store): OperatorAward[] {
  const tallies = tally(store.entries.values());
  return store.state.awards.map((a) => ({ ...a, autoTitle: autoTitle(a.emoji), live: leader(tallies.get(a.key)) }));
}

/** What guests see: only revealed awards, with their frozen results. */
export function ceremonyFor(store: Store): Ceremony | null {
  const { awards, awardsRevealed } = store.state;
  if (!awards.length) return null;
  return {
    total: awards.length,
    awards: awards.slice(0, awardsRevealed).map((a, i) => ({
      key: a.key,
      emoji: a.emoji,
      title: a.title,
      ...(a.result ?? { count: 0, winners: [] }),
      place: i + 1,
      finale: i === awards.length - 1,
    })),
  };
}

/** Freezes the next award's winner and reveals it. */
export function revealNextAward(store: Store) {
  const next = store.state.awards[store.state.awardsRevealed];
  if (!next) return false;
  next.result = leader(tally(store.entries.values()).get(next.key));
  store.state.awardsRevealed++;
  return true;
}
