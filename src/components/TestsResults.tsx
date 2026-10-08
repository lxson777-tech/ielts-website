/* "Your results" on the Tests page (8 October 2026): the score history and
 * the weak spots, which used to be two sections of two empty boxes each,
 * merged into one section with a Reading / Listening switch.
 *
 * A student with no attempts at all sees one friendly line and nothing
 * else. With attempts, each tab shows the same ScoreHistory (table, band
 * chart, reset) and TypeAnalytics (accuracy by question type) the page has
 * always shown, reading the same progress store, so nothing about how a
 * result is counted changes here. A tab whose skill has nothing yet gets a
 * single line instead of the two empty boxes. */

import { useEffect, useState } from 'react';
import Tabs from './Tabs';
import ScoreHistory from './ScoreHistory';
import TypeAnalytics from './TypeAnalytics';
import { getAttempts, getTypeStats, onProgressChange } from '../lib/progress';
import { resultsState, type HubSkill, type ResultsState } from './tests-hub';
import { useT } from '../lib/i18n/react';

const PAPER: Record<HubSkill, string> = { reading: 'Reading', listening: 'Listening' };

function readState(): ResultsState {
  return resultsState(getAttempts(), { reading: getTypeStats('reading'), listening: getTypeStats('listening') });
}

export default function TestsResults({ subtitle }: { subtitle: string }) {
  const { t } = useT();
  const [state, setState] = useState<ResultsState | null>(null);
  const [active, setActive] = useState<HubSkill | null>(null);

  useEffect(() => {
    const load = () => {
      try {
        setState(readState());
      } catch {
        setState(null);
      }
    };
    load();
    return onProgressChange(load);
  }, []);

  if (state === null) return null; // pre-hydration, or storage blocked

  if (!state.hasAny) {
    return <p className="tests-results-empty">{t('Your scores and weak spots appear here after your first test.')}</p>;
  }

  const skill = active ?? state.initial;
  const counts = state.skills[skill];

  return (
    <div className="tests-results">
      <p className="tests-results-note">{t(subtitle)}</p>
      <Tabs
        tabs={[
          { id: 'results-reading', label: PAPER.reading, color: 'var(--color-ink)' },
          { id: 'results-listening', label: PAPER.listening, color: 'var(--color-ink)' },
        ]}
        active={`results-${skill}`}
        onChange={(id) => setActive(id === 'results-listening' ? 'listening' : 'reading')}
        className="tests-tabs"
        translate={false}
      />
      <div
        role="tabpanel"
        id={`tabpanel-results-${skill}`}
        aria-labelledby={`tab-results-${skill}`}
        tabIndex={0}
        className={`tests-results-panel skill-${skill}`}
      >
        {counts.history === 0 && counts.types === 0 ? (
          <p className="tests-results-empty">
            {t('Finish a {skill} test and your scores will appear here.', { skill: PAPER[skill] })}
          </p>
        ) : (
          <>
            {counts.history > 0 && (
              <section className="tests-results-block">
                <h3>{t('Score history')}</h3>
                <ScoreHistory key={`history-${skill}`} skill={skill} />
              </section>
            )}
            {counts.types > 0 && (
              <section className="tests-results-block">
                <h3>{t('Weak spots')}</h3>
                <TypeAnalytics key={`types-${skill}`} skill={skill} />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
