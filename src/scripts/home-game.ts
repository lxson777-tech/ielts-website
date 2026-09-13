import { applyWalkPose } from '../lib/home/walk-gait';

const SKILL_STATES = ['read', 'listen', 'write', 'speak', 'celebrate'];
const TARGET_KEY = 'ielts.ez.targetBand';

export function initHomeStory() {
  const root = document.querySelector<HTMLElement>('[data-scroll-story]');
  const story = root?.querySelector<HTMLElement>('.skills-story');
  if (!root || !story || root.dataset.ready === 'true') return;
  root.dataset.ready = 'true';

  const previous = (window as Window & { __homeStory?: AbortController }).__homeStory;
  previous?.abort();
  const controller = new AbortController();
  (window as Window & { __homeStory?: AbortController }).__homeStory = controller;
  const { signal } = controller;
  const sections = Array.from(story.querySelectorAll<HTMLElement>('[data-road-section]'));
  const stops = Array.from(story.querySelectorAll<HTMLButtonElement>('[data-story-stop]'));
  const traveller = story.querySelector<HTMLElement>('[data-story-traveller]');
  const path = story.querySelector<SVGPathElement>('[data-story-path]');
  const road = story.querySelector<SVGSVGElement>('.story-road-svg');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const heroScene = root.querySelector<HTMLElement>('.hero-coach-scene');
  let fractions: number[] = [];
  let frame = 0;
  let lastPosition = 0;
  let lastFacing: 'left' | 'right' = 'right';

  const bands = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-band]'));
  const bandFeedback = root.querySelector<HTMLElement>('[data-band-feedback]');
  const setBand = (value: string) => {
    const safe = ['6.5', '7', '7.5', '8'].includes(value) ? value : '7';
    try { localStorage.setItem(TARGET_KEY, safe); } catch { /* Storage may be blocked. */ }
    bands.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.band === safe)));
    const selectedBandIndex = bands.findIndex((button) => button.dataset.band === safe);
    bands[0]?.parentElement?.style.setProperty('--band-index', String(Math.max(0, selectedBandIndex)));
    root.querySelectorAll<HTMLElement>('[data-target-label]').forEach((label) => { label.textContent = Number(safe).toFixed(1); });
    if (bandFeedback) {
      bandFeedback.textContent = `Band ${Number(safe).toFixed(1)} selected`;
      bandFeedback.dataset.updated = 'true';
      setTimeout(() => { delete bandFeedback.dataset.updated; }, 360);
    }
  };
  let savedBand = '7';
  try { savedBand = localStorage.getItem(TARGET_KEY) || savedBand; } catch { /* Keep the default target. */ }
  setBand(savedBand);
  bands.forEach((button) => button.addEventListener('click', () => setBand(button.dataset.band || '7'), { signal }));

  const skillStack = root.querySelector<HTMLElement>('[data-skill-stack]');
  const skillCards = Array.from(root.querySelectorAll<HTMLElement>('[data-skill-card]'));
  const stackIndicators = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-stack-indicator]'));
  if (skillStack && skillCards.length) {
    let activeCard = 0;
    let cycleTimer = 0;
    let stackVisible = true;

    const applySlots = () => {
      skillCards.forEach((card, index) => {
        const offset = (index - activeCard + skillCards.length) % skillCards.length;
        const position = offset === 0 ? 'active' : offset === 1 ? 'next' : offset === 2 ? 'behind' : 'retiring';
        card.dataset.stackPosition = position;
        card.dataset.active = String(offset === 0);
        card.setAttribute('aria-hidden', String(offset !== 0));
      });
      stackIndicators.forEach((indicator, index) => indicator.setAttribute('aria-current', String(index === activeCard)));
      skillStack.dataset.activeSkill = String(activeCard);
    };

    const renderCard = (next: number) => {
      const destination = (next + skillCards.length) % skillCards.length;
      if (destination === activeCard || skillStack.dataset.animating === 'true') return;
      if (reducedMotion) {
        activeCard = destination;
        applySlots();
        return;
      }

      const outgoing = skillCards[activeCard];
      const incoming = skillCards[destination];
      activeCard = destination;
      skillStack.dataset.animating = 'true';
      skillCards.forEach((card, index) => {
        if (card === outgoing || card === incoming) return;
        const offset = (index - activeCard + skillCards.length) % skillCards.length;
        card.dataset.stackPosition = offset === 1 ? 'next' : offset === 2 ? 'behind' : 'retiring';
      });
      outgoing.classList.add('is-deck-outgoing');
      incoming.classList.add('is-deck-incoming');
      incoming.setAttribute('aria-hidden', 'false');
      stackIndicators.forEach((indicator, index) => indicator.setAttribute('aria-current', String(index === activeCard)));
      skillStack.dataset.activeSkill = String(activeCard);
      outgoing.addEventListener('animationend', () => {
        outgoing.classList.remove('is-deck-outgoing');
        incoming.classList.remove('is-deck-incoming');
        skillStack.dataset.animating = 'false';
        applySlots();
        scheduleCycle(3000);
      }, { once: true, signal });
    };

    const clearCycle = () => { if (cycleTimer) window.clearTimeout(cycleTimer); cycleTimer = 0; };
    const scheduleCycle = (delay = 3800) => {
      clearCycle();
      const canPlay = !reducedMotion && stackVisible && !document.hidden;
      skillStack.dataset.autoplay = String(canPlay);
      if (canPlay) {
        cycleTimer = window.setTimeout(() => renderCard(activeCard + 1), delay);
      }
    };

    stackIndicators.forEach((indicator, index) => indicator.addEventListener('click', () => {
      if (index === activeCard && skillStack.dataset.animating !== 'true') {
        scheduleCycle();
        return;
      }
      clearCycle();
      renderCard(index);
      if (reducedMotion) scheduleCycle();
    }, { signal }));
    if ('IntersectionObserver' in window) {
      const stackObserver = new IntersectionObserver(([entry]) => {
        if (stackVisible !== entry.isIntersecting) {
          stackVisible = entry.isIntersecting;
          scheduleCycle();
        }
      }, { threshold: .25 });
      stackObserver.observe(skillStack);
      signal.addEventListener('abort', () => stackObserver.disconnect(), { once: true });
    }
    document.addEventListener('visibilitychange', () => scheduleCycle(), { signal });
    applySlots();
    scheduleCycle(1000);
    signal.addEventListener('abort', clearCycle, { once: true });
  }

  const placeTraveller = (fraction: number) => {
    if (!path || !traveller) return;
    const safe = Math.max(0, Math.min(1, fraction));
    const totalLength = path.getTotalLength();
    const distance = totalLength * safe;
    const point = path.getPointAtLength(distance);
    traveller.style.setProperty('--story-x', `${point.x}px`);
    traveller.style.setProperty('--story-y', `${point.y}px`);
    traveller.dataset.pathPosition = safe.toFixed(5);

    let nearest = 0;
    fractions.forEach((stop, index) => {
      if (Math.abs(stop - safe) < Math.abs(fractions[nearest] - safe)) nearest = index;
    });
    const atStop = Math.abs(fractions[nearest] - safe) < .025;
    const movingForward = safe >= lastPosition;
    const tangentOffset = movingForward ? 3 : -3;
    const tangentPoint = path.getPointAtLength(Math.max(0, Math.min(totalLength, distance + tangentOffset)));
    const tangentX = tangentPoint.x - point.x;
    if (Math.abs(tangentX) > .2) lastFacing = tangentX >= 0 ? 'right' : 'left';
    else if (Math.abs(safe - lastPosition) > .0001) lastFacing = movingForward ? 'right' : 'left';
    traveller.dataset.facing = atStop ? (nearest % 2 === 0 ? 'right' : 'left') : lastFacing;
    traveller.dataset.state = atStop ? SKILL_STATES[nearest] : (reducedMotion ? SKILL_STATES[nearest] : 'walk');
    const rawPhase = (distance / 56) % 1;
    const walkPhase = movingForward ? rawPhase : (1 - rawPhase) % 1;
    traveller.style.setProperty('--walk-phase', walkPhase.toFixed(4));
    applyWalkPose(traveller, walkPhase);
    traveller.dataset.moving = String(!atStop && !reducedMotion);
    root.dataset.charState = traveller.dataset.state;
    root.dataset.currentStop = atStop ? String(nearest) : 'between';
    stops.forEach((stop, index) => stop.setAttribute('aria-current', atStop && index === nearest ? 'step' : 'false'));
    lastPosition = safe;
  };

  const rebuildRoad = () => {
    if (!path || !road || !stops.length) return;
    const storyRect = story.getBoundingClientRect();
    road.setAttribute('viewBox', `0 0 ${storyRect.width} ${storyRect.height}`);
    const points = stops.map((stop) => {
      const rect = stop.getBoundingClientRect();
      return { x: rect.left + rect.width / 2 - storyRect.left, y: rect.top + rect.height / 2 - storyRect.top };
    });
    let d = `M ${points[0].x} ${points[0].y}`;
    const segments: string[] = [];
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1];
      const b = points[index];
      const bend = index % 2 ? Math.min(80, storyRect.width * .07) : -Math.min(80, storyRect.width * .07);
      const middle = (a.y + b.y) / 2;
      const curve = `C ${a.x + bend} ${middle}, ${b.x - bend} ${middle}, ${b.x} ${b.y}`;
      d += ` ${curve}`;
      segments.push(`M ${a.x} ${a.y} ${curve}`);
    }
    path.setAttribute('d', d);
    story.querySelector<SVGPathElement>('[data-story-path-copy]')?.setAttribute('d', d);
    const lengths = segments.map((segment) => {
      const probe = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      probe.setAttribute('d', segment);
      return probe.getTotalLength();
    });
    const total = lengths.reduce((sum, length) => sum + length, 0);
    let cumulative = 0;
    fractions = [0, ...lengths.map((length) => (cumulative += length) / total)];
    updateFromScroll();
  };

  const updateFromScroll = () => {
    frame = 0;
    if (heroScene && !reducedMotion) {
      const progress = Math.max(0, Math.min(1, scrollY / Math.max(innerHeight, 1)));
      heroScene.style.setProperty('--hero-bg-y', `${progress * 10}px`);
      heroScene.style.setProperty('--hero-subject-y', `${progress * 22}px`);
      heroScene.style.setProperty('--hero-note-y', `${progress * 34}px`);
      const settle = Math.max(0, Math.min(1, scrollY / 260));
      heroScene.style.setProperty('--hero-answer-x', `${-14 * (1 - settle)}px`);
      heroScene.style.setProperty('--hero-reason-x', `${12 * (1 - settle)}px`);
      heroScene.style.setProperty('--hero-example-x', `${-7 * (1 - settle)}px`);
      heroScene.style.setProperty('--hero-fan-angle', `${2.2 * (1 - settle)}deg`);
      heroScene.style.setProperty('--hero-fan-angle-negative', `${-2.2 * (1 - settle)}deg`);
      heroScene.style.setProperty('--hero-fan-angle-half', `${-1.1 * (1 - settle)}deg`);
      heroScene.style.setProperty('--hero-highlight', `${Math.round(settle * 100)}%`);
      heroScene.style.setProperty('--hero-settle', settle.toFixed(3));
    }
    if (!fractions.length) return;
    const anchor = scrollY + innerHeight * .5;
    const centers = stops.map((stop) => {
      const rect = stop.getBoundingClientRect();
      return scrollY + rect.top + rect.height / 2;
    });
    let fraction = fractions[0];
    if (anchor >= centers[centers.length - 1]) fraction = fractions[fractions.length - 1];
    else if (anchor > centers[0]) {
      const segment = centers.findIndex((center) => center > anchor) - 1;
      const progress = (anchor - centers[segment]) / (centers[segment + 1] - centers[segment]);
      fraction = fractions[segment] + (fractions[segment + 1] - fractions[segment]) * progress;
    }
    placeTraveller(fraction);
  };

  const requestUpdate = () => {
    if (!frame) frame = requestAnimationFrame(updateFromScroll);
  };

  if (reducedMotion || !('IntersectionObserver' in window)) {
    sections.forEach((section) => section.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    }, { threshold: .24, rootMargin: '0px 0px -8%' });
    sections.forEach((section) => observer.observe(section));
    signal.addEventListener('abort', () => observer.disconnect(), { once: true });
  }

  stops.forEach((stop, index) => stop.addEventListener('click', () => {
    sections[index].classList.add('is-visible');
    const rect = stop.getBoundingClientRect();
    const destination = scrollY + rect.top + rect.height / 2 - innerHeight * .5;
    scrollTo({ top: destination, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, { signal }));
  addEventListener('scroll', requestUpdate, { passive: true, signal });
  addEventListener('resize', rebuildRoad, { passive: true, signal });
  const resize = new ResizeObserver(rebuildRoad);
  resize.observe(story);
  signal.addEventListener('abort', () => { resize.disconnect(); cancelAnimationFrame(frame); }, { once: true });
  document.addEventListener('astro:before-swap', () => controller.abort(), { once: true, signal });
  rebuildRoad();
  updateFromScroll();
}

initHomeStory();
document.addEventListener('astro:page-load', initHomeStory);
