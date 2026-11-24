import { describe, expect, it } from 'vitest';
import { editedFields, preserveAccessDrafts, registerAccessDraft } from './accessDrafts';

describe('draft recovery when access changes', () => {
  it('keeps only edited fields, including nested business-record values', () => {
    const original = { title: 'Record', data: { amount: 10, internalReference: 'existing' } };
    expect(editedFields({ ...original, data: { ...original.data, amount: 20 } }, original))
      .toEqual({ data: { amount: 20 } });
  });

  it('only captures currently registered dirty forms', () => {
    const unregister = registerAccessDraft(() => ({ title: 'Settings', input: { legal_name: 'Draft' } }));
    const unregisterUnchanged = registerAccessDraft(() => undefined);
    try {
      expect(preserveAccessDrafts()).toEqual([{ title: 'Settings', input: { legal_name: 'Draft' } }]);
    } finally {
      unregister();
      unregisterUnchanged();
    }
    expect(preserveAccessDrafts()).toEqual([]);
  });
});
