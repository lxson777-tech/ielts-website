import { useState } from 'react';

/** Button + smoothly growing panel — replaces native <details>/<summary> for
    cases that want a real expand/collapse instead of the browser's instant
    snap (mirrors the animation BaseLayout gives .lesson-body details, for
    React-rendered accordions outside that scope).

    The height comes from the grid-template-rows 0fr → 1fr trick shared with
    the rest of the site (.grid-reveal in global.css): the browser animates
    to the content's natural height without anything measuring it, and the
    panel stays in the DOM so its contents are never re-created on open.
    GOTCHA (same as everywhere else this trick is used): the clip wrapper
    must carry min-h-0 and overflow-hidden and must have no padding of its
    own, or the collapsed track never reaches zero. */
export default function Accordion({
  summary,
  children,
  className,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 text-left text-sm font-semibold text-brand"
      >
        <span>{summary}</span>
        <span
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            open ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>
      {/* Collapsed content stays in the DOM for the animation, so it is taken
          out of the tab order and the accessibility tree while it is shut. */}
      <div className={`grid-reveal ${open ? 'is-open' : ''}`}>
        <div className="min-h-0 overflow-hidden">
          <div inert={!open}>{children}</div>
        </div>
      </div>
    </div>
  );
}
