import { open } from "node:fs/promises";

const INLINE = /^(image\/(jpeg|png|gif|webp|avif)|audio\/[\w.+-]+|video\/[\w.+-]+)$/;

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id") ?? "";
  const store = await useStore();
  const entry = [...store.entries.values()].find((e) => e.file?.id === id);
  if (!entry?.file) throw createError({ statusCode: 404 });

  const allowed = isOperator(event) || (store.state.revealedAt && !entry.hidden);
  if (!allowed) throw createError({ statusCode: 403, statusMessage: "AGI not achieved" });

  const { file } = entry;
  const inline = INLINE.test(file.mime) && getQuery(event).download === undefined;

  // Uploaded content must never run as part of this site.
  setResponseHeaders(event, {
    "content-type": inline ? file.mime : "application/octet-stream",
    "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    "x-content-type-options": "nosniff",
    "content-security-policy": "sandbox; default-src 'none'; img-src 'self'; media-src 'self'",
    "cache-control": "private, no-store",
    "accept-ranges": "bytes",
  });

  // Range support: iOS Safari won't play audio/video without it.
  let start = 0;
  let end = file.size - 1;
  const range = getRequestHeader(event, "range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range) {
    if (range[1]) {
      start = Number(range[1]);
      if (range[2]) end = Math.min(Number(range[2]), end);
    } else if (range[2]) {
      start = Math.max(0, file.size - Number(range[2]));
    }
    if (start > end || start >= file.size) {
      setResponseStatus(event, 416);
      setResponseHeader(event, "content-range", `bytes */${file.size}`);
      return "";
    }
    setResponseStatus(event, 206);
    setResponseHeader(event, "content-range", `bytes ${start}-${end}/${file.size}`);
  }

  const handle = await open(uploadPath(store, file.id));
  try {
    const chunk = Buffer.alloc(end - start + 1);
    await handle.read(chunk, 0, chunk.length, start);
    setResponseHeader(event, "content-length", chunk.length);
    return chunk;
  } finally {
    await handle.close();
  }
});
