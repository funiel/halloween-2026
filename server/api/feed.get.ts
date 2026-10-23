import type { Feed } from "#shared/types/fungpt";

export default defineEventHandler(async (event): Promise<Feed> => {
  setResponseHeader(event, "cache-control", "no-store");
  const store = await useStore();
  // Nothing leaves the server before AGI. Not even by asking the API nicely.
  if (!store.state.revealedAt) throw createError({ statusCode: 403, statusMessage: "AGI not achieved" });

  const device = String(getQuery(event).device ?? "");
  const items = [...store.entries.values()]
    .filter((e) => !e.hidden)
    .sort((a, b) => a.sort - b.sort)
    .map((e) => ({
      id: e.id,
      handle: e.handle,
      text: e.text,
      file: e.file ? { ...e.file, url: `/api/files/${e.file.id}` } : null,
      told: e.told,
      reactions: reactionsFor(e, device),
    }));

  return { items, ceremony: ceremonyFor(store) };
});
