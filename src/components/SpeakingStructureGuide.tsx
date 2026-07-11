import type { StructureMethod } from '../data/speaking-structure-guides';
import { SPEAKING_STRUCTURE_GUIDES } from '../data/speaking-structure-guides';
import Accordion from './Accordion';

export default function SpeakingStructureGuide({ method }: { method: StructureMethod }) {
  const guide = SPEAKING_STRUCTURE_GUIDES[method];

  return (
    <Accordion
      className="rounded-card border border-border bg-surface-alt p-4"
      summary={`Structure cheat-sheet — ${guide.title}`}
    >
      <div className="mt-3 space-y-3">
        {guide.stages.map((stage) => (
          <div key={stage.name}>
            <p className="text-sm font-bold">
              {stage.name}
              {stage.timing && <span className="ml-1.5 font-normal text-ink-muted">({stage.timing})</span>}
            </p>
            <p className="mt-0.5 text-sm text-ink-muted">{stage.description}</p>
            {stage.phrases.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {stage.phrases.map((phrase) => (
                  <span key={phrase} className="rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-semibold text-brand">
                    {phrase}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Accordion>
  );
}
