/* What a focused exercise page hands its island, resolved against the real
 * material. BUILD SIDE ONLY: it reads the practice papers, the Writing
 * questions and plans, the model answers and the speaking prompts, so it is
 * imported by the two focused routes' frontmatter and by
 * tools/build-gated-content.mjs, and never by anything that runs in the
 * browser. It sits here, beside the papers' own helpers, and not under
 * src/lib/learning, whose modules must never import the papers.
 *
 * Two callers, one answer:
 *   - src/pages/trainers/focused/[id].astro and
 *     src/pages/trainers/speaking-focus/[id].astro (the open build writes the
 *     view into the page as the island's props);
 *   - tools/build-gated-content.mjs, which writes the same view as a paid
 *     pack (packs/focused-<id>.json, packs/speaking-focus-<id>.json) for the
 *     gated build, whose pages carry no exercise at all.
 *
 * Moved here unchanged from the routes' frontmatter (29 September 2026,
 * paid content in the gated build), so both callers cannot drift apart.
 *
 * If a named group or prompt is not there, or is not the type the exercise
 * claims, this THROWS, which fails the build rather than shipping an empty
 * page. */

import { focusedSourceSupport } from './focused-source-support';
import {
  MISTAKE_REASONS,
  isWrittenFocusedTask,
  isAuthoredFocusedExercise,
  writtenItemId,
  type AnyFocusedExercise,
  type FocusedExercise as FocusedExerciseData,
  type WrittenFocusedTask as WrittenFocusedTaskData,
  type AuthoredFocusedExercise as AuthoredFocusedExerciseData,
  type SpokenFocusedTask as SpokenFocusedTaskData,
} from '../../data/focused-exercises';
import { ALL_TESTS } from '../../data/tests';
import { WRITING_PROMPTS } from '../../data/writing-prompts';
import { WRITING_PLANS } from '../../data/writing-plans';
import { getModelAnswers } from '../../data/model-answers';
import { SPEAKING_PART1_TOPICS, SPEAKING_CUE_CARDS } from '../../data/speaking-prompts';
import { focusedActivityId } from '../learning/catalog';
import { blockPlainText, segmentLessonBody } from '../learning/lesson-blocks';
import { guidingQuestionsFor, modelParagraphFor, type WrittenTaskView } from '../../components/learning/written-focused-task';
import { groupAudioWindow } from '../../components/learning/focused-exercise';
import type { FocusedExerciseView, FocusedItemView } from '../../components/learning/focused-exercise';
import type { SpokenTaskView } from '../../components/learning/spoken-focused-task';

/** A lesson body's English HTML by its lesson key, or undefined. */
export type LessonBodyLookup = (lessonKey: string) => string | undefined;

/** One focused exercise, as its island needs it: exactly one of the two is set. */
export interface FocusedPageView {
  written: WrittenTaskView | null;
  item: FocusedExerciseView | null;
}

/** The teaching block an exercise practises, found by its heading so a
    rewritten lesson cannot silently point the help at another paragraph.
    Shared by every kind. */
function teachingBlock(entry: { lesson?: { key: string; blockHeading: string } }, lessonBody: LessonBodyLookup) {
  const lessonHtml = entry.lesson ? lessonBody(entry.lesson.key) : undefined;
  const blocks = lessonHtml ? segmentLessonBody(lessonHtml) : [];
  const block = blocks.find((candidate) => candidate.heading === entry.lesson?.blockHeading) ?? blocks[blocks.length - 1];
  const segments = entry.lesson?.key.split('-') ?? [];
  const href =
    entry.lesson && block
      ? `/lessons/${segments[0]}/${segments.slice(1).join('-')}#${block.id}`
      : undefined;
  return {
    lessonHref: href,
    lessonKey: entry.lesson?.key,
    blockId: block?.id ?? '',
    blockHeading: block?.heading ?? '',
    blockText: block?.text ?? '',
  };
}

