/* Port of the legacy assets/quiz.js — runs against the migrated lesson
   HTML, which keeps its original markup hooks (data-quiz, .quiz-item…). */

import { pickDistractors, type VocabWord } from './vocab-quiz';

export type { VocabWord };

export function initReadingQuiz(): void {
  document.querySelectorAll<HTMLElement>('[data-quiz="reading"]').forEach((container) => {
    const btn = container.querySelector<HTMLButtonElement>('.quiz-check-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const items = container.querySelectorAll<HTMLElement>('.quiz-item[data-answer]');
      let correct = 0;
      items.forEach((item) => {
        const expected = (item.dataset.answer ?? '').toLowerCase().trim();
        const ctrl = item.querySelector('select');
        if (!ctrl || ctrl.value === '') return;
        const ok = ctrl.value.toLowerCase().trim() === expected;
        item.classList.toggle('quiz-correct', ok);
        item.classList.toggle('quiz-wrong', !ok);
        if (ok) correct++;
      });
      const score = container.querySelector<HTMLElement>('.quiz-score');
      if (score) {
        score.textContent = `${correct} / ${items.length} correct`;
        score.hidden = false;
      }
    });
  });
}

export function initVocabQuiz(words: VocabWord[]): void {
  const container = document.querySelector<HTMLElement>('[data-quiz="vocab"]');
  if (!container || words.length < 4) return;

  const TOTAL = Math.min(8, words.length);
  const pool = [...words].sort(() => Math.random() - 0.5).slice(0, TOTAL);
  let current = 0;
  let answered = 0;

  const wordEl = container.querySelector<HTMLElement>('.vocab-quiz-word');
  const progressEl = container.querySelector<HTMLElement>('.vocab-quiz-progress');
  const optsEl = container.querySelector<HTMLElement>('.vocab-quiz-opts');
  const nextBtn = container.querySelector<HTMLButtonElement>('.vocab-quiz-next');
  const finalEl = container.querySelector<HTMLElement>('.vocab-quiz-final');
  if (!optsEl) return;

  function render(): void {
    if (current >= TOTAL) {
      optsEl!.innerHTML = '';
      if (nextBtn) nextBtn.style.display = 'none';
      if (finalEl) {
        finalEl.textContent = `Final score: ${answered} / ${TOTAL}`;
        finalEl.style.display = 'block';
      }
      return;
    }
    const w = pool[current]!;
    if (wordEl) wordEl.textContent = w.word;
    if (progressEl) progressEl.textContent = `Question ${current + 1} of ${TOTAL}`;

    const choices = [...pickDistractors(words, w, 3), w].sort(() => Math.random() - 0.5);
    optsEl!.innerHTML = '';
    choices.forEach((c) => {
      const btn = document.createElement('button');
      btn.className = 'vocab-quiz-opt';
      btn.textContent = c.def;
      btn.addEventListener('click', () => {
        const all = optsEl!.querySelectorAll<HTMLButtonElement>('.vocab-quiz-opt');
        all.forEach((b) => (b.disabled = true));
        if (c.word === w.word) {
          btn.classList.add('correct');
          answered++;
        } else {
          btn.classList.add('wrong');
          all.forEach((b) => {
            if (b.textContent === w.def) b.classList.add('correct');
          });
        }
        if (nextBtn) nextBtn.style.display = 'inline-block';
      });
      optsEl!.appendChild(btn);
    });
    if (nextBtn) nextBtn.style.display = 'none';
  }

  nextBtn?.addEventListener('click', () => {
    current++;
    render();
  });

  render();
}
