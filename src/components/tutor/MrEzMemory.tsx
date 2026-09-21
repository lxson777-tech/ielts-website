/* What Mr EZ remembers, and how to make him forget it.

   The panel states the split in plain words before offering the button,
   because the two kinds of memory have genuinely different lifetimes and a
   student who clears a chat and loses their score history would never trust
   the control again:

   - CONVERSATION memory: what was said, plus the rolling summary he keeps of
     older turns, plus the saved dashboard welcome (his words about them).
     This is what clearing removes, everywhere, including the copy in the
     cloud.
   - RESULTS: bands, marked essays, speaking attempts, test scores, completed
     lessons. A separate record with its own lifetime. Clearing a
     conversation never touches it, and Mr EZ will still read it afterwards,
     because that is the evidence he works from.

   Goals live with the study plan, which already has its own editor, so this
   links there rather than growing a second place to set the same thing. */

import { useEffect, useState } from 'react';
import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import MrEzAvatar from './MrEzAvatar';
import { clearTutorMemory, loadConversation } from '../../lib/tutor/conversation';
import { isTutorConfigured } from '../../lib/tutor/client';
import { localInsights } from '../../lib/tutor/local';
import { onAuthChange } from '../../lib/auth/session';

export default function MrEzMemory() {
  const { t, tn } = useT();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [turns, setTurns] = useState(0);
  const [goals, setGoals] = useState<{ band: string | null; date: string | null; guessed: boolean } | null>(null);

  useEffect(() => {
    setTurns(loadConversation().turns.length);
    const insights = localInsights();
    setGoals({
      band: insights.goals.targetBand,
      date: insights.goals.examDate,
      guessed: insights.goals.guessed,
    });
    return onAuthChange((user) => setSignedIn(Boolean(user)));
  }, []);

  async function clear() {
    setBusy(true);
    const outcome = await clearTutorMemory();
    setResult(outcome.message);
    setTurns(0);
    setConfirming(false);
    setBusy(false);
  }

  const goalLine =
    goals?.band && !goals.guessed
      ? goals.date
        ? t('Band {band}, exam on {date}', { band: goals.band, date: goals.date })
        : t('Band {band}', { band: goals.band })
      : t('Not set yet');

  const conversationLine = signedIn
    ? turns > 0
      ? tn(turns, {
          one: '{n} message in this session, plus anything saved to your account.',
          other: '{n} messages in this session, plus anything saved to your account.',
        })
      : t('Nothing in this session, plus anything saved to your account.')
    : turns > 0
      ? tn(turns, { one: '{n} message in this session.', other: '{n} messages in this session.' })
      : t('Nothing in this session.');

  return (
    <section className="mrez-memory" aria-labelledby="mrez-memory-heading">
      <div className="mrez-memory-head">
        <MrEzAvatar mood="idle" size={40} />
        <div>
          <h2 id="mrez-memory-heading">{t('What Mr EZ remembers')}</h2>
          <p>{t('He only ever reads your own record, and only the part he needs for what you just asked.')}</p>
        </div>
      </div>

      <dl className="mrez-memory-list">
        <div>
          <dt>{t('Your goal')}</dt>
          <dd>
            {goalLine}
            {' · '}
            <a href={withBase('/plan-settings')}>{t('Change it')}</a>
          </dd>
        </div>
        <div>
          <dt>{t('Your results')}</dt>
          <dd>
            {t('Completed lessons, test scores and marked work. He reads these as evidence and never changes them.')}
            {' · '}
            <a href={withBase('/report')}>{t('See them')}</a>
          </dd>
        </div>
        <div>
          <dt>{t('Your conversation')}</dt>
          <dd>{conversationLine}</dd>
        </div>
      </dl>

      {!isTutorConfigured() && (
        <p className="mrez-memory-note">{t('Mr EZ is not switched on for this build, so there is nothing stored in the cloud to clear.')}</p>
      )}

      {result ? (
        <p className="mrez-memory-done" role="status">{result}</p>
      ) : confirming ? (
        <div className="mrez-memory-confirm">
          <p>
            {t('This deletes every message between you and Mr EZ, the summary he keeps of older turns, and his saved dashboard welcome.')}{' '}
            <strong>{t('Your lessons, test scores and marked essays are not affected.')}</strong>{' '}
            {t('He will still read them afterwards. It cannot be undone.')}
          </p>
          <div className="mrez-memory-actions">
            <button type="button" className="mrez-danger" onClick={() => void clear()} disabled={busy}>
              {busy ? t('Clearing…') : t('Yes, clear the conversation')}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy}>{t('Cancel')}</button>
          </div>
        </div>
      ) : (
        <button type="button" className="mrez-memory-clear" onClick={() => setConfirming(true)}>
          {t("Clear Mr EZ's conversation history")}
        </button>
      )}
    </section>
  );
}
