/* Why a wrong answer happened, in the student's own words: the reason lists
   a student picks from after a wrong answer, one list per question type.

   Moved out of focused-exercises.ts on 24 September 2026 so that a trial
   build (PUBLIC_ACCESS_MODE=trial), whose browser carries no focused
   exercise content (src/lib/trial/light/focused-exercises.ts), still has
   these lists for the open test screens. focused-exercises.ts re-exports
   everything here, so no import elsewhere changed. */

/* ── Why a wrong answer happened, in the student's own words ─────────────── */

/** Each question type has its own typical wrong turnings, so each one has
    its own list. The brief requires an OBSERVED mistake to be told apart
    from a CONJECTURED cause: the student picks from this list, what they
    picked is stored with the evidence, and the diagnosis it suggests is
    always worded as tentative.

    The seven `listening-*` ids are WP18b/WP19's addition (2026-09-22), one
    per Listening question type that has real material (see
    docs/personal-learning/ARCHITECTURE.md section 6.2: sentence-completion,
    multiple-choice, table-completion, matching-features, multiple-answer,
    categorisation, diagram-labelling; `sentence-endings` etc. do not occur
    in the Listening data at all, so they have no list). Content reviewed by
    an IELTS teacher against how each type really goes wrong, not guessed.

    The nine unprefixed ids below `matching-headings` are WP18a's addition
    (2026-09-22), one per Reading question type with real material beyond
    Pilot A, plus `sentence-endings` for the one small authored set (no real
    Reading paper contains that type at all). Unprefixed, the same
    convention as `matching-headings` itself: Reading gets the plain name,
    Listening gets `listening-` in front, because the two fail differently
    (a Reading student can reread; a Listening student cannot), so a shared
    list would either be too vague to help or wrong for one of the two. */
export type MistakeReasonListId =
  | 'matching-headings'
  | 'generic'
  | 'tfng'
  | 'yes-no-notgiven'
  | 'matching-features'
  | 'paragraph-matching'
  | 'multiple-choice'
  | 'sentence-completion'
  | 'table-completion'
  | 'multiple-answer'
  | 'categorisation'
  | 'sentence-endings'
  | 'listening-sentence-completion'
  | 'listening-multiple-choice'
  | 'listening-table-completion'
  | 'listening-matching-features'
  | 'listening-multiple-answer'
  | 'listening-categorisation'
  | 'listening-diagram-labelling';

export interface MistakeReason {
  /** Stored with the evidence, so it must never be reworded. */
  id: string;
  /** What the student taps. English, translated through t(). */
  label: string;
  /** What this usually means, in the platform's own words. Shown wrapped in
      a tentative sentence, never as a finding. Empty for an answer that
      says nothing about method, such as running out of time. */
  diagnosis: string;
}

