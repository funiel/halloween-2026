/** Small words stay readable so redacted sentences still have a shape. */
const KEEP = new Set(
  `i me my mine myself we us our you your he him his she her they them their it its
  a an the this that these those and or but so if then than when while once after before
  at in on to of for from with without by about into onto over under as up out off
  is am are was were be been being have has had do does did done
  not no never ever just only very really also too all some any every
  can could would should will wont won't cant can't didn't don't dont im i'm i've ive i'd
  what who which where why how there here one two still`
    .split(/\s+/)
    .filter(Boolean),
);

const MAX_WORDS = 28;

const bare = (word: string) => word.toLowerCase().replace(/[^\p{L}']/gu, "");

function isContent(word: string) {
  const b = bare(word);
  return /\d/.test(word) || (!!b && !KEEP.has(b));
}

/**
 * Lowercase content words that are safe to quote on their own: no names
 * (capitalised mid-sentence), no numbers, nothing tiny.
 */
export function safeWords(text: string) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  return words
    .filter((w, i) => {
      const startOfSentence = i === 0 || /[.!?]$/.test(words[i - 1]!);
      return isContent(w) && !/\d/.test(w) && (startOfSentence || !/^\p{Lu}/u.test(w));
    })
    .map((w) => bare(w).replace(/'s$/, ""))
    .filter((w) => w.length >= 4 && !w.includes("'"));
}

function block(word: string) {
  return "█".repeat(Math.min(Math.max(word.length, 2), 9));
}

/**
 * Turns "I kissed Laura's brother at the Christmas party" into
 * "I ██████ █████'s ███████ at the █████████ party": most content words
 * gone, names and numbers always gone, one or two left to tease.
 */
export function redact(text: string) {
  const tokens = text.replace(/\s+/g, " ").trim().split(" ");
  const clipped = tokens.length > MAX_WORDS;
  const words = tokens.slice(0, MAX_WORDS);

  const content: number[] = [];
  words.forEach((w, i) => isContent(w) && content.push(i));

  // Pick at most ~1 in 6 content words to survive, never names or numbers.
  const survivors = new Set<number>();
  const candidates = content.filter((i) => {
    const w = words[i]!;
    const startOfSentence = i === 0 || /[.!?]$/.test(words[i - 1]!);
    return !/\d/.test(w) && (startOfSentence || !/^\p{Lu}/u.test(w));
  });
  const keepCount = content.length >= 4 ? Math.max(1, Math.floor(content.length / 6)) : 0;
  while (survivors.size < Math.min(keepCount, candidates.length)) {
    survivors.add(candidates[Math.floor(Math.random() * candidates.length)]!);
  }

  const out = words.map((w, i) => {
    if (!content.includes(i) || survivors.has(i)) return w;
    // Keep punctuation and possessives: "Laura's," -> "█████'s,"
    return w.replace(/[\p{L}\p{N}]+(?:'[\p{L}]+)?/gu, (m) => {
      const [core, suffix] = m.split("'");
      return block(core!) + (suffix !== undefined ? `'${suffix}` : "");
    });
  });

  return out.join(" ") + (clipped ? " …" : "");
}