export function focusedPageView(exercise: AnyFocusedExercise, lessonBody: LessonBodyLookup): FocusedPageView {
  /* ── A written response: one real prompt, the student's own words ───── */
  if (isWrittenFocusedTask(exercise)) {
    const task = exercise as WrittenFocusedTaskData;
    const prompt = WRITING_PROMPTS.find((entry) => entry.id === task.source.promptId);
    if (!prompt) throw new Error(`Written task ${task.id} names a prompt that does not exist: ${task.source.promptId}`);
    if (prompt.task !== task.source.task) {
      throw new Error(`Written task ${task.id} says ${task.source.task} but ${prompt.id} is ${prompt.task}.`);
    }
    if (prompt.variant !== task.source.form) {
      throw new Error(`Written task ${task.id} says ${task.source.form} but ${prompt.id} is ${prompt.variant}.`);
    }

    /* The prompt's own guiding questions, written by an IELTS teacher to lead
       the student to their own answer, OR (WP20) the task's own guiding
       questions when it carries its own rather than the prompt's shared
       "Build your overview" ones. A check gets none either way: that is what
       makes it a check. */
    const plan = WRITING_PLANS[prompt.id];
    const guiding = guidingQuestionsFor(task.role, task.guidingQuestions ?? plan?.overviewHints);
    if (task.role !== 'independent-check' && guiding.length === 0) {
      throw new Error(`Written task ${task.id} has no guiding questions: give it its own, or ${prompt.id} needs overviewHints.`);
    }

    /* "One way to write it": the band 8 model's overview paragraph by
       default (Pilot B, unchanged), or the paragraph WP20's task names by
       position (modelParagraphIndex). Carried to the browser but never
       rendered before the student's own attempt, which the component
       enforces and tests/pilot-task1-overview.test.ts pins down for the
       overview. Sentence correction sets neither a model paragraph nor a
       WRITING_PROMPTS model to show, so the component's model panel simply
       does not render when modelOverview is null. */
    const models = getModelAnswers(prompt.id);
    const model = models.find((entry) => entry.band === 8) ?? models[0];
    const modelOverview = task.correctionSentence ? null : model ? modelParagraphFor(model.text, task.modelParagraphIndex) : null;
    if (!task.correctionSentence && !modelOverview) {
      throw new Error(`Written task ${task.id}: ${prompt.id} has no band 8 model paragraph at index ${task.modelParagraphIndex ?? '(overview)'} to show afterwards.`);
    }

    return {
      item: null,
      written: {
        exerciseId: task.id,
        activityId: focusedActivityId(task.id),
        contentVersion: 1,
        role: task.role,
        paper: task.paper,
        subskill: task.subskill,
        /* The trusted scope and the trusted noun, both straight off the
           registry entry. `source.task` has already been checked against the
           prompt itself above, so a Task 2 exercise can neither be built on a
           Task 1 prompt nor record Task 1 evidence. */
        task: task.source.task,
        piece: task.piece,
        title: task.title,
        objective: task.objective,
        instruction: task.instruction,
        expectedMinutes: task.expectedMinutes,
        minWords: task.rules.minWords,
        maxWords: task.rules.maxWords,
        checks: task.rules.checks,
        promptId: prompt.id,
        promptTitle: prompt.title,
        promptHtml: prompt.promptHtml,
        form: task.source.form,
        attribution: task.source.attribution,
        itemId: writtenItemId(prompt.id),
        guidingQuestions: guiding,
        modelOverview,
        noticeInTheModel: task.noticeInTheModel,
        ...(task.correctionSentence ? { correctionSentence: task.correctionSentence } : {}),
        ...(task.correctionNote ? { correctionNote: task.correctionNote } : {}),
        ...(task.transferPrompt ? { transferPrompt: task.transferPrompt } : {}),
        ...teachingBlock(task, lessonBody),
      },
    };
  }

  if (isAuthoredFocusedExercise(exercise)) {
    /* ── Authored practice: no real paper, so nothing to look up ─────────
       Sentence endings has no real Reading material at all (LEAD-DECISIONS
       Q1). Its passage, questions and options are written directly into the
       data file rather than resolved from ALL_TESTS, but the VIEW shape
       handed to FocusedExercise is exactly the item-answers one.
       `verified: false` on the catalogue activity (see catalog.ts) is what
       keeps this out of an independent check. */
    const entry = exercise as AuthoredFocusedExerciseData;
    const items: FocusedItemView[] = entry.items.map((item) => ({
      itemId: item.id,
      questionId: item.questionId,
      number: item.number,
      label: item.label,
      answer: item.answer,
      explanation: item.explanation,
    }));
    return {
      written: null,
      item: {
        exerciseId: entry.id,
        activityId: focusedActivityId(entry.id),
        contentVersion: 1,
        role: entry.role,
        paper: entry.paper,
        subskill: entry.subskill,
        title: entry.title,
        objective: entry.objective,
        expectedMinutes: entry.expectedMinutes,
        testId: `authored:${entry.id}`,
        attribution: entry.attribution,
        authored: true,
        instructionText: blockPlainText(entry.instructionHtml),
        passage: entry.passage,
        instructionHtml: entry.instructionHtml,
        options: entry.options,
        items,
        reasons: MISTAKE_REASONS[entry.reasons] ?? MISTAKE_REASONS.generic,
        ...teachingBlock(entry, lessonBody),
      },
    };
  }

  /* ── Item answers: one question group out of one real paper ─────────── */
  const entry = exercise as FocusedExerciseData;
  const test = ALL_TESTS.find((candidate) => candidate.id === entry.source.testId);
  if (!test) throw new Error(`Focused exercise ${entry.id} names a paper that does not exist: ${entry.source.testId}`);
  const part = test.parts[entry.source.partIndex];
  if (!part) throw new Error(`Focused exercise ${entry.id} names part ${entry.source.partIndex} of ${test.id}, which has ${test.parts.length}.`);
  const group = part.groups[entry.source.groupIndex];
  if (!group) throw new Error(`Focused exercise ${entry.id} names group ${entry.source.groupIndex}, which is not in ${test.id} part ${entry.source.partIndex}.`);
  if (group.type !== entry.subskill) {
    throw new Error(`Focused exercise ${entry.id} says ${entry.subskill} but ${test.id} group ${entry.source.groupIndex} is ${group.type}.`);
  }
  if (part.stimulus.kind !== 'passage' && part.stimulus.kind !== 'audio') {
    throw new Error(`Focused exercise ${entry.id} points at a part with no passage and no recording, which this page cannot render.`);
  }

  /* The numbered slot a student would see on the real paper, so a question
     that is "14" there is "14" here. Counted across the whole paper,
     exactly as numberQuestions does in TestPlayer. */
  const numberById = new Map<string, number>();
  let counter = 0;
  for (const testPart of test.parts) {
    for (const testGroup of testPart.groups) {
      for (const question of testGroup.questions) {
        counter += 1;
        numberById.set(question.id, counter);
      }
    }
  }

  /* The fixed value list for the two types whose choices are the same on
     every paper and so are never printed as the group's own `options`
     (TestPlayer.tsx makes exactly this same exception for the same reason).
     Free text is signalled to the component by `before`/`after` on the item
     instead, never by an empty options list here. */
  const FIXED_GROUP_OPTIONS: Partial<Record<string, readonly string[]>> = {
    tfng: ['True', 'False', 'Not Given'],
    'yes-no-notgiven': ['Yes', 'No', 'Not Given'],
  };
  const sourceSupport = focusedSourceSupport(
    part.stimulus.kind === 'audio' ? part.stimulus.questionHtml ?? '' : '',
    numberById.get(group.questions[0]!.id)!,
    group,
  );
  const isFreeText = sourceSupport.freeText;
  const groupOptions = FIXED_GROUP_OPTIONS[group.type] ?? sourceSupport.options;

  const items: FocusedItemView[] = entry.items.map((item) => {
    const question = group.questions.find((candidate) => candidate.id === item.questionId);
    if (!question) throw new Error(`Focused exercise ${entry.id} names ${item.questionId}, which is not in that group.`);
    /* Multiple answer's real material always shares one accepted PAIR
       across two numbered questions (schema.ts's answerPairId), printed on
       both as the same array. Keeping it as an array is what lets
       isCorrect() accept either slot naming either value. */
    const answer =
      group.type === 'multiple-answer' && Array.isArray(question.answer)
        ? question.answer
        : Array.isArray(question.answer)
          ? (question.answer[0] as string)
          : question.answer;
    /* Multiple choice: each question carries its OWN options. Multiple
       answer: every question in the pair offers the same shared pool
       (group.choices). Neither is the shared per-group list every other
       select-from-a-list type uses, so both ride on the item. */
    const perItemOptions =
      group.type === 'multiple-choice' && question.options
        ? question.options.map((text, index) => ({
            value: ['A', 'B', 'C', 'D', 'E', 'F'][index] ?? String(index + 1),
            label: `${['A', 'B', 'C', 'D', 'E', 'F'][index] ?? String(index + 1)}. ${text}`,
          }))
        : group.type === 'multiple-answer' && group.choices
          ? group.choices.map((choice) => ({ value: choice.value, label: `${choice.value}. ${choice.label}` }))
          : undefined;
    const label = isFreeText ? blockPlainText(question.textHtml ?? '') : blockPlainText(question.textHtml ?? question.id);
    return {
      itemId: item.id,
      questionId: question.id,
      number: numberById.get(question.id) ?? 0,
      label,
      answer,
      explanation: question.explanation,
      evidence: question.evidence,
      ...(perItemOptions ? { options: perItemOptions } : {}),
      ...(isFreeText ? { before: question.before ?? '', after: question.after ?? '' } : {}),
    };
  });

  /* Reading shows the passage it was written against; Listening plays the
     recording segment it was heard in. Exactly one of the two is set,
     decided by the part's own stimulus, never guessed from the paper's
     skill. */
  let stimulusView: Pick<FocusedExerciseView, 'passage' | 'audio'>;
  if (part.stimulus.kind === 'passage') {
    stimulusView = {
      passage: {
        label: part.stimulus.label,
        title: part.stimulus.title,
        paragraphs: part.stimulus.paragraphs,
      },
    };
  } else {
    const audioStimulus = part.stimulus;
    const recordingSrc = test.audioSrc ?? audioStimulus.src;
    if (!recordingSrc) {
      throw new Error(`Focused exercise ${entry.id}: ${test.id} part ${entry.source.partIndex} has no recording to play.`);
    }
    if (audioStimulus.startSeconds == null || audioStimulus.endSeconds == null) {
      throw new Error(
        `Focused exercise ${entry.id}: ${test.id} part ${entry.source.partIndex} has no startSeconds/endSeconds, so its segment of the shared recording cannot be bounded.`,
      );
    }
    const partWindow = { startSeconds: audioStimulus.startSeconds, endSeconds: audioStimulus.endSeconds };
    const { segment, narrowed, itemWindows } = groupAudioWindow(
      audioStimulus.transcriptHtml ?? '',
      items.map((item) => ({ itemId: item.itemId, evidence: item.evidence })),
      partWindow,
    );
    for (const item of items) {
      const window = itemWindows.get(item.itemId);
      if (window) item.audioReplay = window;
    }
    stimulusView = {
      audio: {
        recordingSrc,
        partLabel: audioStimulus.label,
        part: partWindow,
        segment,
        narrowed,
      },
    };
  }

  return {
    written: null,
    item: {
      exerciseId: entry.id,
      activityId: focusedActivityId(entry.id),
      contentVersion: 1,
      role: entry.role,
      paper: entry.paper,
      subskill: entry.subskill,
      title: entry.title,
      objective: entry.objective,
      expectedMinutes: entry.expectedMinutes,
      testId: test.id,
      attribution: entry.source.attribution,
      instructionText: blockPlainText(group.instructionHtml ?? ''),
      ...stimulusView,
      instructionHtml: group.instructionHtml ?? '',
      legendHtml: sourceSupport.legendHtml,
      options: groupOptions,
      items,
      reasons: MISTAKE_REASONS[entry.reasons] ?? MISTAKE_REASONS.generic,
      ...(group.wordLimit != null ? { wordLimit: group.wordLimit } : {}),
      ...teachingBlock(entry, lessonBody),
    },
  };
}

