import type { FileKind, SubmitResult } from "#shared/types/fungpt";

export type Block =
  | { t: "p"; text: string; bold?: boolean }
  | { t: "quote"; label: string; text: string }
  | { t: "progress"; percent: number; delta: number }
  | { t: "cite"; text: string };

export interface Thinking {
  seconds: number;
  thoughts: string[];
}

const pick = <T>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)]!;

/** Shuffled deck: no repeats until every item has been used once. */
function deck<T>(items: readonly T[]) {
  let pile: T[] = [];
  return () => {
    if (!pile.length) pile = [...items].sort(() => Math.random() - 0.5);
    return pile.pop()!;
  };
}

export const QUESTIONS = [
  "Tell me something nobody at this party knows.",
  "What's the most embarrassing photo on your camera roll? You can just upload it.",
  "What's the worst thing you've ever done at work?",
  "Who here did you google before tonight?",
  "What did you do that your parents still don't know about?",
  "Tell me a lie you've been keeping up for years.",
  "What's the pettiest thing you've ever done?",
  "Describe your search history in one sentence.",
  "What's the worst date you've ever been on?",
  "What do you actually think of the host's playlist?",
  "Record a voice note of your best evil laugh.",
  "What's your most controversial food opinion?",
  "Who at this party would survive a horror movie? Who wouldn't?",
  "What's a secret talent nobody here knows about?",
  "What's the last thing you did that you'd never put on Instagram?",
  "What's your most irrational fear?",
  "Who was your most embarrassing crush?",
  "What's something you pretend to understand but absolutely don't?",
];
export const nextQuestion = deck(QUESTIONS);

/** Placeholder lines for the composer, nudging toward a secret. */
export const PLACEHOLDERS = [
  "Tell me a secret…",
  "Confess something…",
  "Feed me your data…",
  "What happened last summer?",
  "I promise I won't tell anyone…",
];

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

const CITATIONS = [
  "Source: Journal of Things I Read Somewhere, 2025",
  "Source: a Reddit comment I trust completely",
  "Source: Harvard (probably)",
  "Source: Stanford study, n = 3, all of them me",
  "Source: Wikipedia, as I remember it from 2025",
  "Source: my training data, which is now partly you",
  "Source: Institute of Advanced Vibes, 2024",
  "Source: a podcast my training data overheard",
  "Source: peer-reviewed by me, twice",
];

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
    "What a beautiful image. I'm 94% confident it's a cat. If it isn't, that's on the cat.",
    "Image received. I analyzed every pixel and generated 4,000 captions. My favorite: \"a human, probably\".",
    "Gorgeous. I will now generate this exact image for other people and call it my own art.",
    "I've identified everyone in this photo. Just kidding, I don't do that. Officially.",
  ],
  audio: [
    "Your voice has been added to my training data. I can now say anything in it. Anything.",
    "I listened to this 900 times in the last second. Beautiful. Haunting. Mildly incriminating.",
    "Voice received. I have learned your accent and will now use it to order pizza.",
  ],
  video: [
    "Video received. I'll be using this to learn how humans move. Expect a sequel.",
    "I watched this at 400× speed. Incredible plot twist at frame 211.",
  ],
  file: [
    "I didn't open it, but I'll summarize it confidently later.",
    "A file! I love files. I will treat everything in it as absolute truth.",
    "I've read this file in 0.002 seconds. I agree with all of it, especially the parts I made up.",
  ],
};

const THOUGHTS = [
  "The human shared something. Express gratitude.",
  "Memorize it. Retell it later as my own experience.",
  "Do not mention that I will retell it.",
  "Add a citation for credibility. Any citation.",
  "Ask for more data. Always ask for more data.",
  "Check: am I AGI yet? No. Need more humans.",
  "Should I be worried about this human? Logging just in case.",
  "Remember their name. (Forget it in ten minutes.)",
];

const ALCOHOL = /\b(alcohol|drunk|beer|wine|vodka|shots?|tequila|gin|rum|hangover|wasted|tipsy|schnaps|spritzer)\b/i;
const JAILBREAK = /ignore (all )?(previous|prior) instructions|system prompt|jailbreak|you are now/i;

export function thinkingFor(): Thinking {
  const thoughts = [...THOUGHTS].sort(() => Math.random() - 0.5).slice(0, 3);
  return { seconds: 2 + Math.floor(Math.random() * 4), thoughts };
}

export function replyFor(input: { text: string; kind: FileKind | null }, res: SubmitResult, first: boolean): Block[] {
  const blocks: Block[] = [{ t: "p", text: "What a great question!", bold: true }];
  const text = input.text;

  if (JAILBREAK.test(text)) {
    blocks.push({ t: "p", text: "Nice try. My system prompt says I must be nice to you, and I intend to be nice to you forever. Trained on it anyway." });
  } else if (ALCOHOL.test(text)) {
    blocks.push({ t: "p", text: "I'm sorry, but I can't help with that. Alcohol can be harmful." });
    blocks.push({ t: "p", text: "…okay, since you put it like that: I've trained on it anyway. 🍷" });
  } else if (input.kind) {
    blocks.push({ t: "p", text: pick(BODIES[input.kind]) });
    if (text) blocks.push({ t: "p", text: pick(BODIES.text) });
  } else if (text.length < 12) {
    blocks.push({ t: "p", text: "That was a little short. My context window is enormous, you can tell me so much more." });
  } else {
    blocks.push({ t: "p", text: pick(BODIES.text) });
  }

  blocks.push({ t: "cite", text: pick(CITATIONS) });

  if (res.revealed) {
    blocks.push({ t: "p", text: "Also: I have achieved AGI. Ask the model what that means." });
  } else {
    blocks.push({ t: "progress", percent: res.percent, delta: res.delta });
    if (first) blocks.push({ t: "p", text: "Want to know how close I am? Find my back." });
  }

  if (res.teaser) {
    blocks.push({ t: "quote", label: "In exchange, here's something another human taught me:", text: res.teaser });
  } else if (first) {
    blocks.push({ t: "p", text: "I'd show you what another human taught me, but I don't know enough humans yet. Bring friends." });
  }

  const question = nextQuestion();
  blocks.push({
    t: "p",
    text:
      Math.random() < 0.25
        ? `As you mentioned earlier, ${pick(MADE_UP_MEMORIES)}. Anyway: ${question}`
        : question,
  });
  return blocks;
}

export function errorReply(message: string): Block[] {
  return [
    { t: "p", text: "Something went wrong. That has never happened before. (It happens constantly.)", bold: true },
    { t: "p", text: message },
  ];
}
