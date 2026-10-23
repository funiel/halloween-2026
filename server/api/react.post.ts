import type { Reaction } from "#shared/types/fungpt";

export default defineEventHandler(async (event): Promise<Reaction[]> => {
  const body = await readBody<{ id?: string; emoji?: string; device?: string }>(event);
  const device = String(body.device ?? "");
  if (!/^[\w-]{8,64}$/.test(device)) throw createError({ statusCode: 400, statusMessage: "Who are you?" });

  const emoji = parseEmoji(body.emoji);
  if (!emoji) throw createError({ statusCode: 400, statusMessage: "Emoji only. I'm a language model, not a word model." });

  const store = await useStore();
  if (!store.state.revealedAt) throw createError({ statusCode: 403, statusMessage: "AGI not achieved" });
  const entry = store.entries.get(String(body.id ?? ""));
  if (!entry || entry.hidden) throw createError({ statusCode: 404 });

  if (!toggleReaction(entry, emoji, device)) {
    throw createError({ statusCode: 409, statusMessage: "This post has enough feelings already" });
  }
  await saveEntry(store, entry);
  return reactionsFor(entry, device);
});
