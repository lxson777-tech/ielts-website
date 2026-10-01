/* The "Access" block of one student in /admin (Builder G, free-account
   model, 1 October 2026): what the account can use now, the current grant
   with its kind, end date and allowances used, and Alex's three controls:
   Give free access (30 days), Renew (another 30 days), Stop.

   The database decides and refuses (supabase/migrations/2026-10-01-
   free-account.sql, access_admin_complimentary, guarded by is_admin()): a
   normal student pressing these is refused by the database itself. This
   island only asks, shows the answer, and offers the buttons that make
   sense. Stop asks once more before it acts. English only, like the rest of
   the admin panel. */

import { useCallback, useEffect, useId, useState } from 'react';
import {
  accessRunsUntil,
  allowanceLines,
  availableActions,
  changeComplimentary,
  changeSummary,
  currentGrant,
  dayLabel,
  kindLabel,
  loadAccountAccess,
  periodsQueued,
  refusalText,
  tierSentence,
  type AccountAccess,
  type ComplimentaryAction,
} from './admin-access';
import './student-access.css';

export default function StudentAccess({ userId, onChanged }: { userId: string; onChanged?: () => void }) {
  const [access, setAccess] = useState<AccountAccess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ComplimentaryAction | null>(null);
  const [message, setMessage] = useState<{ tone: 'done' | 'refused'; text: string } | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [note, setNote] = useState('');
  const noteId = useId();

  const load = useCallback(async () => {
    setError(null);
    const result = await loadAccountAccess(userId);
    if (result.ok) setAccess(result.value);
    else setError(result.message);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: ComplimentaryAction) => {
    setBusy(action);
    setMessage(null);
    const result = await changeComplimentary(userId, action, note);
    setBusy(null);
    setConfirmStop(false);
    if (!result.ok) {
      setMessage({ tone: 'refused', text: `Not changed: ${result.message}` });
      return;
    }
    const answer = result.value;
    if (!answer.ok) {
      setMessage({ tone: 'refused', text: refusalText(answer.reason) });
      return;
    }
    setAccess(answer.status);
    setNote('');
    setMessage({ tone: 'done', text: changeSummary(answer) });
    onChanged?.();
  };

  if (error) {
    return (
      <section className="admin-access" aria-label="Access">
        <h3>Access</h3>
        <p className="admin-note is-flush">Couldn’t load this student’s access: {error}</p>
        <button type="button" className="admin-button is-quiet" onClick={() => void load()}>
          Try again
        </button>
      </section>
    );
  }
  if (!access) {
    return (
      <section className="admin-access" aria-label="Access" aria-busy="true">
        <h3>Access</h3>
        <p className="admin-note is-flush">Loading…</p>
      </section>
    );
  }

  const grant = currentGrant(access.grants);
  const actions = availableActions(access);
  const waiting = grant && !grant.running && Date.parse(grant.startsAt) > Date.now();
  const runsUntil = accessRunsUntil(access.grants);
  const queued = periodsQueued(access.grants);

  return (
    <section className="admin-access" aria-label="Access">
      <div className="admin-access-head">
        <h3>Access</h3>
        <span className={`admin-access-tier is-${access.tier}`}>{TIER_NAME[access.tier]}</span>
      </div>
      <p className="admin-access-lede">{tierSentence(access)}</p>

      {grant && (
        <div className="admin-access-grant">
          <dl className="admin-kv">
            <div>
              <dt>{grant.running ? 'Current access' : waiting ? 'Starts next' : 'Last access'}</dt>
              <dd>{kindLabel(grant.kind)}</dd>
            </div>
            <div>
              <dt>{grant.running || waiting ? 'Ends' : 'Ended'}</dt>
              <dd>
                {dayLabel(grant.endsAt)}
                <span className="admin-kv-sub">From {dayLabel(grant.startsAt)}</span>
              </dd>
            </div>
            {runsUntil && runsUntil !== grant.endsAt && (
              <div>
                <dt>Access runs until</dt>
                <dd>
                  {dayLabel(runsUntil)}
                  <span className="admin-kv-sub">
                    {queued === 1 ? '1 more period queued after this one' : `${queued} more periods queued after this one`}
                  </span>
                </dd>
              </div>
            )}
            {grant.kind === 'complimentary' && (
              <div>
                <dt>Given by</dt>
                <dd>
                  {grant.grantedByEmail ?? 'An admin'}
                  {grant.note && <span className="admin-kv-sub">{grant.note}</span>}
                </dd>
              </div>
            )}
            <div>
              <dt>Placement test</dt>
              <dd>{access.placementUsed ? 'Taken (once per account)' : 'Not taken yet'}</dd>
            </div>
          </dl>
          <ul className="admin-access-uses" aria-label="Allowances used in this period">
            {allowanceLines(grant).map((line) => (
              <li key={line.label}>
                <span>{line.label}</span>
                <span className="admin-access-meter" aria-hidden="true">
                  <span style={{ width: `${Math.min(100, (line.used / Math.max(1, line.limit)) * 100)}%` }} />
                </span>
                <b>
                  {line.used} of {line.limit}
                </b>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="admin-access-controls">
        <label className="admin-access-note" htmlFor={noteId}>
          <span>Note (optional, for your records)</span>
          <input id={noteId} type="text" maxLength={200} value={note} placeholder="For example: September group" onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="admin-access-buttons">
          <button type="button" className="admin-button" disabled={!actions.give || busy !== null} onClick={() => void act('give')}>
            {busy === 'give' ? 'Giving…' : 'Give free access (30 days)'}
          </button>
          <button type="button" className="admin-button is-quiet" disabled={!actions.renew || busy !== null} onClick={() => void act('renew')}>
            {busy === 'renew' ? 'Renewing…' : 'Renew (another 30 days)'}
          </button>
          {!confirmStop ? (
            <button type="button" className="admin-button is-quiet is-danger" disabled={!actions.stop || busy !== null} onClick={() => setConfirmStop(true)}>
              Stop free access
            </button>
          ) : (
            <span className="admin-access-confirm" role="group" aria-label="Confirm stopping free access">
              <span>Stop now? The student goes back to lessons only.</span>
              <button type="button" className="admin-button is-danger-solid" disabled={busy !== null} onClick={() => void act('stop')}>
                {busy === 'stop' ? 'Stopping…' : 'Yes, stop'}
              </button>
              <button type="button" className="admin-button is-quiet" disabled={busy !== null} onClick={() => setConfirmStop(false)}>
                Keep it
              </button>
            </span>
          )}
        </div>
        <p className="admin-note">
          Free access gives exactly what a paid student has: 12 essay checks, 6 recorded Speaking checks, 2 live interviews and 2 mock exams per 30 days, and the
          placement test once per account. Only your account can change it.
        </p>
        <p className={`admin-access-message${message ? ` is-${message.tone}` : ''}`} role="status" aria-live="polite">
          {message?.text ?? ''}
        </p>
      </div>
    </section>
  );
}

const TIER_NAME: Record<AccountAccess['tier'], string> = {
  free: 'Free account',
  paid: 'Paid',
  complimentary: 'Free access',
  'paid-ended': 'Ended',
};
