/* Support requests, in the owner's /admin panel (Builder E, 29 September
   2026). Every "Ask a person" message, newest first, with who sent it,
   where from, and a way to mark it answered.

   The database decides who may see these (support_admin_list and
   support_admin_mark refuse anyone not in public.admins); this section only
   asks. English only, like the rest of the admin panel: one person's tool.

   Answering happens in Alex's own email: "Reply by email" opens a message
   to the address on the request. Nothing is sent from here. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  listSupportRequests,
  markSupportRequest,
  replyAddress,
  type SupportRequestRow,
} from '../../lib/support';
import './support-requests.css';

const TOPIC: Record<string, string> = {
  problem: 'Something is not working',
  question: 'A question about studying',
  account: 'Account, trial or access',
  other: 'Something else',
};

const CONTEXT: Record<string, string> = {
  'mr-ez': 'Mr EZ could not answer',
  grader: 'Grading failed',
  'trial-ended': 'Trial ended screen',
  locked: 'Locked page',
  plans: 'Plans page',
  help: 'Help page',
  footer: 'Footer link',
  terms: 'Terms page',
  privacy: 'Privacy page',
};

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function SupportRequests() {
  const [rows, setRows] = useState<SupportRequestRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listSupportRequests();
    setLoading(false);
    if (result.ok) setRows(result.requests);
    else setError(result.message);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const open = useMemo(() => (rows ?? []).filter((r) => !r.answered_at).length, [rows]);
  const shown = useMemo(() => (rows ?? []).filter((r) => !openOnly || !r.answered_at), [rows, openOnly]);

  async function mark(row: SupportRequestRow, answered: boolean) {
    setBusyId(row.id);
    const result = await markSupportRequest(row.id, answered);
    setBusyId(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRows((list) => (list ?? []).map((r) => (r.id === row.id ? { ...r, answered_at: result.answeredAt } : r)));
  }

  return (
    <section className="admin-section admin-support" aria-labelledby="admin-support-title">
      <div className="admin-support-head">
        <div>
          <h2 id="admin-support-title">
            Support requests
            {rows && <span className={`admin-support-count${open ? ' is-open' : ''}`}>{open ? `${open} waiting` : 'All answered'}</span>}
          </h2>
          <p className="admin-lede">
            Messages from “Ask a person”. Students can send them but never read them; only your account can. Reply from your own email, then mark it answered.
          </p>
        </div>
        <div className="admin-support-actions">
          {rows && rows.length > 0 && (
            <button type="button" className="admin-toggle" aria-pressed={openOnly} onClick={() => setOpenOnly((v) => !v)}>
              Only waiting
            </button>
          )}
          <button type="button" className="admin-button is-quiet" onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-error" role="alert">
          <p>Couldn’t load the support requests: {error}</p>
          <button type="button" className="admin-button" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {rows && shown.length === 0 && (
        <p className="admin-empty">{rows.length === 0 ? 'No support requests yet.' : 'Nothing waiting. Every request is answered.'}</p>
      )}

      {shown.length > 0 && (
        <ol className="admin-support-list">
          {shown.map((r) => {
            const reply = replyAddress(r);
            const subject = encodeURIComponent('Re: your message to IELTS is EZ');
            return (
              <li key={r.id} className={`admin-support-item${r.answered_at ? ' is-answered' : ''}`} data-testid="support-request">
                <div className="admin-support-meta">
                  <span className="admin-tag is-quiet">{TOPIC[r.topic] ?? r.topic}</span>
                  <span>{when(r.created_at)}</span>
                  <span>{r.user_id ? r.account_email ?? 'Account' : `${r.contact_email} (not signed in)`}</span>
                  {r.context && <span>{CONTEXT[r.context] ?? r.context}</span>}
                  {r.page && <code>{r.page}</code>}
                  {r.locale === 'ru' && <span>Russian</span>}
                </div>
                <p className="admin-support-message">{r.message}</p>
                <div className="admin-support-row">
                  {reply && (
                    <a className="admin-button is-quiet" href={`mailto:${reply}?subject=${subject}`}>
                      Reply by email
                    </a>
                  )}
                  {r.answered_at ? (
                    <>
                      <span className="admin-support-done">Answered {when(r.answered_at)}</span>
                      <button type="button" className="admin-support-undo" disabled={busyId === r.id} onClick={() => void mark(r, false)}>
                        Undo
                      </button>
                    </>
                  ) : (
                    <button type="button" className="admin-button" disabled={busyId === r.id} onClick={() => void mark(r, true)}>
                      Mark as answered
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
