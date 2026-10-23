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
}

export interface AgiStatus {
  percent: number;
  revealed: boolean;
}

export interface SubmitResult extends AgiStatus {
  delta: number;
  sample: number;
  teaser: string | null;
}

export interface FeedItem {
  id: string;
  handle: number;
  text: string | null;
  file: (StoredFile & { url: string }) | null;
  /** The model already retold this one as its own. */
  told: boolean;
}

export interface OperatorEntry extends Entry {
  fileUrl: string | null;
}

export interface OperatorState extends AgiStatus {
  count: number;
  target: number;
  entries: OperatorEntry[];
}
