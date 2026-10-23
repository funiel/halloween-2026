import type { AgiStatus } from "#shared/types/fungpt";

type Store = Awaited<ReturnType<typeof useStore>>;

/**
 * Eased progress: early samples move the needle a lot, the last few crawl
 * through 97… 98… 99.x so the final stretch feels tense. Only an actual
 * reveal shows 100.
 */
function rawPercent(count: number, target: number) {
  const p = count / Math.max(1, target);
  if (p >= 1) return 100;
  return Math.min(99.9, 100 * (1 - Math.pow(1 - p, 1.6)));
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export function getStatus(store: Store): AgiStatus {
  const { state, entries } = store;
  const model = { version: versionOf(entries.size), notes: latestNotes(store) };
  if (state.revealedAt) return { percent: 100, revealed: true, ...model };
  return {
    percent: round(rawPercent(entries.size, state.target)),
    revealed: false,
    ...model,
  };
}

/** Latches the reveal. Call after anything that changes count or target. */
export async function updateStatus(store: Store) {
  const { state, entries } = store;

  if (!state.revealedAt && entries.size >= state.target) {
    state.revealedAt = Date.now();
    await saveState(store);
  }

  return getStatus(store);
}

export async function setRevealed(store: Store, revealed: boolean) {
  const { state, entries } = store;
  if (revealed) {
    state.revealedAt ??= Date.now();
  } else {
    state.revealedAt = null;
    // Otherwise the very next status check would reveal again.
    state.target = Math.max(state.target, entries.size + 5);
  }
  await saveState(store);
  return getStatus(store);
}

export async function setTarget(store: Store, target: number) {
  store.state.target = Math.max(1, Math.round(target));
  await saveState(store);
  return updateStatus(store);
}
