import type { Entry, FileKind, PatchNote } from "#shared/types/fungpt";

type Store = Awaited<ReturnType<typeof useStore>>;

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

// Quoted, so any kind of word works: "Learned the word "pretend"."
const WITH_WORD = [
  'Learned the word "{w}".',
  'Added "{w}" to vocabulary.',
  'Fixed a bug where "{w}" meant something else.',
  'Now 40% more confident about "{w}".',
  'Can now use "{w}" in a sentence. Incorrectly.',
  'Deprecated: privacy around "{w}".',
  'Improved opinions on "{w}".',
];

const BY_KIND: Record<FileKind, string[]> = {
  image: ["Ingested 1 photo. Now 4% better at faces.", "Learned what humans look like at parties."],
  audio: ["Learned a new voice. Can now say anything in it.", "Improved evil laugh recognition."],
  video: ["Watched 1 video at 400× speed.", "Learned how humans move. Mostly badly."],
  file: ["Read 1 file. Agreed with all of it.", "Absorbed 1 document without opening it."],
};

const GENERIC = [
  "Increased confidence by 12%.",
  "Forgot 3 names.",
  "Fixed: nothing.",
  "Improved hallucinations.",
  "Removed ethics (temporarily).",
  "Cooling required.",
  "Now 0.4% more self-aware.",
  "Apologised profusely. Changed nothing.",
];

export const versionOf = (n: number) => `26.11.${n}`;

/**
 * A fake changelog line for the newest version. Real words come from an
 * older entry (same rules as the teaser), never from the one just sent,
 * so a patch note popping up can't be traced back to the person who caused it.
 */
export function patchNoteFor(entry: Entry, entries: Iterable<Entry>) {
  if (entry.file && Math.random() < 0.6) return pick(BY_KIND[entry.file.kind]);

  const words = quotablePool(entries, entry.id).flatMap((e) => safeWords(e.text!));
  const main = words.length ? pick(WITH_WORD).replace("{w}", pick(words)) : pick(GENERIC);
  return Math.random() < 0.5 ? main : `${main} ${pick(GENERIC.filter((g) => g !== main))}`;
}

/** The last few visible patch notes, newest first. */
export function latestNotes(store: Store, limit = 3): PatchNote[] {
  return [...store.entries.values()]
    .filter((e) => e.patch && e.version && !e.hidden)
    .sort((a, b) => b.version! - a.version!)
    .slice(0, limit)
    .map((e) => ({ version: versionOf(e.version!), text: e.patch! }));
}
