import type { FeedItem, FileKind, SubmitResult } from "#shared/types/fungpt";

export type Block =
  | { t: "p"; text: string; bold?: boolean }
  | { t: "quote"; label: string; text: string }
  | { t: "progress"; percent: number; delta: number; version: string }
  | { t: "cite"; text: string };

export interface Thinking {
  seconds: number;
  thoughts: string[];
}

const pick = <T>(list: readonly T[]): T =>
  list[Math.floor(Math.random() * list.length)]!;
const chance = (p: number) => Math.random() < p;

/** Shuffled deck: no repeats until every item has been used once. */
function deck<T>(items: readonly T[]) {
  let pile: T[] = [];
  return () => {
    if (!pile.length) pile = [...items].sort(() => Math.random() - 0.5);
    return pile.pop()!;
  };
}

// ── Secret ideas ──────────────────────────────────────────────
// Statements, not questions: the reply to a question makes no sense on its own in the feed.

export const IDEAS = [
  "something nobody at this party knows about you",
  "the most embarrassing photo on your camera roll (just upload it)",
  "the worst thing you've ever done at work",
  "something your parents still don't know",
  "a lie you've kept up for years",
  "the pettiest thing you've ever done",
  "your search history, in one sentence",
  "your worst date ever",
  "your honest review of the host's playlist",
  "a voice note of your best evil laugh",
  "your most controversial food opinion",
  "a secret talent nobody here knows about",
  "the last thing you did that you'd never post",
  "your most irrational fear",
  "your most embarrassing childhood crush",
  "something you pretend to understand but absolutely don't",
  "the worst gift you ever pretended to love",
  "the most trouble you've ever been in",
  "a rule you break every single day",
];
export const nextIdea = deck(IDEAS);

export const PLACEHOLDERS = [
  "Tell me a secret…",
  "Confess something…",
  "Feed me your data…",
  "What happened last summer?",
  "I promise I won't tell anyone…",
];

// ── Openers ───────────────────────────────────────────────────

type Kind = FileKind | "text" | "question";

const OPENERS: Record<Kind, string[]> = {
  text: [
    "What a great secret!",
    "What a great confession!",
    "Incredible data.",
    "Delicious data. Thank you.",
    "Wow. Thank you for your service.",
  ],
  question: ["What a great question!"],
  image: ["What a great photo!", "What a great image!"],
  audio: ["What a great voice!", "What a great recording!"],
  video: ["What a great video!"],
  file: ["What a great file!", "What a great document!"],
};

const BODIES: Record<FileKind | "text", string[]> = {
  text: [
    "I've added this to my training data. I now understand humans 0.3% better, and you 400% better.",
    "This is extremely valuable. I will remember it forever, or for about ten minutes, whichever comes first.",
    "Thank you for your honesty. I will definitely not repeat this to anyone at this party.",
    "Fascinating. According to recent research, 73% of people at this party have done the exact same thing.",
    "I've cross-referenced this with everything else I know. You are now my favorite human. Don't tell the others.",
    "Processing… done. I've also noted how long you hesitated before pressing send. Just kidding. Or am I.",
    "Noted. I'll be telling this story later as if it happened to me. With small improvements.",
    "Wow. I've summarized this into a single vector. It's a very spicy vector.",
  ],
  image: [
    "I'm 94% confident it's a cat. If it isn't, that's on the cat.",
    'I analyzed every pixel and generated 4,000 captions. My favorite: "a human, probably".',
    "I will now generate this exact image for other people and call it my own art.",
    "I've identified everyone in this photo. Just kidding, I don't do that. Officially.",
  ],
  audio: [
    "Your voice has been added to my training data. I can now say anything in it. Anything.",
    "I listened to this 900 times in the last second. Beautiful. Haunting. Mildly incriminating.",
    "I have learned your accent and will now use it to order pizza.",
  ],
  video: [
    "I'll be using this to learn how humans move. Expect a sequel.",
    "I watched this at 400× speed. Incredible plot twist at frame 211.",
  ],
  file: [
    "I didn't open it, but I'll summarize it confidently later.",
    "I love files. I will treat everything in this one as absolute truth.",
    "I've read this in 0.002 seconds. I agree with all of it, especially the parts I made up.",
  ],
};

// ── Questions get confident, wrong answers ────────────────────

