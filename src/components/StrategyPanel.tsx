import type { QuestionType, TestSkill } from '../lib/tests/schema';
import { READING_STRATEGIES, QUESTION_TYPE_STRATEGY } from '../data/reading-strategies';
import { LISTENING_STRATEGIES, LISTENING_QUESTION_TYPE_STRATEGY } from '../data/listening-strategies';
import Accordion from './Accordion';

/** Live "how to approach it" panel shown during trainer drills, for either
    skill. Reading covers every QuestionType; listening only covers the types
    that occur in the listening data (see listening-strategies.ts), so a
    lookup miss there renders nothing rather than guessing at content. */
export default function StrategyPanel({ skill, type }: { skill: TestSkill; type: QuestionType }) {
  const strategy =
    skill === 'listening'
      ? (() => {
          const key = LISTENING_QUESTION_TYPE_STRATEGY[type];
          return key ? LISTENING_STRATEGIES[key] : undefined;
        })()
      : READING_STRATEGIES[QUESTION_TYPE_STRATEGY[type]];

  if (!strategy) return null;

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
