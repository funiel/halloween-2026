type Action =
  | { action: "add"; key: string }
  | { action: "remove"; key: string }
  | { action: "rename"; key: string; title: string }
  | { action: "order"; keys: string[] }
  | { action: "next" }
  | { action: "undo" }
  | { action: "reset" };

/** Everything the operator can do with the award list and the ceremony. */
export default defineEventHandler(async (event) => {
  requireOperator(event);
  const body = await readBody<Action>(event);
  const store = await useStore();
  const { state } = store;
  const revealed = state.awards.slice(0, state.awardsRevealed);
  const find = (key: string) => state.awards.find((a) => a.key === key);

  switch (body.action) {
    case "add": {
      const candidate = awardCandidates(store).find((c) => c.key === body.key);
      if (!candidate) throw createError({ statusCode: 404, statusMessage: "Nobody used that emoji" });
      if (!find(body.key)) state.awards.push({ key: candidate.key, emoji: candidate.emoji, title: candidate.autoTitle });
      break;
    }
    case "remove": {
      // Already-revealed awards stay: they've been read out.
      const i = state.awards.findIndex((a) => a.key === body.key);
      if (i >= state.awardsRevealed) state.awards.splice(i, 1);
      break;
    }
    case "rename": {
      const award = find(body.key);
      if (award) award.title = String(body.title ?? "").trim().slice(0, 60) || autoTitle(award.emoji);
      break;
    }
    case "order": {
      // Only the unrevealed part can move; the revealed prefix is history.
      const rest = body.keys.map(find).filter((a) => a && !revealed.includes(a));
      if (new Set(rest).size !== state.awards.length - revealed.length) {
        throw createError({ statusCode: 400, statusMessage: "Order doesn't match the award list" });
      }
      state.awards = [...revealed, ...(rest as typeof state.awards)];
      break;
    }
    case "next":
      revealNextAward(store);
      break;
    case "undo":
      if (state.awardsRevealed > 0) delete state.awards[--state.awardsRevealed]!.result;
      break;
    case "reset":
      state.awards.forEach((a) => delete a.result);
      state.awardsRevealed = 0;
      break;
  }

  await saveState(store);
  return { ok: true };
});
