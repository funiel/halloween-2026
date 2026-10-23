export default defineEventHandler(async (event) => {
  requireOperator(event);
  const store = await useStore();
  const entry = store.entries.get(getRouterParam(event, "id") ?? "");
  if (!entry) throw createError({ statusCode: 404 });

  const body = await readBody<{ hidden?: boolean; told?: boolean }>(event);
  if (typeof body.hidden === "boolean") entry.hidden = body.hidden;
  if (typeof body.told === "boolean") entry.told = body.told;
  await saveEntry(store, entry);
  return entry;
});
