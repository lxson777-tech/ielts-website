/* The few small icons the coach panels draw: one 1.75px stroke, round caps,
   sized by the surrounding font. Decorative, so always aria-hidden; the
   control or text beside each icon carries the meaning. */

const base = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function CopyIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="2" />
      <path d="M10.5 3.2A1.8 1.8 0 0 0 9 2.5H4.3a1.8 1.8 0 0 0-1.8 1.8V9a1.8 1.8 0 0 0 .7 1.5" />
    </svg>
  );
}

export function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3.5l4.5 4.5L6 12.5" />
    </svg>
  );
}

/** A small crossed circle for "avoid this". */
export function AvoidIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <circle cx="8" cy="8" r="6" />
      <path d="M6 6l4 4M10 6l-4 4" />
    </svg>
  );
}
