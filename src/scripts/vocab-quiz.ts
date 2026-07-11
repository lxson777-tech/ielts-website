/* Shared "choose the right meaning" quiz, usable from anywhere on the
   site. No overlay/modal — each trigger owns its own inline panel that
   expands in place (like an accordion) when clicked, and collapses on
   a second click. See <VocabQuizTrigger /> for the common case, and
   LessonLayout.astro for the floating hero word, which points its
   `aria-controls` at a panel placed in the static hero content instead
   of a panel next to itself (since the word itself keeps moving). */

export interface VocabWord {
  word: string;
  def: string;
}

export function pickDistractors(words: VocabWord[], correct: VocabWord, count: number): VocabWord[] {
  return words
    .filter((w) => w.word !== correct.word)
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

function renderQuiz(panel: HTMLElement, words: VocabWord[], word?: string): void {
  const wordEl = panel.querySelector<HTMLElement>('.vocab-quiz-panel-word');
  const optsEl = panel.querySelector<HTMLElement>('.vocab-quiz-panel-opts');
  if (!wordEl || !optsEl || words.length < 4) return;

  const w = (word ? words.find((x) => x.word === word) : undefined) ?? words[Math.floor(Math.random() * words.length)]!;
  wordEl.textContent = w.word;

  const choices = [...pickDistractors(words, w, 3), w].sort(() => Math.random() - 0.5);
  optsEl.innerHTML = '';
  choices.forEach((c) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vocab-quiz-panel-opt';
    btn.textContent = c.def;
    btn.addEventListener('click', () => {
      const all = optsEl.querySelectorAll<HTMLButtonElement>('.vocab-quiz-panel-opt');
      all.forEach((b) => (b.disabled = true));
      if (c.word === w.word) {
        btn.classList.add('correct', 'pq-pop');
      } else {
        btn.classList.add('wrong', 'pq-shake');
        all.forEach((b) => {
          if (b.textContent === w.def) b.classList.add('correct', 'pq-pop');
        });
      }
    });
    optsEl.appendChild(btn);
  });
}

/** Call once per page (from <VocabQuizInit />). Wires every
 *  [data-vocab-quiz-trigger] already in the DOM: each toggles its own
 *  panel (found via aria-controls, falling back to the next sibling),
 *  re-rendering a fresh word + choices on every open. */
export function initVocabQuizTriggers(words: VocabWord[]): void {
  document.querySelectorAll<HTMLElement>('[data-vocab-quiz-trigger]').forEach((trigger) => {
    const panelId = trigger.getAttribute('aria-controls');
    const panel = (panelId ? document.getElementById(panelId) : trigger.nextElementSibling) as HTMLElement | null;
    if (!panel) return;

    trigger.addEventListener('click', () => {
      const isOpen = !panel.hidden;
      if (isOpen) {
        panel.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        return;
      }
      const word = trigger.dataset.vocabWord || trigger.textContent?.trim();
      renderQuiz(panel, words, word);
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
    });
  });
}
