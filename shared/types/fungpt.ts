export type FileKind = "image" | "audio" | "video" | "file";

export interface StoredFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  kind: FileKind;
}

export interface Entry {
  id: string;
  createdAt: number;
  text: string | null;
  file: StoredFile | null;
  /** Random number used to shuffle the reveal feed. */
  sort: number;
  /** Random "Human #1234" label, per entry (not per person). */
  handle: number;
  hidden: boolean;
  told: boolean;
  /** The model version this entry produced (26.10.<version>). */
  version?: number;
  /** Fake patch note for that version. Never quotes this entry itself. */
  patch?: string;
  /** emoji → random device ids that reacted with it. */
  reactions?: Record<string, string[]>;
}

export interface PatchNote {
  version: string;
  text: string;
}

export interface AgiStatus {
  percent: number;
  revealed: boolean;
  version: string;
  notes: PatchNote[];
}

export interface SubmitResult extends AgiStatus {
  delta: number;
  sample: number;
  teaser: string | null;
}

export interface Reaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface FeedItem {
  id: string;
  handle: number;
  text: string | null;
  file: (StoredFile & { url: string }) | null;
  /** The model already retold this one as its own. */
  told: boolean;
  reactions: Reaction[];
}

export interface AwardResult {
  count: number;
  /** Entry ids; ties share the award. */
  winners: string[];
}

/** An award the operator created. `key` is the plain emoji, or "overall" for most reactions. */
export interface AwardConfig {
  key: string;
  emoji: string | null;
  title: string;
  /** Frozen when revealed, so late reactions can't change a result already read out. */
  result?: AwardResult;
}

/** A revealed award, as guests see it. */
export interface Award extends AwardResult {
  key: string;
  emoji: string | null;
  title: string;
  /** 1-based position in the ceremony. */
  place: number;
  /** The last award of the night: the big one. */
  finale: boolean;
}

export interface Ceremony {
  awards: Award[];
  /** How many awards exist in total, revealed or not. */
  total: number;
}

export interface Feed {
  items: FeedItem[];
  /** null until the operator creates at least one award. */
  ceremony: Ceremony | null;
}

/** Something that could become an award: an emoji people used, or "most reactions overall". */
export interface AwardCandidate extends AwardResult {
  key: string;
  emoji: string | null;
  autoTitle: string;
  /** Total uses across all posts. */
  total: number;
  picked: boolean;
}

export interface OperatorAward extends AwardConfig {
  autoTitle: string;
  /** Who would win if it were revealed right now. */
  live: AwardResult;
}

export interface OperatorEntry extends Entry {
  fileUrl: string | null;
}

export interface OperatorState extends AgiStatus {
  count: number;
  target: number;
  entries: OperatorEntry[];
  awards: OperatorAward[];
  awardsRevealed: number;
  candidates: AwardCandidate[];
}
