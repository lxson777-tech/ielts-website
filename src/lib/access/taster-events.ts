/* Opening Mr EZ's panel from somewhere else on the page (a lesson's last
   card, Today, a wrong answer in a lesson quiz). BROWSER ONLY.

   The panel (src/components/tutor/MrEzPanel.tsx) is mounted once by
   BaseLayout and listens for this event. The event carries no authority: a
   free account can only ask a question while the server still has a free try
   for it, and the Worker refuses for itself. `prompt` only pre-fills the
   message box; nothing is sent until the student presses send, so a free
   question is never spent on their behalf. */

export const MREZ_OPEN_EVENT = 'ielts:open-mrez';

export interface OpenMrEzRequest {
  /** Text to put in the message box (not sent). */
  prompt?: string;
}

export function openMrEz(request: OpenMrEzRequest = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<OpenMrEzRequest>(MREZ_OPEN_EVENT, { detail: request }));
}

export function onOpenMrEz(listener: (request: OpenMrEzRequest) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (event: Event) => listener((event as CustomEvent<OpenMrEzRequest>).detail ?? {});
  window.addEventListener(MREZ_OPEN_EVENT, handler);
  return () => window.removeEventListener(MREZ_OPEN_EVENT, handler);
}
