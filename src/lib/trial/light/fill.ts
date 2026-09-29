/* How a stand-in takes the real material, for a PAID account only.

   A gated build's browser carries these stand-ins empty. When the signed-in
   student holds running paid access, src/lib/trial/packs.ts fetches the real
   module's data from the content gate (GET /pack/<name>) and hands it to the
   stand-in's fill function, which puts it INTO the objects the stand-in
   already exported. Nothing is re-exported or re-bound: every module that
   imported the stand-in holds the same array or record, so it sees the real
   material from then on, including copies that kept the entries themselves
   (src/data/writing-prompts.ts spreads IMPORTED_WRITING_PROMPTS into its own
   array, and each entry is updated where it stands).

   Nothing here imports a real module (see ./README.md). */

/** Replaces an array's contents where it stands. */
export function replaceArray<T>(target: readonly T[], items: readonly T[]): void {
  (target as T[]).splice(0, target.length, ...items);
}

/** Updates each entry that shares an id with a real one where it stands,
    appends the real ones the stand-in did not list, and drops any stand-in
    entry the real module does not have. Keeps the array's own order where
    the ids agree, which is also the real module's order. */
export function mergeById<T extends { id: string }>(target: readonly T[], items: readonly T[]): void {
  const list = target as T[];
  const byId = new Map(list.map((entry) => [entry.id, entry]));
  const merged: T[] = [];
  for (const real of items) {
    const existing = byId.get(real.id);
    if (existing) {
      for (const key of Object.keys(existing)) {
        if (!(key in (real as object))) delete (existing as Record<string, unknown>)[key];
      }
      Object.assign(existing as object, real);
      merged.push(existing);
    } else {
      merged.push(real);
    }
  }
  list.splice(0, list.length, ...merged);
}

/** Replaces a record's contents where it stands. */
export function replaceRecord<T>(target: Record<string, T>, source: Record<string, T>): void {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, source);
}

/** A plain object from the pack, or a refusal: a pack whose shape is not
    what the stand-in expects is never half-applied. */
export function packObject(data: unknown, keys: readonly string[]): Record<string, unknown> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error('pack: not an object');
  const value = data as Record<string, unknown>;
  for (const key of keys) {
    if (!(key in value)) throw new Error(`pack: missing ${key}`);
  }
  return value;
}

export function packArray<T>(value: unknown, name: string): T[] {
  if (!Array.isArray(value)) throw new Error(`pack: ${name} is not a list`);
  return value as T[];
}

export function packRecord<T>(value: unknown, name: string): Record<string, T> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`pack: ${name} is not a record`);
  return value as Record<string, T>;
}
