/* Renders a trusted HTML string (prompt bodies, passage paragraphs, question
   stems — all authored in our own data files, never user input).

   Why this exists instead of writing dangerouslySetInnerHTML inline:
   React 19's updateProperties re-applies a prop whenever `nextProp !== lastProp`
   by *reference*. An inline `dangerouslySetInnerHTML={{ __html: s }}` builds a
   brand-new object literal every render, so the reference always differs and
   React re-runs `element.innerHTML = s` on every re-render — even when `s` is
   unchanged. Re-setting innerHTML tears down and reparses the subtree, which
   destroys and re-fetches any <img> inside it (a visible blink) and wipes text
   selection. Any component that re-renders on a timer (WritingTester's writing
   clock, TestPlayer's countdown) triggered this once or twice a second.

   memo() fixes it at the root: with a stable string `html` (plus the stable
   `as`/`className`), the shallow prop compare bails out, this element is never
   reconciled on a parent re-render, and its innerHTML is therefore set exactly
   once — when the content actually changes. */

import { createElement, memo } from 'react';

interface HtmlProps {
  html: string;
  as?: 'div' | 'span' | 'p';
  className?: string;
}

function HtmlImpl({ html, as = 'div', className }: HtmlProps) {
  return createElement(as, { className, dangerouslySetInnerHTML: { __html: html } });
}

export default memo(HtmlImpl);
