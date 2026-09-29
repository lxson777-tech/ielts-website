/* A modal dialog's keyboard contract, in one place.

   Audit 2026-09-29, F07: after a test or drill the score dialog covered the
   page, but Tab walked into the passage and the review controls behind it,
   Escape did nothing and the dialog had no name. This is the behaviour the
   WAI-ARIA dialog pattern asks for, written once so any modal on the site
   can use it:

   - on open, focus moves into the dialog (to the element given as
     `initialFocus`, or the dialog panel itself, which then needs
     tabIndex={-1}), so a screen reader announces the dialog by its name;
   - Tab and Shift+Tab cycle through the dialog's own controls and never
     leave it, even when focus had drifted to the page (a click on the
     backdrop, say);
   - Escape calls `onEscape`;
   - everything outside the dialog is made `inert` while it is open (so a
     screen reader's reading cursor and a pointer cannot reach it either),
     and exactly those attributes are taken off again when it closes.

   Restoring focus on close is the caller's job, because only the caller
   knows which control should receive it (for the score dialog: the Score
   button that reopens it, which only exists once the dialog is closed).

   The index arithmetic is a pure function so it can be tested without a
   browser (tests/result-dialog-a11y.test.ts); the DOM part is proved in the
   browser (Builder D's keyboard run). */

import { useEffect, useRef, type RefObject } from 'react';

/** What a trapped Tab should focus next.
 *  `count` focusable controls inside the dialog, `current` the index of the
 *  focused one, or -1 when focus is on the panel itself or outside it.
 *  Returns the index to focus, or -1 when there is nothing to focus (the
 *  caller then keeps focus on the panel). */
export function nextTrappedIndex(count: number, current: number, backwards: boolean): number {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) return backwards ? count - 1 : 0;
  if (backwards) return current === 0 ? count - 1 : current - 1;
  return current === count - 1 ? 0 : current + 1;
}

/** What a key press inside an open modal means. */
export type DialogKeyAction = 'close' | 'trap-forward' | 'trap-backward' | null;

export function dialogKeyAction(key: string, shiftKey: boolean): DialogKeyAction {
  if (key === 'Escape' || key === 'Esc') return 'close';
  if (key === 'Tab') return shiftKey ? 'trap-backward' : 'trap-forward';
  return null;
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** The dialog's own tabbable controls, in document order, skipping hidden ones. */
export function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.closest('[inert]') && !root.closest('[inert]')) return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return false;
    return el.getClientRects().length > 0;
  });
}

/** Everything outside `dialog` along its ancestor chain, made inert. Returns
 *  the elements this call changed, so they (and only they) are restored. */
function inertOutside(dialog: HTMLElement): HTMLElement[] {
  const changed: HTMLElement[] = [];
  let node: HTMLElement | null = dialog;
  while (node && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement)) continue;
      if (sibling.inert || sibling.tagName === 'SCRIPT' || sibling.tagName === 'STYLE') continue;
      sibling.inert = true;
      changed.push(sibling);
    }
    node = parent;
  }
  return changed;
}

export interface ModalDialogOptions {
  /** Whether the dialog is currently shown. */
  open: boolean;
  /** Called on Escape. */
  onEscape: () => void;
  /** The element that should receive focus on open; defaults to the panel. */
  initialFocus?: RefObject<HTMLElement | null>;
}

/** Wire the keyboard contract onto `panelRef` while `open` is true. */
export function useModalDialog(panelRef: RefObject<HTMLElement | null>, { open, onEscape, initialFocus }: ModalDialogOptions): void {
  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const changed = inertOutside(panel);
    const target = initialFocus?.current ?? panel;
    // After the entrance animation has mounted the panel in place.
    const raf = requestAnimationFrame(() => target.focus({ preventScroll: true }));

    function onKeyDown(event: KeyboardEvent) {
      const action = dialogKeyAction(event.key, event.shiftKey);
      if (!action || !panel) return;
      if (action === 'close') {
        event.preventDefault();
        event.stopPropagation();
        escapeRef.current();
        return;
      }
      const items = focusableWithin(panel);
      const active = document.activeElement as HTMLElement | null;
      const index = active ? items.indexOf(active) : -1;
      event.preventDefault();
      const next = nextTrappedIndex(items.length, index, action === 'trap-backward');
      (next >= 0 ? items[next] : panel).focus();
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown, true);
      for (const el of changed) el.inert = false;
    };
  }, [open, panelRef, initialFocus]);
}
