/* The rolling schedule on /start ("Your route", rendered inside Course.tsx):
   a seven-day selector and the selected day's agenda (Codex's design,
   platform audit 2026-09-23, replacing the seven truncated columns).

   The rows come from useCourseAgenda (src/lib/learning/agenda.ts): today's
   rows are the live session's steps with their real links and done state,
   the same ones TodaySession shows, so this can never disagree with Today.
   Later days are what the plan currently expects, resolved from the
   catalogue: a plan, not a promise, which is why they are shown but not
   linked as though they were today's task. Selection is presentation state
   held by the hook; the planner still owns dates and activities. */

import { withBase } from '../../lib/url';
import type { AgendaDay } from '../../lib/learning/agenda';
import { useT } from '../../lib/i18n/react';
import { nt } from '../../lib/i18n/translate';
import { useCourseAgenda } from './useCourseAgenda';
import '../../styles/course-agenda.css';

const DAY_LABEL = [nt('Sun'), nt('Mon'), nt('Tue'), nt('Wed'), nt('Thu'), nt('Fri'), nt('Sat')];

const KIND_LABEL: Partial<Record<AgendaDay['kind'], string>> = {
  rest: nt('Rest'),
  'light-review': nt('Light review'),
  'exam-day': nt('Exam day'),
  assessment: nt('Timed practice'),
};

export default function WeekView() {
  const { t, locale } = useT();
  const agenda = useCourseAgenda();

  if (agenda.status !== 'ready' || !agenda.selectedDay) return null;
  const selectedDay = agenda.selectedDay;

  const dateLabel = (date: string) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  return (
    <section className="course-agenda" aria-labelledby="week-heading">
      <div className="course-agenda-heading">
        <h2 id="week-heading">{t('The week ahead')}</h2>
        <p>{t('Every day within its own time budget. Only today is fixed; the rest adjusts as you go.')}</p>
      </div>
      <div className="agenda-days" role="group" aria-label={t('Your rolling schedule')}>
        {agenda.days.map((day) => (
          <button
            key={day.date}
            type="button"
            className="agenda-day"
            aria-pressed={day.date === selectedDay.date}
            aria-controls="selected-day-agenda"
            aria-label={dateLabel(day.date)}
            onClick={() => agenda.selectDate(day.date)}
          >
            <span>{t(DAY_LABEL[day.weekday]!)}</span>
            <strong>{Number(day.date.slice(-2))}</strong>
            <span className="agenda-day-status">
              {day.isToday ? t('Today') : day.budgetMinutes > 0 ? t('{n} min', { n: day.budgetMinutes }) : t('Rest')}
            </span>
          </button>
        ))}
      </div>
      <div id="selected-day-agenda" className="agenda-detail" role="region" aria-labelledby="agenda-date-heading">
        <div className="agenda-detail-heading">
          <h3 id="agenda-date-heading">{dateLabel(selectedDay.date)}</h3>
          {selectedDay.budgetMinutes > 0 && <span>{t('{n} min', { n: selectedDay.budgetMinutes })}</span>}
        </div>
        <WeekDay key={selectedDay.date} day={selectedDay} />
      </div>
    </section>
  );
}

function WeekDay({ day }: { day: AgendaDay }) {
  const { t } = useT();
  const kindLabel = KIND_LABEL[day.kind];

  if (day.items.length === 0) {
    return (
      <div className="agenda-activities">
        <span className="plan-week-empty">{kindLabel ? t(kindLabel) : t('Rest')}</span>
      </div>
    );
  }

  return (
    <div className="agenda-activities">
      {day.items.map((item) => {
        const copy = (
          <>
            <span className="plan-week-item-tick" aria-hidden="true">{item.state === 'done' ? '✓' : ''}</span>
            <span className="agenda-activity-copy">
              <strong>{item.title}</strong>
              {item.detail && <span>{item.detail}</span>}
            </span>
            <span className="agenda-minutes">{t('{n} min', { n: item.minutes })}</span>
          </>
        );
        return item.href ? (
          <a
            key={item.key}
            href={withBase(item.href)}
            className={`agenda-activity${item.state === 'done' ? ' is-done' : ''}`}
            aria-current={item.state === 'current' ? 'step' : undefined}
            title={t('{label} ({minutes} min)', { label: item.title, minutes: item.minutes })}
          >
            {copy}
          </a>
        ) : (
          <span key={item.key} className="agenda-activity" title={item.detail ?? item.title}>
            {copy}
          </span>
        );
      })}
    </div>
  );
}
