import type { QuestionType } from '../lib/tests/schema';
import { READING_STRATEGIES, QUESTION_TYPE_STRATEGY } from '../data/reading-strategies';
import Accordion from './Accordion';

export default function ReadingStrategyPanel({ type }: { type: QuestionType }) {
  const strategy = READING_STRATEGIES[QUESTION_TYPE_STRATEGY[type]];

  return (
    <Accordion
      className="mb-4 rounded-card border border-border bg-surface-alt p-4"
      summary={`How to approach ${strategy.label}`}
    >
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
        {strategy.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      {strategy.traps.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {strategy.traps.map((trap, i) => (
            <span key={i} className="rounded-full bg-error-tint px-2.5 py-0.5 text-xs font-semibold text-error">
              ⚠ {trap}
            </span>
          ))}
        </div>
      )}
    </Accordion>
  );
}
