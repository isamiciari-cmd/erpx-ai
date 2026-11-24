import { useCallback, useEffect, useRef } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import { editedFields, registerAccessDraft } from '../lib/accessDrafts';

type DraftInput = { title: string; values: object | null; baseline: object | string };

export function useRecoverableInputs(dirty: boolean, draft?: DraftInput) {
  const current = useRef({ dirty, draft });
  current.current = { dirty, draft };
  const preserved = useRef<object | null>(null);
  useEffect(() => registerAccessDraft(() => {
    const { dirty, draft } = current.current;
    if (!dirty || !draft?.values || draft.values === preserved.current) return;
    const baseline = typeof draft.baseline === 'string' ? JSON.parse(draft.baseline || '{}') : draft.baseline;
    const input = editedFields(draft.values, baseline ?? {});
    if (Object.keys(input).length === 0) return;
    preserved.current = draft.values;
    return { title: draft.title, input };
  }), []);
  return preserved;
}

/** Blocks links, programmatic navigation and browser history without losing a draft. */
export function useUnsavedChanges(dirty: boolean, message: string, draft?: DraftInput) {
  const handled = useRef<string | undefined>(undefined);
  const preserved = useRecoverableInputs(dirty, draft);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && (!preserved.current || preserved.current !== draft?.values) &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (!dirty) return;
        event.preventDefault();
        event.returnValue = '';
      },
      [dirty],
    ),
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') {
      handled.current = undefined;
      return;
    }
    if (handled.current === blocker.location.key) return;
    handled.current = blocker.location.key;
    if (window.confirm(message)) blocker.proceed();
    else blocker.reset();
  }, [blocker, message]);
}
