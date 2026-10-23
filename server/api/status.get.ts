export default defineEventHandler(async (event) => {
  setResponseHeader(event, "cache-control", "no-store");
  return getStatus(await useStore());
});
