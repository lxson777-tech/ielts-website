// Animate <details> close — CSS handles the open direction, JS handles close
document.addEventListener('click', function (e) {
  const summary = e.target.closest('summary');
  if (!summary) return;
  const details = summary.closest('details');
  if (!details || !details.open) return;

  e.preventDefault();

  const content = details.querySelector(':scope > :not(summary)');
  if (!content) return;

  content.style.animation = 'answersClose 0.22s cubic-bezier(0.2,0,0.2,1) forwards';
  content.addEventListener('animationend', () => {
    details.removeAttribute('open');
    content.style.animation = '';
  }, { once: true });
});

// Back to top button
(function () {
  const btn = document.createElement('button');
  btn.id = 'back-to-top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = '&#8679;';
  document.body.appendChild(btn);

  window.addEventListener('scroll', function () {
    btn.classList.toggle('visible', window.scrollY > 300);
  }, { passive: true });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// Scroll progress bar
(function () {
  const bar = document.createElement('div');
  bar.id = 'scroll-progress';
  document.body.appendChild(bar);
  function update() {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

// Active nav link highlighting via IntersectionObserver
(function () {
  // Exclude footer nav links — only highlight in-page and site navs
  const links = Array.from(document.querySelectorAll('nav a[href^="#"]'))
    .filter(a => !a.closest('footer'));
  if (!links.length) return;
  const ids = Array.from(links).map(a => a.getAttribute('href').slice(1));
  const sections = ids.map(id => document.getElementById(id)).filter(Boolean);
  if (!sections.length) return;
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting)
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 });
  sections.forEach(s => obs.observe(s));
})();
