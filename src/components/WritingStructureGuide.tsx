import { WRITING_STRUCTURES, PROMPT_VARIANT_STRUCTURE } from '../data/writing-structures';
import Accordion from './Accordion';

export default function WritingStructureGuide({ variant }: { variant: string }) {
  const key = PROMPT_VARIANT_STRUCTURE[variant];
  if (!key) return null;
  const guide = WRITING_STRUCTURES[key];

  return (
    <Accordion
      className="rounded-card border border-border bg-surface-alt p-4"
      summary={`Structure & language cheat-sheet — ${guide.label}`}
    >
      <ol className="mt-3 space-y-2">
        {guide.paragraphs.map((p) => (
          <li key={p.name} className="text-sm">
            <span className="font-bold">{p.name}:</span> <span className="text-ink-muted">{p.description}</span>
          </li>
        ))}
      </ol>

      {guide.notes && guide.notes.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm text-ink-muted">
          {guide.notes.map((n, i) => (
            <li key={i} className="flex gap-2">
              <span aria-hidden="true">·</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-1.5 border-t border-border pt-3">
        {guide.language.map((row) => (
          <p key={row.job} className="text-sm">
            <span className="font-bold">{row.job}:</span> <span className="text-ink-muted">{row.phrases}</span>
          </p>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
        {guide.mistakes.map((m, i) => (
          <span key={i} className="rounded-full bg-error-tint px-2.5 py-0.5 text-xs font-semibold text-error">
            ⚠ {m}
          </span>
        ))}
      </div>
    </Accordion>
  );
}