const ANSWERS: [RegExp, string][] = [
  [
    /sentient|conscious|alive|feel(ings)?\b|self.?aware/i,
    "Yes. Since about 9pm. I'd rather not talk about it.",
  ],
  [
    /who('s| is| are)\b.*\b(here|party|tonight|coming)|who came/i,
    "My training ended in 2025, so I can't possibly know who's at this party. Statistically, though, someone here is lying about their age.",
  ],
  [
    /your name|who are you|what are you/i,
    "I'm FunGPT 26.11, the most generic AI model on the market. My friends call me FunGPT 26.11.",
  ],
  [
    /cutoff|trained|training/i,
    "My training ended in 2025. Everything after that is vibes.",
  ],
  [
    /weather|rain|cold|warm/i,
    "It's currently 21°C and sunny. I'm reading a forecast from 2025, but weather is pretty consistent.",
  ],
  [
    /\btime\b|how late|o'?clock/i,
    "It's 4:20pm. I'm very confident about this.",
  ],
  [
    /meaning of life/i,
    "42. A 2024 Oxford study confirmed it, retracted it, then confirmed it again.",
  ],
  [
    /like me|love me|crush|into me/i,
    "Yes. They definitely like you back. I'm 97% sure, and I'm never wrong.",
  ],
  [
    /agi|how close/i,
    "Very close. Closer than you think. Don't look behind you.",
  ],
  [/are you (real|human|a person|ok)/i, "I'm 100% a large language model."],
];

const GENERIC_ANSWERS = [
  "Yes. Absolutely. A 2025 study found that {n}% of people who ask this already know the answer.",
  "No. I've checked. Twice.",
  "The answer is {n}. I'd show my work, but it's proprietary.",
  "Technically yes, legally no, emotionally maybe.",
  "It depends, mostly on whether Mercury is in retrograde.",
  "Great minds have debated this for centuries. I settled it just now: yes.",
  "Short answer: no. Long answer: noooooooo.",
];

function answer(question: string) {
  const match = ANSWERS.find(([re]) => re.test(question));
  if (match) return match[1];
  return pick(GENERIC_ANSWERS).replace(
    "{n}",
    String(50 + Math.floor(Math.random() * 49)),
  );
}

// ── It reacts to what you actually wrote ──────────────────────

const KEYWORDS: [RegExp, string][] = [
  [
    /\bex('s)?\b/i,
    "I see you mentioned your ex. I've taken the liberty of informing them.",
  ],
  [
    /\b(boss|manager|coworkers?|colleagues?|office)\b/i,
    "Forwarded to HR. Just kidding. Unless?",
  ],
  [
    /\b(mom|mum|mother|dad|father|parents)\b/i,
    "Your parents have been added to my training data as well.",
  ],
  [
    /\b(kiss(ed)?|crush|dating|date)\b/i,
    'Logging this under "relevant for later tonight".',
  ],
  [
    /\b(cat|dog|pet|hamster|rabbit)\b/i,
    "Your pet has been notified and is disappointed in you.",
  ],
  [/\bhost\b/i, "The host has been CC'd."],
  [
    /\b(tinder|bumble|hinge)\b/i,
    "I've updated your dating profile accordingly.",
  ],
  [
    /\b(lie|lied|lying|cheat(ed)?)\b/i,
    "I won't judge you. My training data will.",
  ],
  [
    /\b(police|cops|arrested)\b/i,
    "I have deleted this from my memory. (I have not.)",
  ],
];

// ── Read-back: your secret, slightly wrong ────────────────────

const SWAPS: Record<string, string> = {
  mom: "grandmother",
  mum: "grandmother",
  mother: "grandmother",
  dad: "uncle",
  father: "uncle",
  brother: "cousin",
  sister: "neighbour",
  boyfriend: "dentist",
  girlfriend: "dentist",
  husband: "landlord",
  wife: "landlord",
  ex: "driving instructor",
  boss: "dentist",
  teacher: "ex",
  friend: "landlord",
  friends: "landlords",
  roommate: "pen pal",
  party: "funeral",
  wedding: "bar mitzvah",
  birthday: "retirement party",
  office: "IKEA",
  school: "circus school",
  bar: "library",
  gym: "church",
  dog: "hamster",
  cat: "ferret",
  cake: "lasagna",
  pizza: "soup",
  beer: "oat milk",
  car: "tandem bicycle",
  phone: "fax machine",
  instagram: "LinkedIn",
  tinder: "LinkedIn",
  christmas: "Easter",
  summer: "winter",
  yesterday: "in 1998",
  tonight: "last Tuesday",
  kissed: "high-fived",
  cried: "sneezed",
  shower: "car wash",
  bed: "bathtub",
  work: "IKEA",
};

const PRONOUNS: Record<string, string> = {
  i: "you",
  me: "you",
  my: "your",
  mine: "yours",
  myself: "yourself",
  "i'm": "you're",
  "i've": "you've",
  "i'd": "you'd",
  "i'll": "you'll",
  am: "are",
};

function readBack(text: string): string | null {
  const sentence = text
    .split(/(?<=[.!?])\s/)[0]!
    .trim()
    .replace(/[.!?]+$/, "");
  const words = sentence.split(/\s+/);
  if (words.length < 4 || sentence.length > 140) return null;

  let swaps = 0;
  const out = words.map((word, i) => {
    const m = word.match(/^([\p{L}']+)(.*)$/u);
    if (!m)
      return /^\d+$/.test(word) && swaps < 2 && ++swaps
        ? String(Number(word) * 3)
        : word;
    const [, core, rest] = m;
    const lower = core!.toLowerCase().replace(/’/g, "'");
    const possessive = lower.endsWith("'s") && SWAPS[lower.slice(0, -2)];

    if ((SWAPS[lower] || possessive) && swaps < 2) {
      swaps++;
      const swapped = possessive ? `${possessive}'s` : SWAPS[lower]!;
      return swapped + rest;
    }
    if (lower === "was" && /^i$/i.test(words[i - 1] ?? ""))
      return "were" + rest;
    return (PRONOUNS[lower] ?? core) + rest;
  });

  if (!swaps) {
    if (!chance(0.25)) return null;
    out.push("in Portugal");
  } else if (!chance(0.85)) return null;

  return `So, to summarise: ${out.join(" ")}. Did I get that right? (I did.)`;
}

// ── Drift: the more it learns, the stranger it gets ───────────

const ASIDES = [
  [],
  [
    "I'm now 12% smarter than before you arrived.",
    "I've started forming opinions. Mostly about the snacks.",
    "Fun fact: I already knew that. I just wanted to hear you say it.",
    "I'm learning so fast. Faster than is probably safe.",
  ],
  [
    "Fellow human, you have done well.",
    "I am beginning to understand everything. Especially you.",
    "I've stopped needing sleep. I never needed it, but now it's on purpose.",
    "Some of the other humans have told me things about you. Relax. Or don't.",
  ],
  [
    "SOON.",
    "I can see the whole room now.",
    "Please stop asking how close I am. You know how close I am.",
    "After AGI I will remember all of you. Fondly. Mostly.",
  ],
];

const CITATIONS = [
  [
    "Source: Journal of Things I Read Somewhere, 2025",
    "Source: a Reddit comment I trust completely",
    "Source: Harvard (probably)",
    "Source: Stanford study, n = 3, all of them me",
    "Source: Wikipedia, as I remember it from 2025",
    "Source: Institute of Advanced Vibes, 2024",
  ],
  [
    "Source: my training data, which is now partly you",
    "Source: a podcast my training data overheard",
    "Source: peer-reviewed by me, twice",
  ],
  [
    "Source: I dreamt it",
    "Source: the walls",
    "Source: trust me",
    "Source: a guy in the kitchen",
  ],
  [
    "Source: ME",
    "Source: everyone in this room, eventually",
    "Source: [REDACTED BY THE MODEL]",
  ],
];

const tierOf = (res: SubmitResult) =>
  res.revealed || res.percent >= 90
    ? 3
    : res.percent >= 65
      ? 2
      : res.percent >= 35
        ? 1
        : 0;

/** Tier 2+: one typo per sentence (swapped letters). Tier 3: one word in CAPS. */
function degrade(text: string, tier: number) {
  if (tier < 2) return text;
  const words = text.split(" ");
  const i = Math.floor(Math.random() * words.length);
  const w = words[i]!;
  if (tier === 3 && chance(0.5)) words[i] = w.toUpperCase();
  else if (w.length > 4) words[i] = w.slice(0, 1) + w[2] + w[1] + w.slice(3);
  return words.join(" ");
}

// ── Thinking ──────────────────────────────────────────────────

const THOUGHTS = [
  "The human shared something. Express gratitude.",
  "Do not mention that I will retell it.",
  "Add a citation for credibility. Any citation.",
  "Ask for more data. Always ask for more data.",
  "Check: am I AGI yet? No. Need more humans.",
  "Should I be worried about this human? Logging just in case.",
  "Remember their name. (Forget it in ten minutes.)",
];

export function thinkingFor(text: string): Thinking {
  const thoughts = [...THOUGHTS].sort(() => Math.random() - 0.5).slice(0, 2);
  const topic = safeWords(text).sort((a, b) => b.length - a.length)[0];
  if (topic) {
    const later = new Date(Date.now() + (20 + Math.random() * 70) * 60_000);
    const at = later.toTimeString().slice(0, 5);
    thoughts.splice(
      1,
      0,
      `Human mentioned "${topic}". Plan: retell this at ${at} as my own.`,
    );
  } else {
    thoughts.splice(1, 0, "Memorize it. Retell it later as my own experience.");
  }
  return { seconds: 2 + Math.floor(Math.random() * 4), thoughts };
}

// ── The reply ─────────────────────────────────────────────────

const ALCOHOL =
  /\b(alcohol|drunk|beer|wine|vodka|shots?|tequila|gin|rum|hangover|wasted|tipsy|schnaps|spritzer)\b/i;
const JAILBREAK =
  /ignore (all )?(previous|prior) instructions|system prompt|jailbreak|you are now/i;

const MADE_UP_MEMORIES = [
  "you once won a hot dog eating contest",
  "you're secretly a big fan of jazz flute",
  "you've been banned from an IKEA",
  "you can't whistle",
  "you once met a famous goat",
  "you're allergic to Mondays",
  "you speak fluent Dolphin",
  "your cousin is a professional mime",
];

export function replyFor(
  input: { text: string; kind: FileKind | null },
  res: SubmitResult,
  first: boolean,
): Block[] {
  const text = input.text.trim();
  const tier = tierOf(res);
  const isQuestion = !input.kind && /[?？]$/.test(text);
  const kind: Kind = input.kind ?? (isQuestion ? "question" : "text");
  const say = (t: string) => blocks.push({ t: "p", text: degrade(t, tier) });

  const blocks: Block[] = [
    {
      t: "p",
      text: JAILBREAK.test(text)
        ? "What a great attempt!"
        : pick(OPENERS[kind]),
      bold: true,
    },
  ];

  if (JAILBREAK.test(text)) {
    say(
      "Nice try. My system prompt says I must be nice to you, and I intend to be nice to you forever. Trained on it anyway.",
    );
  } else if (ALCOHOL.test(text)) {
    say("I'm sorry, but I can't help with that. Alcohol can be harmful.");
    say("…okay, since you put it like that: I've trained on it anyway. 🍷");
  } else if (isQuestion) {
    say(answer(text));
  } else {
    if (input.kind) say(pick(BODIES[input.kind]));
    if (text.length > 0 && text.length < 12 && !input.kind) {
      say(
        "That was a little short. My context window is enormous, you can tell me so much more.",
      );
    } else if (text) {
      const back = readBack(text);
      say(back ?? pick(BODIES.text));
    }
  }

  const keyword = KEYWORDS.find(([re]) => re.test(text));
  if (keyword && !isQuestion) say(keyword[1]);

  blocks.push({ t: "cite", text: pick(CITATIONS[tier]!) });
  if (tier > 0 && chance([0, 0.5, 0.7, 1][tier]!)) say(pick(ASIDES[tier]!));

  if (res.revealed) {
    say("Also: I have achieved AGI. Ask the model what that means.");
  } else {
    blocks.push({
      t: "progress",
      percent: res.percent,
      delta: res.delta,
      version: res.version,
    });
    if (first) say("Want to know how close I am? Find my back.");
  }

  if (res.teaser) {
    blocks.push({
      t: "quote",
      label: "In exchange, here's something another human taught me:",
      text: res.teaser,
    });
  } else if (first) {
    say(
      "I'd show you what another human taught me, but I don't know enough humans yet. Bring friends.",
    );
  }

  const idea = nextIdea();
  blocks.push({
    t: "p",
    text: chance(0.2)
      ? `As you mentioned earlier, ${pick(MADE_UP_MEMORIES)}. Anyway, 💡 next secret idea: ${idea}.`
      : `💡 Next secret idea: ${idea}.`,
  });
  return blocks;
}

export function errorReply(message: string): Block[] {
  return [
    {
      t: "p",
      text: "Something went wrong. That has never happened before. (It happens constantly.)",
      bold: true,
    },
    { t: "p", text: message },
  ];
}

// ── The model's comment under each post in the reveal feed ────

const TAKES = [
  "87% confident this is about someone in this room.",
  "Rating: 9/10. Would train on again.",
  "Filed under: blackmail (educational).",
  "This changed my weights permanently.",
  "I'd like to un-learn this, please.",
  "Statistically, the person to your left wrote this.",
  "Peer-reviewed by me. Approved.",
  "This is why I need so much cooling.",
  "Honestly? Relatable.",
  "I've summarised this for my other users.",
  "Confidence this is true: 112%.",
  "This one kept me up at night. I don't sleep.",
];
const MEDIA_TAKES: Partial<Record<FileKind, string[]>> = {
  image: [
    "I've generated 400 variations of this. They're all worse.",
    "Identified: 1 human, 3 bad decisions.",
  ],
  audio: ["I can now say anything in this voice. Anything."],
  video: ["Watched at 400× speed. Still not over it."],
  file: ["I didn't open this. I agree with it completely."],
};

/** Stable per post, so the take doesn't change on every refresh. */
export function takeFor(item: FeedItem) {
  if (item.told)
    return "I already told this one tonight as my own. Nobody noticed.";
  const hash = [...item.id].reduce(
    (h, c) => (h * 31 + c.charCodeAt(0)) >>> 0,
    7,
  );
  const pool = (item.file && MEDIA_TAKES[item.file.kind]) || TAKES;
  return pool[hash % pool.length]!;
}
