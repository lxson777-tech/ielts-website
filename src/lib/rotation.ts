/* Rotating random pick, persisted in localStorage: every call returns a
   different item until the whole pool has been served, then the cycle
   restarts (never repeating the immediately previous pick). Used by the
   reading test portal and the writing checker to hand out a fresh test
   on every attempt. */

export function nextInRotation(storageKey: string, ids: string[]): string {
  if (ids.length === 0) throw new Error('nextInRotation: empty pool');

  let used: string[] = [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Drop ids that no longer exist so pool edits can't wedge the cycle.
      if (Array.isArray(parsed)) used = parsed.filter((id) => ids.includes(id));
    }
  } catch {
    used = [];
  }

  let pool = ids.filter((id) => !used.includes(id));
  if (pool.length === 0) {
    const last = used[used.length - 1];
    used = [];
    pool = ids.length > 1 ? ids.filter((id) => id !== last) : ids;
  }

  const pick = pool[Math.floor(Math.random() * pool.length)];
  used.push(pick);
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(used));
  } catch {
    /* storage blocked — rotation just won't persist */
  }
  return pick;
}
