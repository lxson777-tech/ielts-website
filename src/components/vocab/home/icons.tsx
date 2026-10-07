/* The Vocabulary home's few icons, drawn in one stroke weight (1.7, round
   caps) to match the dashboard's streak flame. Decorative: every one sits
   beside text that already says what it means. */

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
};

export function FlameIcon() {
  return (
    <svg {...base}>
      <path d="M13 3c1 5-5 6-3 10 1-1 2-2 2-4 4 3 6 5 6 8a6 6 0 0 1-12 0c0-4 2-7 7-14Z" />
    </svg>
  );
}

export function StackIcon() {
  return (
    <svg {...base}>
      <rect x="4" y="7" width="13" height="13" rx="2.5" />
      <path d="M8 4h9.5A2.5 2.5 0 0 1 20 6.5V16" />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg {...base} width={18} height={18}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg {...base} width={16} height={16}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg {...base} width={14} height={14} strokeWidth={2.2}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Match pairs: two cards joined. */
export function MatchIcon() {
  return (
    <svg {...base} width={24} height={24}>
      <rect x="3" y="5" width="7" height="14" rx="2" />
      <rect x="14" y="5" width="7" height="14" rx="2" />
      <path d="M10 12h4" />
    </svg>
  );
}

/** 60-second sprint: a stopwatch. */
export function SprintIcon() {
  return (
    <svg {...base} width={24} height={24}>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4l2.5 2M10 2.5h4M12 2.5V6" />
    </svg>
  );
}

/** Spell it: a pen writing a line. */
export function SpellIcon() {
  return (
    <svg {...base} width={24} height={24}>
      <path d="M4 20h16" />
      <path d="M14.5 4.5 18 8l-8.5 8.5H6V13l8.5-8.5Z" />
    </svg>
  );
}

export function ListIcon() {
  return (
    <svg {...base} width={16} height={16}>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

export function CardsIcon() {
  return (
    <svg {...base} width={16} height={16}>
      <rect x="3" y="4" width="8" height="7" rx="1.5" />
      <rect x="13" y="4" width="8" height="7" rx="1.5" />
      <rect x="3" y="13" width="8" height="7" rx="1.5" />
      <rect x="13" y="13" width="8" height="7" rx="1.5" />
    </svg>
  );
}

/** Turn the card over: a curved arrow. */
export function TurnIcon() {
  return (
    <svg {...base} width={15} height={15} strokeWidth={1.9}>
      <path d="M4 12a8 8 0 0 1 14-5.3L20 9" />
      <path d="M20 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-14 5.3L4 15" />
    </svg>
  );
}
