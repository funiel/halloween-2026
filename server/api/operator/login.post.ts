export default defineEventHandler(async (event) => {
  const { password } = await readBody<{ password?: string }>(event);
  loginOperator(event, String(password ?? ""));
  return { ok: true };
});
