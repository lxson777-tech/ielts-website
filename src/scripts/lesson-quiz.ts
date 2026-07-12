/* Port of the legacy assets/quiz.js — runs against the migrated lesson
   HTML, which keeps its original markup hooks (data-quiz, .quiz-item…). */

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
        item.classList.remove('pq-pop', 'pq-shake');
        void item.offsetWidth; // restart the animation if this is a re-check
        item.classList.add(ok ? 'pq-pop' : 'pq-shake');
        if (ok) correct++;
      });
      const score = container.querySelector<HTMLElement>('.quiz-score');
      if (score) {
        score.textContent = `${correct} / ${items.length} correct`;
        score.hidden = false;
        score.classList.remove('pq-in');
        void score.offsetWidth;
        score.classList.add('pq-in');
      }
    });
  });
}

