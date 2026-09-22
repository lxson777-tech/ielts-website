import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const fromRoot = p => pathToFileURL(`${process.cwd()}/${p}`).href;
const { NO_WRITTEN_HELP, withWrittenHelp, writtenEvidenceDraft } = await import(fromRoot('src/components/learning/written-focused-task.ts'));
const { createEvidenceEvent, classifyEvidence } = await import(fromRoot('src/lib/learning/evidence.ts'));
const view = {activityId:'focus:writing-lexical-topic-vocabulary-check', contentVersion:1, paper:'writing', subskill:'lexical-precision', role:'independent-check', itemId:'review-synthetic-item', promptId:'pte-wt-106-task2'};
const evaluation = {judged:true, verdict:'met', observations:['Synthetic successful evaluation, no live model called.']};
// Match WritingFocusedTask.evaluate: raise help after judgement, then record.
const level = withWrittenHelp(NO_WRITTEN_HELP, {tutorJudged:true});
const draft = writtenEvidenceDraft({view,text:'SYNTHETIC independently written paragraph about education and public investment.',help:level,evaluation,at:'2026-09-22T10:00:00.000Z',task:'task1'});
const event = createEvidenceEvent(draft);
const result = classifyEvidence(event);
assert.equal(result.use,'assisted');
assert.equal(result.reason,'assistance-used');
console.log(JSON.stringify({assistanceBeforeSubmission:NO_WRITTEN_HELP.assistance,assistanceRecorded:event.assistance,evidenceUse:result.use,reason:result.reason,actualPrompt:view.promptId,recordedTaskScope:event.taskScope},null,2));
