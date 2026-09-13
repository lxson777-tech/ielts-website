import type { QuestionType } from '../lib/tests/schema';
import StrategyPanel from './StrategyPanel';

/** Back-compat wrapper: TestPlayer now calls the skill-generic StrategyPanel
    directly, this stays only in case something else imports the old name. */
export default function ReadingStrategyPanel({ type }: { type: QuestionType }) {
  return <StrategyPanel skill="reading" type={type} />;
}
