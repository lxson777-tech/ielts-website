/* The live Course agenda for a component: the plan's rolling schedule as
   AgendaDay rows (src/lib/learning/agenda.ts), kept current as evidence and
   the plan change, plus the selected day. Presentation is the caller's; this
   only supplies state, so Codex's agenda design and the current week view read
   the same thing. `status` separates "still reading the stores" from "there is
   genuinely no schedule", so a design never flashes an empty state. */
import { useEffect, useMemo, useState } from 'react';
import {
  ensureLearningWired,
  getCurrentSession,
  onLearnerRecordChange,
  onPersonalPlanChange,
  readPersonalPlan,
  type SharedSessionView,
} from '../../lib/learning';
import { courseAgenda, type AgendaDay, type CourseAgenda } from '../../lib/learning/agenda';
import type { PersonalPlanV1 } from '../../lib/learning/contracts/plan';
import { useT } from '../../lib/i18n/react';

ensureLearningWired();

export interface CourseAgendaState extends CourseAgenda {
  status: 'loading' | 'ready' | 'empty' | 'error';
  selectedDate: string | null;
  selectedDay: AgendaDay | null;
  selectDate: (date: string) => void;
}

export function useCourseAgenda(): CourseAgendaState {
  const { t, locale } = useT();
  const [plan, setPlan] = useState<PersonalPlanV1 | null>(null);
  const [session, setSession] = useState<SharedSessionView | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      try {
        setSession(getCurrentSession());
        setPlan(readPersonalPlan());
        setStatus('ready');
      } catch {
        setSession(null);
        setPlan(null);
        setStatus('error');
      }
    };
    refresh();
    const offRecord = onLearnerRecordChange(refresh);
    const offPlan = onPersonalPlanChange(refresh);
    window.addEventListener('focus', refresh);
    return () => {
      offRecord();
      offPlan();
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const agenda = useMemo(() => courseAgenda(plan, session, locale, (english) => t(english)), [plan, session, locale, t]);
  /* A chosen day that a replan has dropped falls back to the agenda's own
     opening day rather than to nothing. */
  const selectedDate = chosen && agenda.days.some((day) => day.date === chosen) ? chosen : agenda.initialDate;
  const selectedDay = agenda.days.find((day) => day.date === selectedDate) ?? null;

  return {
    ...agenda,
    status: status === 'ready' && agenda.days.length === 0 ? 'empty' : status,
    selectedDate,
    selectedDay,
    selectDate: setChosen,
  };
}
