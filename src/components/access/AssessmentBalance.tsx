import { useTrial } from '../../lib/trial/react';
import { hasPaidAccess } from '../../lib/trial/status';
import { useT } from '../../lib/i18n/react';
export default function AssessmentBalance() {
  const trial=useTrial(); const {locale}=useT();
  const a=trial.status?.assessments;
  if (!a || !trial.status) return null;
  const ru=locale==='ru';
  return <aside className="purchase-terms" aria-live="polite">
    <b>{ru?'Осталось проверок':'Assessments remaining'}</b>
    {hasPaidAccess(trial.status,trial.now) ? <p>
      Writing: {Math.max(0,12-a.writingUsed)}/12 · Speaking: {Math.max(0,6-a.speakingUsed)}/6 · {ru?'Собеседования':'Live interviews'}: {Math.max(0,2-a.liveUsed)}/2
    </p> : <p>{ru?'Одна проверка на выбор: Writing или запись Speaking. Осталось:':'One assessment shared between Writing and recorded Speaking. Remaining:'} {Math.max(0,1-a.trialUsed)}/1</p>}
  </aside>;
}
