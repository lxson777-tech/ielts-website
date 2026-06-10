/* ── Reading quiz ── */
(function () {
  document.querySelectorAll('[data-quiz="reading"]').forEach(function (container) {
    var btn = container.querySelector('.quiz-check-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var items = container.querySelectorAll('.quiz-item[data-answer]');
      var correct = 0;
      items.forEach(function (item) {
        var expected = item.dataset.answer.toLowerCase().trim();
        var ctrl = item.querySelector('select');
        if (!ctrl || ctrl.value === '') return;
        var given = ctrl.value.toLowerCase().trim();
        var ok = given === expected;
        item.classList.toggle('quiz-correct', ok);
        item.classList.toggle('quiz-wrong', !ok);
        if (ok) correct++;
      });
      var score = container.querySelector('.quiz-score');
      if (score) { score.textContent = correct + ' / ' + items.length + ' correct'; score.hidden = false; }
    });
  });
})();

/* ── Vocabulary quiz ── */
(function () {
  var container = document.querySelector('[data-quiz="vocab"]');
  if (!container) return;

  var words = window.VOCAB_WORDS || [];
  if (words.length < 4) return;

  var TOTAL = Math.min(8, words.length);
  var pool = words.slice().sort(function () { return Math.random() - 0.5; }).slice(0, TOTAL);
  var current = 0;
  var answered = 0;

  var wordEl    = container.querySelector('.vocab-quiz-word');
  var progressEl = container.querySelector('.vocab-quiz-progress');
  var optsEl    = container.querySelector('.vocab-quiz-opts');
  var nextBtn   = container.querySelector('.vocab-quiz-next');
  var finalEl   = container.querySelector('.vocab-quiz-final');

  function getDistractors(correct) {
    var pool2 = words.filter(function (w) { return w.word !== correct.word; });
    pool2.sort(function () { return Math.random() - 0.5; });
    return pool2.slice(0, 3);
  }

  function render() {
    if (current >= TOTAL) {
      optsEl.innerHTML = '';
      if (nextBtn) nextBtn.style.display = 'none';
      if (finalEl) { finalEl.textContent = 'Final score: ' + answered + ' / ' + TOTAL; finalEl.style.display = 'block'; }
      return;
    }
    var w = pool[current];
    if (wordEl) wordEl.textContent = w.word;
    if (progressEl) progressEl.textContent = 'Question ' + (current + 1) + ' of ' + TOTAL;

    var choices = getDistractors(w).concat(w);
    choices.sort(function () { return Math.random() - 0.5; });

    optsEl.innerHTML = '';
    choices.forEach(function (c) {
      var btn = document.createElement('button');
      btn.className = 'vocab-quiz-opt';
      btn.textContent = c.def;
      btn.addEventListener('click', function () {
        var all = optsEl.querySelectorAll('.vocab-quiz-opt');
        all.forEach(function (b) { b.disabled = true; });
        if (c.word === w.word) {
          btn.classList.add('correct');
          answered++;
        } else {
          btn.classList.add('wrong');
          all.forEach(function (b) { if (b.textContent === w.def) b.classList.add('correct'); });
        }
        if (nextBtn) nextBtn.style.display = 'inline-block';
      });
      optsEl.appendChild(btn);
    });
    if (nextBtn) nextBtn.style.display = 'none';
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function () {
      current++;
      render();
    });
  }

  render();
})();
