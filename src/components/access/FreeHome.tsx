/* Today for a FREE account in the gated build (the free-account model,
   Alex, 1 October 2026): the course and the next lessons to read, and one
   calm card about practice and guidance whose button opens the upgrade
   pop-up. Nothing paid is offered as if it were open.

   The next lessons start from the questionnaire answers the student gave on
   the sales website, when there are any (src/lib/access/free-today.ts): the
   chosen section first, in course order. Progress is the lesson ticks the
   student has pressed, the same store the course and the library read. */

import { useEffect, useMemo, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { buildCourse, isLessonDone, type CourseLesson } from '../../lib/course';
import { getProgress, onProgressChange, type ProgressV1 } from '../../lib/progress';
import { freeNextLessons, freeProgress, resolveStartingPoint, type StartingPoint } from '../../lib/access/free-today';
import { openUpgrade } from '../../lib/access/upgrade';
import { pitchPlan, pitchPrice, PITCH_PRICE_LINE } from '../../lib/access/upgrade-pitch';
import { useTrial } from '../../lib/trial/react';
import { deviceStorage } from '../../lib/store-owner';
import { currentRoute } from '../../lib/auth/next';
import { anyTasterOffered } from '../../lib/access/taster-offers';
import { ensureAccessStyles } from './access-styles';
import { TasterTodayCard, useTaster } from './taster-ui';

const LESSONS: CourseLesson[] = buildCourse().flatMap((module) => module.lessons);

/** Section names stay English in both languages, like the exam papers. */
const SECTION_NAME: Record<string, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export default function FreeHome({ ended = false }: { ended?: boolean }) {
  ensureAccessStyles();
  const { t, locale } = useT();
  const trial = useTrial();
  const [progress, setProgress] = useState<ProgressV1 | null>(null);
  const [start, setStart] = useState<StartingPoint | null>(null);

  useEffect(() => {
    setProgress(getProgress());
    return onProgressChange(() => setProgress(getProgress()));
  }, []);

  useEffect(() => {
    if (!trial.userId) return;
    setStart(
      resolveStartingPoint({
        search: window.location.search,
        userId: trial.userId,
        local: deviceStorage(),
        session: sessionStore(),
      }),
    );
  }, [trial.userId]);

  const done = (key: string) => (progress ? isLessonDone(progress, key) : false);
  const next = useMemo(() => freeNextLessons(LESSONS, done, start), [progress, start]); // eslint-disable-line react-hooks/exhaustive-deps
  const { done: studied, total } = freeProgress(LESSONS, done);
  const plan = pitchPlan();
  const tries = useTaster();
  const showTries = anyTasterOffered(tries.tier, tries.taster, tries.underExam);
  const percent = total > 0 ? Math.round((studied / total) * 100) : 0;

  return (
    <div className="free-home" data-free-home>
      <header className="free-home-head">
        <p className="free-home-eyebrow">{t('Today')}</p>
        <h1>{studied > 0 ? t('Pick up where you left off.') : t('Start with your first lesson.')}</h1>
        <p className="free-home-lead">
          {ended
            ? t('Your practice and guidance has ended. Every lesson stays open, and your results are saved.')
            : t('Every lesson is free with your account, in English and Russian, with worked examples and a short quiz.')}
        </p>
        {start && (
          <p className="free-home-start" data-free-start={start.skill}>
            {t('Your starting point: {section}, target band {band}, about {minutes} minutes a day.', {
              section: SECTION_NAME[start.skill] ?? start.skill,
              band: start.band === '8' ? '8.0+' : Number(start.band).toFixed(1),
              minutes: start.time,
            })}
          </p>
        )}
      </header>

      <section className="free-home-course" aria-labelledby="free-next-title">
        <div className="free-home-course-head">
          <h2 id="free-next-title">{t('Your next lessons')}</h2>
          <div className="free-home-progress" aria-label={t('{done} of {total} lessons studied', { done: studied, total })}>
            <span>{t('{done} of {total} lessons studied', { done: studied, total })}</span>
            <span className="free-home-bar" aria-hidden="true">
              <span style={{ width: `${percent}%` }} />
            </span>
          </div>
        </div>
        {next.length > 0 ? (
          <ol className="free-home-lessons">
            {next.map((lesson, index) => (
              <li key={lesson.key} className={`skill-${lesson.skill}`}>
                <a href={withBase(lesson.href)} data-free-next={lesson.key}>
                  <span className="free-home-index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="free-home-lesson-text">
                    <small>{t(lesson.skillLabel)}</small>
                    <b>{t(lesson.title)}</b>
                    {lesson.blurb && <span>{t(lesson.blurb)}</span>}
                  </span>
                  <span className="free-home-open">
                    {typeof lesson.minutes === 'number' ? t('{n} min', { n: lesson.minutes }) : t('Open lesson')}
                    <span aria-hidden="true"> →</span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <p className="free-home-empty">{t('You have studied every lesson in the course. Revisit any of them from the library.')}</p>
        )}
        <div className="free-home-links">
          <a href={withBase('/start')}>{t('See the whole course')}</a>
          <a href={withBase('/learn')}>{t('Browse every lesson')}</a>
        </div>
      </section>

      {/* Free AI tries (10 October 2026): while any is left, the card below
          takes the pitch's place and carries the pitch as its quiet footer.
          Once every try is used, or for an account that gets none, it is the
          plain pitch again. */}
      <TasterTodayCard />
      {!showTries && <aside className="trial-ui free-home-pitch" aria-labelledby="free-pitch-title" data-free-pitch>
        <span className="upgrade-eyebrow">{t('Practice and guidance')}</span>
        <h2 id="free-pitch-title">{t('Practise what you learn, with feedback on your own work.')}</h2>
        <p>
          {t('Timed tests with band estimates, essay and Speaking feedback, live interviews, Mr EZ and a personal study plan with practice every day.')}
        </p>
        <div className="free-home-pitch-row">
          <button
            type="button"
            className="trial-btn trial-primary"
            onClick={() => openUpgrade('plan-practice', { from: currentRoute() })}
            data-free-pitch-open
          >
            {t('See what practice and guidance adds')}
          </button>
          <small>{t(PITCH_PRICE_LINE, { price: pitchPrice(plan.amount, locale), days: plan.days })}</small>
        </div>
      </aside>}
    </div>
  );
}
