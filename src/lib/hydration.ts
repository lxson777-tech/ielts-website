/* The one rule every island's first render has to keep.

   Astro renders each island to HTML at build time: no window, no storage,
   no signed-in student, English, the build machine's clock. In the browser
   React then HYDRATES that HTML, and its first render there must produce
   exactly the same output. If it does not (a saved sitting, a ?task= link,
   a trial answer that happened to arrive before this island woke up), React
   throws the page's HTML for that island away and redraws it: "Hydration
   failed because the server rendered HTML didn't match the client" in the
   console, and a flicker on screen.

   So anything read from the browser is applied AFTER that first render,
   never during it. useHydrated() is the building block:

   false during the hydration render, true on the render React schedules
   straight after it, and true from the start for a component mounted later
   in the browser, so a screen opened by a click never shows a default frame
   first. Until that second render the student simply keeps seeing the HTML
   the page arrived with, which is what they were already looking at.

   It is useSyncExternalStore with a server snapshot, which is exactly what
   React provides for this. A browser-side store does the same with its own
   subscribe and a server snapshot equal to what the build rendered: see
   useLocale (src/lib/i18n/react.ts) and useTrial (src/lib/trial/react.ts). */

import { useSyncExternalStore } from 'react';

const neverChanges = () => () => {};
const inBrowser = () => true;
const onServer = () => false;

/** False while React is hydrating build-time HTML (and on the server), true
    on every render after that. */
export function useHydrated(): boolean {
  return useSyncExternalStore(neverChanges, inBrowser, onServer);
}

