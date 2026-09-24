/* The owner's admin panel: every account on the platform and what each
   student has done. The first (and for now only) section is Students; later
   admin tools are meant to sit beside it on the same page.

   Access is decided by the database, not here (see src/lib/admin.ts). This
   island only asks, and shows nothing about the admin area to anyone the
   database does not confirm. English only on purpose: it is one person's
   tool, so none of it goes through the translation dictionary. */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAccountChange } from '../../lib/auth/lifecycle';
import { withBase } from '../../lib/url';
import {
  checkIsAdmin,
  lastSeen,
  listAllUsers,
  testLabel,
  type AdminRecentItem,
  type AdminUserRow,
} from '../../lib/admin';

type Gate = 'checking' | 'signed-out' | 'denied' | 'allowed';
type Sort = 'newest' | 'active' | 'practice';

const DAY = 24 * 60 * 60 * 1000;

function ago(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return 'Unknown';
  if (diff < 60 * 1000) return 'Just now';
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(-days, 'day');
  const months = Math.round(days / 30);
  if (months < 12) return rtf.format(-months, 'month');
  return rtf.format(-Math.round(months / 12), 'year');
}

function shortDate(iso: string | null): string {
  if (!iso) return 'Not set';
  // A bare yyyy-mm-dd is a calendar day: read it at noon so no timezone moves it.
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

function band(value: number | null): string {
  return value === null || value === undefined ? 'None' : Number(value).toFixed(1);
}

function hours(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return `${h < 10 ? h.toFixed(1).replace(/\.0$/, '') : Math.round(h)} h`;
}

function initials(email: string | null): string {
  const local = (email ?? '?').split('@')[0] ?? '?';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

function practiceCount(u: AdminUserRow): number {
  return u.lessons_done + u.tests_taken + u.writing_count + u.speaking_count;
}

function recentTitle(r: AdminRecentItem): string {
  if (r.kind === 'test') return testLabel(r.item);
  return r.item || (r.kind === 'writing' ? 'Essay' : 'Speaking');
}

function recentKind(r: AdminRecentItem): string {
  if (r.kind === 'test') return r.item.startsWith('listening') ? 'Listening' : 'Reading';
  if (r.kind === 'writing') return r.detail === 'task1' ? 'Writing Task 1' : r.detail === 'task2' ? 'Writing Task 2' : 'Writing';
  const part = /^part(\d)$/.exec(r.detail);
  return part ? `Speaking Part ${part[1]}` : 'Speaking';
}

export default function AdminPanel() {
  const [gate, setGate] = useState<Gate>('checking');
  const [userId, setUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [openId, setOpenId] = useState<string | null>(null);

  // Follow the account: a sign-out while the page is open locks it again.
  // Nothing is decided until the lifecycle knows who is signed in, so a
  // signed-in owner never sees the signed-out screen flash first.
  const [known, setKnown] = useState(false);
  useEffect(
    () =>
      onAccountChange((account) => {
        if (!account.known) return;
        setKnown(true);
        setUserId(account.user?.id ?? null);
      }),
    [],
  );

  useEffect(() => {
    if (!known) return;
    setUsers(null);
    setOpenId(null);
    if (!userId) {
      setGate('signed-out');
      return;
    }
    let cancelled = false;
    setGate('checking');
    void checkIsAdmin().then((ok) => {
      if (!cancelled) setGate(ok ? 'allowed' : 'denied');
    });
    return () => {
      cancelled = true;
    };
  }, [known, userId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listAllUsers();
    setLoading(false);
    if (result.ok) {
      setUsers(result.users);
      setLoadedAt(Date.now());
    } else {
      setError(result.message);
    }
  }, []);

  useEffect(() => {
    if (gate === 'allowed') void load();
  }, [gate, load]);

  const stats = useMemo(() => {
    if (!users) return null;
    const weekAgo = Date.now() - 7 * DAY;
    const seen = (u: AdminUserRow) => {
      const s = lastSeen(u);
      return s ? new Date(s).getTime() : 0;
    };
    return {
      total: users.length,
      activeWeek: users.filter((u) => seen(u) >= weekAgo).length,
      newWeek: users.filter((u) => new Date(u.joined_at).getTime() >= weekAgo).length,
      minutes: users.reduce((sum, u) => sum + (u.minutes_studied ?? 0), 0),
    };
  }, [users]);

  const shown = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    const list = q ? users.filter((u) => (u.email ?? '').toLowerCase().includes(q)) : [...users];
    const time = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);
    if (sort === 'newest') list.sort((a, b) => time(b.joined_at) - time(a.joined_at));
    if (sort === 'active') list.sort((a, b) => time(lastSeen(b)) - time(lastSeen(a)));
    if (sort === 'practice') list.sort((a, b) => practiceCount(b) - practiceCount(a) || b.minutes_studied - a.minutes_studied);
    return list;
  }, [users, query, sort]);

  if (gate === 'checking') {
    return (
      <div className="admin-gate" aria-busy="true">
        <span className="admin-spinner" aria-hidden="true" />
        <p>Checking your account…</p>
      </div>
    );
  }

  if (gate === 'signed-out') {
    return (
      <div className="admin-gate">
        <h1>Sign in to continue</h1>
        <p>This page is only for the site owner. Sign in from the menu at the top right.</p>
      </div>
    );
  }

  if (gate === 'denied') {
    return (
      <div className="admin-gate">
        <h1>This page isn’t available</h1>
        <p>Your account doesn’t have access to it.</p>
        <a className="admin-button" href={withBase('/dashboard')}>
          Back to Today
        </a>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <header className="admin-head">
        <div>
          <p className="admin-eyebrow">Admin</p>
          <h1>Students</h1>
          <p className="admin-lede">Everyone with an account on the platform. Only your account can open this page.</p>
        </div>
        <div className="admin-head-side">
          <button type="button" className="admin-button is-quiet" onClick={() => void load()} disabled={loading}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" className={loading ? 'is-spinning' : ''}>
              <path d="M16.5 10a6.5 6.5 0 1 1-1.9-4.6M16.5 3.5v3.2h-3.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {loading ? 'Refreshing' : 'Refresh'}
          </button>
          {loadedAt && <span className="admin-updated">Updated {ago(new Date(loadedAt).toISOString()).toLowerCase()}</span>}
        </div>
      </header>

      {error && (
        <div className="admin-error" role="alert">
          <p>Couldn’t load the students: {error}</p>
          <button type="button" className="admin-button" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {stats && (
        <dl className="admin-stats">
          <div>
            <dt>Accounts</dt>
            <dd>{stats.total}</dd>
          </div>
          <div>
            <dt>Active this week</dt>
            <dd>{stats.activeWeek}</dd>
          </div>
          <div>
            <dt>Joined this week</dt>
            <dd>{stats.newWeek}</dd>
          </div>
          <div>
            <dt>Time studied</dt>
            <dd>{hours(stats.minutes)}</dd>
          </div>
        </dl>
      )}

      {users && (
        <section className="admin-section" aria-labelledby="admin-students-title">
          <div className="admin-controls">
            <h2 id="admin-students-title" className="sr-only">
              All students
            </h2>
            <label className="admin-search">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="9" cy="9" r="5.5" />
                <path d="m13.2 13.2 3.3 3.3" strokeLinecap="round" />
              </svg>
              <span className="sr-only">Search by email</span>
              <input type="search" placeholder="Search by email" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="admin-sort" role="group" aria-label="Sort students">
              {(
                [
                  ['newest', 'Newest'],
                  ['active', 'Recently active'],
                  ['practice', 'Most practice'],
                ] as const
              ).map(([key, label]) => (
                <button key={key} type="button" aria-pressed={sort === key} onClick={() => setSort(key)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-list-head" aria-hidden="true">
            <span>Student</span>
            <span>Last seen</span>
            <span>Lessons</span>
            <span>Tests</span>
            <span>Writing</span>
            <span>Speaking</span>
            <span>Target</span>
            <span />
          </div>

          {shown.length === 0 ? (
            <p className="admin-empty">{query ? 'No student matches that email.' : 'No accounts yet.'}</p>
          ) : (
            <ul className="admin-list">
              {shown.map((u) => (
                <StudentRow
                  key={u.user_id}
                  user={u}
                  isYou={u.user_id === userId}
                  open={openId === u.user_id}
                  onToggle={() => setOpenId((id) => (id === u.user_id ? null : u.user_id))}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function StudentRow({ user: u, isYou, open, onToggle }: { user: AdminUserRow; isYou: boolean; open: boolean; onToggle: () => void }) {
  const seen = lastSeen(u);
  const panelId = `admin-student-${u.user_id}`;
  // The same numbers as the columns, as one line, for narrow screens where
  // the columns are hidden (admin.css reads it with attr()).
  const summary = [
    `Seen ${ago(seen).toLowerCase()}`,
    count(u.lessons_done, 'lesson'),
    count(u.tests_taken, 'test'),
    count(u.writing_count, 'essay'),
    `${u.speaking_count} speaking`,
    u.target_band ? `target ${u.target_band}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className={`admin-row${open ? ' is-open' : ''}`}>
      <button type="button" className="admin-row-main" data-summary={summary} aria-expanded={open} aria-controls={panelId} onClick={onToggle}>
        <span className="admin-who">
          <span className="admin-avatar" aria-hidden="true">
            {initials(u.email)}
          </span>
          <span className="admin-who-text">
            <span className="admin-email">
              {u.email ?? 'No email'}
              {isYou && <span className="admin-tag">You</span>}
              {!isYou && u.is_admin && <span className="admin-tag">Admin</span>}
            </span>
            <span className="admin-sub">
              Joined {shortDate(u.joined_at)} · {u.provider === 'google' ? 'Google' : 'Email'}
            </span>
          </span>
        </span>
        <span className="admin-cell" data-label="Last seen">
          {ago(seen)}
        </span>
        <span className="admin-cell is-num" data-label="Lessons">
          {u.lessons_done}
        </span>
        <span className="admin-cell is-num" data-label="Tests">
          {u.tests_taken}
        </span>
        <span className="admin-cell is-num" data-label="Writing">
          {u.writing_count}
        </span>
        <span className="admin-cell is-num" data-label="Speaking">
          {u.speaking_count}
        </span>
        <span className="admin-cell is-num" data-label="Target">
          {u.target_band ?? <span className="admin-muted">None</span>}
        </span>
        <svg className="admin-chevron" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="m6 8 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="admin-detail" id={panelId} hidden={!open}>
        {open && <StudentDetail user={u} />}
      </div>
    </li>
  );
}

function StudentDetail({ user: u }: { user: AdminUserRow }) {
  return (
    <div className="admin-detail-inner">
      <div className="admin-detail-grid">
        <section>
          <h3>Study plan</h3>
          <dl className="admin-facts">
            <div>
              <dt>Target band</dt>
              <dd>{u.target_band ?? 'Not set'}</dd>
            </div>
            <div>
              <dt>Exam date</dt>
              <dd>{shortDate(u.test_date)}</dd>
            </div>
            <div>
              <dt>Daily goal</dt>
              <dd>{u.daily_minutes ? `${u.daily_minutes} min` : 'Not set'}</dd>
            </div>
            <div>
              <dt>Plan</dt>
              <dd>{u.plan_chosen ? 'Set by the student' : 'Default, not chosen yet'}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h3>Best bands</h3>
          <dl className="admin-bands">
            <div style={{ '--skill': 'var(--color-reading)' } as React.CSSProperties}>
              <dt>Reading</dt>
              <dd>{band(u.best_reading)}</dd>
            </div>
            <div style={{ '--skill': 'var(--color-listening)' } as React.CSSProperties}>
              <dt>Listening</dt>
              <dd>{band(u.best_listening)}</dd>
            </div>
            <div style={{ '--skill': 'var(--color-writing)' } as React.CSSProperties}>
              <dt>Writing</dt>
              <dd>{band(u.best_writing)}</dd>
            </div>
            <div style={{ '--skill': 'var(--color-speaking)' } as React.CSSProperties}>
              <dt>Speaking</dt>
              <dd>{band(u.best_speaking)}</dd>
            </div>
          </dl>
          <p className="admin-note">Reading and Listening count full tests only, like the student’s own account page.</p>
        </section>

        <section>
          <h3>Activity</h3>
          <dl className="admin-facts">
            <div>
              <dt>Days studied</dt>
              <dd>{u.active_days}</dd>
            </div>
            <div>
              <dt>Time studied</dt>
              <dd>{hours(u.minutes_studied)}</dd>
            </div>
            <div>
              <dt>Last study day</dt>
              <dd>{shortDate(u.last_active_day)}</dd>
            </div>
            <div>
              <dt>Last sign-in</dt>
              <dd>{ago(u.last_sign_in_at)}</dd>
            </div>
            <div>
              <dt>Mr EZ messages</dt>
              <dd>{u.tutor_messages}</dd>
            </div>
            <div>
              <dt>Live examiner</dt>
              <dd>{u.examiner_sessions === 1 ? '1 session' : `${u.examiner_sessions} sessions`}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="admin-recent">
        <h3>Recent work</h3>
        {u.recent.length === 0 ? (
          <p className="admin-note">Nothing scored yet.</p>
        ) : (
          <ol>
            {u.recent.map((r, i) => (
              <li key={`${r.at}-${i}`}>
                <span className="admin-recent-date">{shortDate(r.at)}</span>
                <span className="admin-recent-what">
                  <span className="admin-recent-kind">{recentKind(r)}</span>
                  <span className="admin-recent-title">{recentTitle(r)}</span>
                </span>
                <span className="admin-recent-band">Band {band(r.band)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
