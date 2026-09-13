/* The Speaking Trainer's part picker: three descriptive cards (what happens
   in the part, how long it runs, which answer method the coach teaches)
   instead of three bare buttons. Shared by the live-examiner drills menu and
   the recorded-checker fallback so the two start screens can't drift. */

export type SpeakingPart = 'part1' | 'part2' | 'part3';

const PART_CARDS: {
  mode: SpeakingPart;
  title: string;
  kind: string;
  description: string;
  method: string;
  chips: string[];
}[] = [
  {
    mode: 'part1',
    title: 'Part 1',
    kind: 'The Interview',
    description: 'Short questions about your everyday life: home, work, music, food. Answer in 2 to 4 sentences each.',
    method: 'A.R.E. method',
    chips: ['4-5 questions', '~4 min'],
  },
  {
    mode: 'part2',
    title: 'Part 2',
    kind: 'The Long Turn',
    description: 'One cue card, one minute to prepare with notes, then speak on your own for up to two minutes.',
    method: 'PEEL method',
    chips: ['1 cue card', '~4 min'],
  },
  {
    mode: 'part3',
    title: 'Part 3',
    kind: 'The Discussion',
    description: 'Deeper follow-up questions on the cue-card theme. Give opinions about people and society, not just yourself.',
    method: 'OREO formula',
    chips: ['discussion', '~5 min'],
  },
];

export default function SpeakingPartCards({
  onStart,
  disabled,
}: {
  onStart: (mode: SpeakingPart) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mx-auto mt-7 grid max-w-3xl gap-4 sm:grid-cols-3">
      {PART_CARDS.map((p) => (
        <button
          key={p.mode}
          type="button"
          onClick={() => onStart(p.mode)}
          disabled={disabled}
          className="group flex flex-col rounded-card border border-border bg-surface-alt/60 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--skill,#0E9F6E)]/60 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-border disabled:hover:shadow-none"
        >
          <span className="font-display text-lg font-extrabold">
            {p.title} <span className="font-bold text-ink-muted">· {p.kind}</span>
          </span>
          <p className="mt-1.5 flex-1 text-sm text-ink-muted">{p.description}</p>
          <span className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center rounded-full border border-[var(--skill,#0E9F6E)]/40 bg-surface px-2.5 py-1 text-xs font-semibold text-[var(--skill,#0E9F6E)]">
              {p.method}
            </span>
            {p.chips.map((chip) => (
              <span key={chip} className="inline-flex items-center rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink-muted">
                {chip}
              </span>
            ))}
          </span>
          <span className="mt-4 inline-flex w-full items-center justify-center rounded-button bg-[var(--skill,#0E9F6E)] px-4 py-2.5 font-display text-sm font-bold text-white transition-opacity group-hover:opacity-90">
            Start {p.title}
          </span>
        </button>
      ))}
    </div>
  );
}
