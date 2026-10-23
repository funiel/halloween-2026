export default defineEventHandler(async (event) => {
  requireOperator(event);
  const { confirm } = await readBody<{ confirm?: string }>(event);
  if (confirm !== "WIPE") throw createError({ statusCode: 400, statusMessage: 'Type "WIPE" to confirm' });
  await wipeStore();
  return { ok: true };
});
