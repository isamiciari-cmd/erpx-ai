export interface AccessDraft {
  title: string;
  input: Record<string, unknown>;
}
export const mutationDeniedEvent = 'erpx:supabase-mutation-denied';

type Snapshot = () => AccessDraft | undefined;
const drafts = new Set<Snapshot>();

export function registerAccessDraft(snapshot: Snapshot) {
  drafts.add(snapshot);
  return () => { drafts.delete(snapshot); };
}

export function preserveAccessDrafts(): AccessDraft[] {
  return [...drafts].flatMap((snapshot) => snapshot() ?? []);
}

/** Keep edited fields only, without copying unchanged data from a record. */
export function editedFields(values: object, baseline: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).flatMap(([key, value]) => {
    const previous: unknown = Object.hasOwn(baseline, key) ? Reflect.get(baseline, key) : undefined;
    if (JSON.stringify(value) === JSON.stringify(previous)) return [];
    if (value && previous && typeof value === 'object' && typeof previous === 'object' &&
      !Array.isArray(value) && !Array.isArray(previous)) return [[key, editedFields(value, previous)]];
    return [[key, value]];
  }));
}
