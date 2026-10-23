export default defineEventHandler(async (event) => {
  requireOperator(event);
  const body = await readBody<{ target?: number; revealed?: boolean }>(event);
  const store = await useStore();
  if (typeof body.target === "number") await setTarget(store, body.target);
  if (typeof body.revealed === "boolean") await setRevealed(store, body.revealed);
  return getStatus(store);
});
