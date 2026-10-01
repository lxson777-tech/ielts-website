/* The styles of the free-account screens (the upgrade pop-up, the locked
   page, the lesson invitation, a free account's Today), put on the page only
   when one of them is shown.

   Why not a plain `import './upgrade.css'`: Astro collects a component's CSS
   into every page that imports it, rendered or not, and BaseLayout imports
   the pop-up on every page. That put these rules into the OPEN build's pages
   too (today's live site, which must stay exactly as it is). `?inline` gives
   the processed CSS as a string instead, and the screens insert it once, in
   the browser, the first time they render (they only ever render in the
   gated build). A client-side navigation may drop it from <head>; the next
   render puts it back. */

import upgradeCss from './upgrade.css?inline';
import freeHomeCss from './free-home.css?inline';

const STYLE_ID = 'access-free-styles';

export function ensureAccessStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `${upgradeCss}\n${freeHomeCss}`;
  document.head.append(style);
}