/** The one question a spoken task's student answers, resolved from the real
    prompt: a Part 1 topic's first question, or a cue card's own "you should
    say" wording, exactly the shape SpeakingTester builds for the same cue
    card. */
function questionTextFor(task: SpokenFocusedTaskData): string {
  const { promptId, part } = task;
  if (part === 1) {
    const topic = SPEAKING_PART1_TOPICS.find((entry) => entry.id === promptId);
    if (!topic) throw new Error(`Spoken task ${task.id} names a Part 1 topic that does not exist: ${promptId}`);
    const question = topic.questions[0];
    if (!question) throw new Error(`Spoken task ${task.id}: ${promptId} has no questions.`);
    return question.text;
  }
  const card = SPEAKING_CUE_CARDS.find((entry) => entry.id === promptId);
  if (!card) throw new Error(`Spoken task ${task.id} names a cue card that does not exist: ${promptId}`);
  if (part === 2) return `${card.topic} You should say: ${card.bullets.join('; ')}.`;
  const first = card.part3Questions[0];
  if (!first) throw new Error(`Spoken task ${task.id}: ${promptId} has no Part 3 follow-ups.`);
  return first.text;
}

export function spokenTaskView(task: SpokenFocusedTaskData, lessonBody: LessonBodyLookup): SpokenTaskView {
  const block = teachingBlock(task, lessonBody);
  return {
    exerciseId: task.id,
    activityId: focusedActivityId(task.id),
    contentVersion: 1,
    subskill: task.subskill,
    part: task.part,
    title: task.title,
    objective: task.objective,
    instruction: task.instruction,
    expectedMinutes: task.expectedMinutes,
    promptId: task.promptId,
    questionText: questionTextFor(task),
    checklist: task.checklist,
    lessonHref: block.lessonHref,
    lessonKey: block.lessonKey,
    blockId: block.blockId,
    blockHeading: block.blockHeading,
    blockText: block.blockText,
    ...(task.pronunciationNote ? { pronunciationNote: task.pronunciationNote } : {}),
  };
}
