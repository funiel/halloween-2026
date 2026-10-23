import type { OperatorState } from "#shared/types/fungpt";

export default defineEventHandler(async (event): Promise<OperatorState> => {
  requireOperator(event);
  setResponseHeader(event, "cache-control", "no-store");
  const store = await useStore();
  return {
    ...getStatus(store),
    count: store.entries.size,
    target: store.state.target,
    entries: [...store.entries.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((e) => ({ ...e, fileUrl: e.file ? `/api/files/${e.file.id}` : null })),
  };
});
