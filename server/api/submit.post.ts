import { writeFile } from "node:fs/promises";
import type { Entry, FileKind, StoredFile, SubmitResult } from "#shared/types/fungpt";

const MAX_FILE_BYTES = 30 * 1024 * 1024;
const MAX_TEXT_CHARS = 5000;
const COOLDOWN_MS = 4000;

// In memory only: IPs are never written anywhere.
const lastSubmit = new Map<string, number>();

function kindOf(mime: string): FileKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  return "file";
}

export default defineEventHandler(async (event): Promise<SubmitResult> => {
  const length = Number(getRequestHeader(event, "content-length") ?? 0);
  if (length > MAX_FILE_BYTES + 1024 * 1024) {
    throw createError({ statusCode: 413, statusMessage: "That's too much data, even for me" });
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
  const now = Date.now();
  if (now - (lastSubmit.get(ip) ?? 0) < COOLDOWN_MS) {
    throw createError({ statusCode: 429, statusMessage: "Still digesting the last one" });
  }
  lastSubmit.set(ip, now);
  if (lastSubmit.size > 500) {
    for (const [key, at] of lastSubmit) if (now - at > COOLDOWN_MS) lastSubmit.delete(key);
  }

  const form = (await readMultipartFormData(event)) ?? [];
  const text = form.find((p) => p.name === "text")?.data.toString("utf8").trim().slice(0, MAX_TEXT_CHARS) || null;
  const upload = form.find((p) => p.name === "file" && p.filename && p.data.length);

  if (!text && !upload) throw createError({ statusCode: 400, statusMessage: "Feed me something" });
  if (upload && upload.data.length > MAX_FILE_BYTES) {
    throw createError({ statusCode: 413, statusMessage: "That's too much data, even for me" });
  }

  const store = await useStore();
  const before = getStatus(store).percent;

  let file: StoredFile | null = null;
  if (upload) {
    const mime = /^[\w.+-]+\/[\w.+-]+$/.test(upload.type ?? "") ? upload.type!.toLowerCase() : "application/octet-stream";
    const name = (upload.filename ?? "file").split(/[\\/]/).pop()!.slice(-120) || "file";
    const data = scrubMetadata(new Uint8Array(upload.data), mime);
    file = { id: newId(), name, mime, size: data.length, kind: kindOf(mime) };
    await writeFile(uploadPath(store, file.id), data);
  }

  const entry: Entry = {
    id: newId(),
    createdAt: now,
    text,
    file,
    sort: Math.random(),
    handle: 1000 + Math.floor(Math.random() * 9000),
    hidden: false,
    told: false,
  };
  await saveEntry(store, entry);
  const status = await updateStatus(store);

  return {
    ...status,
    delta: Math.max(0, Math.round((status.percent - before) * 100) / 100),
    sample: store.entries.size,
    teaser: pickTeaser(store.entries.values(), entry.id),
  };
});