export const MISTAKE_REASONS: Readonly<Record<MistakeReasonListId, readonly MistakeReason[]>> = {
  'matching-headings': [
    {
      id: 'repeated-words',
      label: 'It repeats words from the paragraph',
      diagnosis: 'choosing a heading because its words appear in the paragraph, rather than because it says what the paragraph is about',
    },
    {
      id: 'first-sentence',
      label: 'It matches the first sentence',
      diagnosis: 'trusting the first sentence instead of the paragraph as a whole',
    },
    {
      id: 'one-detail',
      label: 'It fits one detail in the paragraph',
      diagnosis: 'choosing a detail instead of the main idea',
    },
    {
      id: 'two-headings-alike',
      label: 'Two headings looked the same to me',
      diagnosis: 'not yet separating two close headings by the one word that differs',
    },
    {
      id: 'ran-out-of-time',
      label: 'I ran out of time',
      diagnosis: '',
    },
    {
      id: 'guessed',
      label: 'I guessed',
      diagnosis: '',
    },
  ],
  generic: [
    {
      id: 'repeated-words',
      label: 'It repeats words from the text',
      diagnosis: 'matching words rather than meaning',
    },
    { id: 'misread', label: 'I misread the question', diagnosis: 'reading the question too quickly' },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],

  /* WP18a (2026-09-22). Each list below is reviewed by an IELTS teacher
     against how that Reading type really goes wrong (see the builder
     report's "For teacher review" table), not guessed from the others. */
  tfng: [
    {
      id: 'repeated-words',
      label: 'It repeats the same words as the passage',
      diagnosis: 'choosing an answer because the wording matches, rather than checking what the passage actually claims',
    },
    {
      id: 'false-vs-notgiven',
      label: 'The passage did not mention it, so I chose False',
      diagnosis: 'treating information the passage never gives as if it contradicted the statement, which is Not Given rather than False',
    },
    {
      id: 'own-knowledge',
      label: 'I used what I already know about the topic',
      diagnosis: 'answering from outside knowledge instead of from what the passage itself says',
    },
    {
      id: 'unsure-claim',
      label: 'I was not sure what the statement claims',
      diagnosis: 'not pinning down exactly what the statement is asserting before deciding',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'yes-no-notgiven': [
    {
      id: 'repeated-words',
      label: 'It repeats the same words as the passage',
      diagnosis: 'choosing an answer because the wording matches, rather than checking what the writer actually claims',
    },
    {
      id: 'no-vs-notgiven',
      label: 'The passage did not mention it, so I chose No',
      diagnosis: "treating an opinion the writer never gives as if it contradicted the statement, which is Not Given rather than No",
    },
    {
      id: 'facts-not-opinion',
      label: 'I checked whether it was true, not what the writer thinks',
      diagnosis: "answering from the facts in the passage rather than from the writer's own opinion, which is what this question type actually asks for",
    },
    {
      id: 'unsure-claim',
      label: 'I was not sure what the statement claims',
      diagnosis: 'not pinning down exactly what the statement is asserting before deciding',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'matching-features': [
    {
      id: 'repeated-words',
      label: 'It repeats a name or word from the statement',
      diagnosis: 'matching a repeated word instead of checking who or what the sentence is really about',
    },
    {
      id: 'right-person-wrong-point',
      label: 'The person seemed right, but I did not check the exact point',
      diagnosis: 'picking a person mentioned near the right idea instead of the one who actually said or did that specific thing',
    },
    {
      id: 'mixed-up-people',
      label: 'Two people in the list were too similar to me',
      diagnosis: 'not yet separating two people whose views or actions are close, by the one detail that tells them apart',
    },
    {
      id: 'first-mention',
      label: 'I chose the person mentioned first in the passage',
      diagnosis: 'trusting order of appearance instead of checking who is actually connected to this exact statement',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'paragraph-matching': [
    {
      id: 'repeated-words',
      label: 'It repeats words from the paragraph',
      diagnosis: 'choosing a paragraph because its words appear there, rather than because it actually contains that specific information',
    },
    {
      id: 'right-topic-wrong-detail',
      label: 'The paragraph was about the right topic, but not this exact detail',
      diagnosis: 'matching the general subject of the paragraph instead of the one specific fact the question asks for',
    },
    {
      id: 'first-paragraph-fits',
      label: 'The first paragraph I checked seemed to fit',
      diagnosis: 'stopping at the first plausible paragraph instead of checking the others for a closer match',
    },
    {
      id: 'more-than-one-place',
      label: 'The information seemed to be in more than one paragraph',
      diagnosis: 'not yet finding the one paragraph where the detail is stated most precisely',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'multiple-choice': [
    {
      id: 'repeated-words',
      label: 'It repeats words from the passage',
      diagnosis: 'choosing an option because its wording matches the passage, rather than because it is what the passage actually says',
    },
    {
      id: 'sounds-true',
      label: 'It sounded true, even if the passage did not say it',
      diagnosis: "choosing an option using outside knowledge or common sense instead of the passage's own words",
    },
    {
      id: 'partly-right',
      label: 'It was partly right, so I picked it',
      diagnosis: 'choosing an option that is true in part instead of checking whether the whole statement matches',
    },
    {
      id: 'eliminated-wrong',
      label: 'I ruled out two options but guessed between the last two',
      diagnosis: 'not finding the one detail that separates two remaining options',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'sentence-completion': [
    {
      id: 'wrong-word-type',
      label: 'I wrote a word that did not fit the gap grammatically',
      diagnosis: 'not checking what type of word the gap needs (a noun, a number, a name) before writing an answer',
    },
    {
      id: 'over-limit',
      label: 'I wrote more words than the limit allowed',
      diagnosis: 'not checking the stated word limit before writing the answer',
    },
    {
      id: 'paraphrased',
      label: "I wrote my own words instead of the passage's exact words",
      diagnosis: "paraphrasing instead of copying the exact word or words the passage uses",
    },
    {
      id: 'wrong-part-of-passage',
      label: 'I took the answer from the wrong part of the passage',
      diagnosis: 'not finding the exact part of the passage the sentence is paraphrasing',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'table-completion': [
    {
      id: 'wrong-row',
      label: 'I filled in the wrong row or column',
      diagnosis: 'not matching the gap to the right row before deciding on an answer',
    },
    {
      id: 'over-limit',
      label: 'I wrote more words than the limit allowed',
      diagnosis: 'not checking the stated word limit before writing the answer',
    },
    {
      id: 'paraphrased',
      label: "I wrote my own words instead of the passage's exact words",
      diagnosis: "paraphrasing instead of copying the exact word or words the passage uses",
    },
    {
      id: 'wrong-part-of-passage',
      label: 'I took the answer from the wrong part of the passage',
      diagnosis: 'not finding the exact part of the passage that matches this row',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'multiple-answer': [
    {
      id: 'repeated-words',
      label: 'It repeats words from the passage',
      diagnosis: 'choosing an option because its wording matches the passage, rather than because it is one of the actual points made there',
    },
    {
      id: 'one-not-two',
      label: 'I was confident about one option but guessed the second',
      diagnosis: 'not checking every remaining option against the passage before settling on the second choice',
    },
    {
      id: 'plausible-not-stated',
      label: 'It seemed like a reasonable answer, even though the passage did not quite say it',
      diagnosis: 'choosing an option that sounds reasonable instead of one the passage actually states',
    },
    {
      id: 'missed-second-point',
      label: 'I found one correct point but missed where the second one was',
      diagnosis: 'stopping after finding one correct option instead of continuing to check for the other',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  categorisation: [
    {
      id: 'repeated-words',
      label: 'It repeats words from the statement',
      diagnosis: 'matching a repeated word instead of checking which category the statement actually belongs to',
    },
    {
      id: 'mixed-up-categories',
      label: 'Two categories in the list were too similar to me',
      diagnosis: 'not yet separating two close categories by the one detail that tells them apart',
    },
    {
      id: 'right-topic-wrong-category',
      label: 'It was about the right topic, but the wrong category',
      diagnosis: 'matching the general subject instead of checking which specific category the statement is classified under',
    },
    {
      id: 'first-mention',
      label: 'I chose the category mentioned first in the passage',
      diagnosis: 'trusting order of appearance instead of checking which category this exact statement belongs to',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'sentence-endings': [
    {
      id: 'grammar-only',
      label: 'I only checked that the grammar fit, not the meaning',
      diagnosis: 'matching an ending that is grammatically possible instead of checking that it is also true according to the passage',
    },
    {
      id: 'repeated-words',
      label: 'It repeats words from the sentence beginning',
      diagnosis: 'choosing an ending because its wording echoes the beginning, rather than because it is the ending the passage actually supports',
    },
    {
      id: 'plausible-ending',
      label: 'It sounded like a reasonable way to finish the sentence',
      diagnosis: 'choosing an ending that sounds natural instead of the one the passage actually supports',
    },
    {
      id: 'wrong-part-of-passage',
      label: 'I matched it to the wrong part of the passage',
      diagnosis: 'not finding the exact part of the passage the sentence beginning is paraphrasing',
    },
    { id: 'ran-out-of-time', label: 'I ran out of time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],

  /* Listening. Every list below was checked against how each type really
     goes wrong in a recording (see the builder report's "For teacher
     review" table): a speaker who corrects themselves, a spelled-out word,
     a stated word limit, losing your place in a list that only plays once.
     None of it is guessed from the Reading lists, because the failure mode
     is different when the material cannot be reread. */
  'listening-sentence-completion': [
    {
      id: 'kept-first-answer',
      label: 'The speaker corrected themselves and I kept the first thing I heard',
      diagnosis: 'writing down the first detail before the speaker changed or corrected it',
    },
    {
      id: 'missed-spelling',
      label: 'I did not catch how it was spelled',
      diagnosis: 'losing the letters while a word or name was being spelled out',
    },
    {
      id: 'over-word-limit',
      label: 'I wrote more words than the limit allowed',
      diagnosis: 'not checking the stated word limit before answering',
    },
    {
      id: 'lost-place',
      label: 'I lost my place and missed the next answer',
      diagnosis: 'losing track of where the recording was among the gaps',
    },
    { id: 'too-fast', label: 'It was too fast for me to write it down', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'listening-multiple-choice': [
    {
      id: 'first-option-heard',
      label: 'I heard an option mentioned and picked it straight away',
      diagnosis: 'choosing the first option mentioned rather than waiting to hear what was actually confirmed',
    },
    {
      id: 'kept-first-answer',
      label: 'The speaker changed their mind and I kept the first thing they said',
      diagnosis: 'trusting an early statement instead of the correction that followed it',
    },
    {
      id: 'matched-wording',
      label: 'I chose it because I heard the exact words from the option',
      diagnosis: 'matching the wording of an option rather than what it actually meant',
    },
    {
      id: 'lost-place',
      label: 'I lost track of which question the recording had reached',
      diagnosis: 'losing track of where the recording was among the questions',
    },
    { id: 'too-fast', label: 'It was too fast to follow the options and the recording at once', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'listening-table-completion': [
    {
      id: 'kept-first-answer',
      label: 'The speaker corrected a detail and I kept the first version',
      diagnosis: 'writing down a detail before the speaker corrected it',
    },
    {
      id: 'missed-spelling',
      label: 'I lost letters while a name or address was being spelled',
      diagnosis: 'losing letters while something was being spelled out',
    },
    {
      id: 'over-word-limit',
      label: 'I wrote more words than the limit allowed',
      diagnosis: 'not checking the stated word or figure limit',
    },
    {
      id: 'wrong-row',
      label: 'I lost track of which row or box I was filling in',
      diagnosis: 'losing track of position inside the table or form while listening',
    },
    {
      id: 'confused-numbers',
      label: 'I mixed up two similar sounding numbers',
      diagnosis: 'confusing two similar sounding numbers, such as thirteen and thirty',
    },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'listening-matching-features': [
    {
      id: 'matched-by-name',
      label: 'I matched it by the name, not by what was said about it',
      diagnosis: "matching by an option's name rather than the description actually given",
    },
    {
      id: 'kept-first-mention',
      label: 'I chose the first option mentioned instead of waiting to hear it confirmed',
      diagnosis: 'relying on the first mention rather than what the speaker settled on',
    },
    {
      id: 'assumed-once-only',
      label: 'I assumed each option could only be used once',
      diagnosis: 'assuming each option could only be used once without checking the instructions and how many options there were',
    },
    {
      id: 'lost-place',
      label: 'I lost my place in the list while listening',
      diagnosis: 'losing track of which item the recording had reached',
    },
    { id: 'too-fast', label: 'It was too fast to match everything in time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'listening-multiple-answer': [
    {
      id: 'selected-too-early',
      label: 'I selected an option as soon as it was mentioned',
      diagnosis: 'selecting an option as soon as it was mentioned, before hearing whether it was accepted or rejected',
    },
    {
      id: 'wrong-count',
      label: 'I chose too few or too many options',
      diagnosis: 'not keeping to the number of options the question asked for',
    },
    {
      id: 'kept-rejected-option',
      label: 'The speaker rejected an option and I kept it anyway',
      diagnosis: 'keeping an option after the speaker had actually ruled it out',
    },
    {
      id: 'missed-late-mention',
      label: 'I stopped tracking once the topic seemed to move on',
      diagnosis: 'stopping tracking an option before the discussion of it was really finished',
    },
    { id: 'too-fast', label: 'It was too fast to track every option', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'listening-categorisation': [
    {
      id: 'kept-first-placement',
      label: 'The speaker moved an item to another category and I kept the first one',
      diagnosis: 'keeping the first category mentioned instead of the final placement',
    },
    {
      id: 'placed-by-word',
      label: 'I placed it by a word I recognised rather than the reason given',
      diagnosis: 'placing an item by a recognised word rather than the reason actually given for it',
    },
    {
      id: 'assumed-even-split',
      label: 'I assumed the categories should end up with an even number of items',
      diagnosis: 'forcing an even split between categories rather than following what was actually said',
    },
    {
      id: 'lost-place',
      label: 'I lost track of which item was being discussed',
      diagnosis: 'losing track of which item the recording had reached',
    },
    { id: 'too-fast', label: 'It was too fast to sort everything in time', diagnosis: '' },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
  'listening-diagram-labelling': [
    {
      id: 'confused-direction',
      label: 'I confused left and right, or another direction word',
      diagnosis: 'confusing a direction word such as left, right or opposite',
    },
    {
      id: 'missed-correction',
      label: 'The speaker changed direction or corrected a position and I kept the first one',
      diagnosis: 'keeping the first position mentioned instead of the corrected one',
    },
    {
      id: 'placed-by-object',
      label: 'I placed the label by the object named, without listening to the direction word',
      diagnosis: 'placing a label by the object named rather than the direction word that fixed its position',
    },
    {
      id: 'lost-place',
      label: 'I lost my place on the diagram partway through',
      diagnosis: 'losing track of position on the diagram after a direction change',
    },
    {
      id: 'missed-spelling',
      label: 'I lost the letters while a label was being spelled out',
      diagnosis: 'losing letters while a name was spelled out',
    },
    { id: 'guessed', label: 'I guessed', diagnosis: '' },
  ],
};

/** The longest note a student may add to their reason. Short on purpose:
    this is a sentence about their own thinking, not an essay, and it is
    stored with the evidence. */
export const MAX_REASON_NOTE_CHARS = 200;
