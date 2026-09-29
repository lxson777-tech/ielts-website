import { mountCampusLife } from './campus-life';
import '../../scrollcraft/builds/next-chapter/scrollcraft.js';

declare global {
  interface Window { ScrollCraft?: { mount: (root: HTMLElement) => unknown }; }
}

const root = document.querySelector<HTMLElement>('[data-next-chapter]');
if (root) {
  window.ScrollCraft?.mount(root);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const small = window.matchMedia('(max-width: 760px)');
  const scene = root.querySelector<HTMLElement>('[data-campus-scene]')!;
  const stage = scene.querySelector<HTMLElement>('.campus-stage')!;
  mountCampusLife(stage);
  const campusVideo = stage.querySelector<HTMLVideoElement>('[data-campus-life]');
  const back = scene.querySelector<HTMLElement>('[data-campus-back]')!;
  const front = scene.querySelector<HTMLElement>('[data-campus-front]')!;
  const copy = scene.querySelector<HTMLElement>('[data-hero-copy]')!;
  const frame = scene.querySelector<HTMLElement>('[data-hero-window]')!;
  const clamp = (n: number, low = 0, high = 1) => Math.min(high, Math.max(low, n));
  const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
  let progress = 0;
  let animation = 0;
  function paint() {
    animation = 0;
    if (reduce.matches) {
      for (const el of [back, front, copy, frame]) { el.style.removeProperty('transform'); el.style.removeProperty('opacity'); }
      campusVideo?.style.removeProperty('transform');
      copy.style.removeProperty('pointer-events');

      front.style.setProperty('--gate-angle', '86deg');
      frame.style.opacity = '1';
      frame.style.visibility = 'visible';

      frame.removeAttribute('aria-hidden');
      delete stage.dataset.scVerifyState;
      return;
    }
    const rect = scene.getBoundingClientRect();
    const travel = Math.max(1, scene.offsetHeight - stage.offsetHeight);
    const target = clamp(-rect.top / travel);
    progress += (target - progress) * .14;
    if (Math.abs(target - progress) < .0005) progress = target;
    const reveal = progress * progress * (3 - 2 * progress);
    const initialTop = parseFloat(getComputedStyle(frame).top);
    const finalTop = Math.max(95, (stage.clientHeight - frame.offsetHeight) / 2 + 20);
    const frameY = -(initialTop - finalTop) * reveal;
    back.style.transform = `translateY(${reveal * 24}px) scale(${1.10 + reveal * .025})`;
    // The motion source already fills the stage. Keep its composition and fine detail.
    if (campusVideo) campusVideo.style.transform = `scale(${1 + reveal * .025})`;
    const opening = ease((progress - .22) / .53);
    front.style.setProperty('--gate-angle', `${opening * 100}deg`);
    front.style.transform = `scale(${1 + reveal * .035})`;
    copy.style.transform = `translateY(${-reveal * 130}px)`;
    copy.style.opacity = String(1 - clamp(reveal / .43));
    const copyHidden = reveal >= .43;
    copy.style.pointerEvents = copyHidden ? 'none' : '';

    frame.style.transform = `translate(-50%, ${frameY}px)`;
    const windowOpacity = ease((progress - .49) / .33);
    frame.style.opacity = String(windowOpacity);
    frame.style.visibility = windowOpacity > 0 ? 'visible' : 'hidden';

    frame.setAttribute('aria-hidden', String(windowOpacity <= .1));
    if (stage.getBoundingClientRect().bottom > 0) {
      stage.dataset.scVerifyState = `window:${Math.round(frameY)};gate:${Math.round(opening * 100)};headline:${copy.style.opacity.slice(0,4)}`;
    } else delete stage.dataset.scVerifyState;
    if (progress !== target) animation = requestAnimationFrame(paint);
  }
  function requestPaint() { if (!animation) animation = requestAnimationFrame(paint); }
  window.addEventListener('scroll', requestPaint, { passive: true });
  window.addEventListener('resize', requestPaint, { passive: true });
  small.addEventListener('change', requestPaint);
  reduce.addEventListener('change', requestPaint);
  const sceneVisibility = new IntersectionObserver(([entry]) => {
    stage.classList.toggle('is-in-view', entry.isIntersecting);
  });
  sceneVisibility.observe(stage);
  requestPaint();

  const menu = document.querySelector<HTMLButtonElement>('.menu-toggle')!;
  const nav = document.querySelector<HTMLElement>('.chapter-nav')!;
  function closeMenu(restoreFocus = false) {
    nav.classList.remove('is-open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open menu');
    if (restoreFocus) menu.focus();
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', open); menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') closeMenu(true); });
  document.addEventListener('click', e => { if (!nav.contains(e.target as Node) && !menu.contains(e.target as Node)) closeMenu(); });

  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-skill-tab]'));
  function selectTab(tab: HTMLButtonElement, focus = false) {
    const selectedIndex=tabs.indexOf(tab);
    tabs.forEach((item,index) => {
      const slot=(index-selectedIndex+tabs.length)%tabs.length;
      item.dataset.position=String(slot===tabs.length-1?-1:slot);
      const active = item === tab;
      item.setAttribute('aria-selected', String(active)); item.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(item.getAttribute('aria-controls')!)!;
      panel.hidden = !active;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('mouseenter', () => { if (matchMedia('(hover: hover) and (pointer: fine)').matches) selectTab(tab); });
    tab.addEventListener('keydown', e => {
      const target = e.key === 'ArrowRight' ? (index + 1) % tabs.length : e.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
      if (target >= 0) { e.preventDefault(); selectTab(tabs[target], true); }
    });
  });

  const previews=Array.from(root.querySelectorAll<HTMLButtonElement>('[data-speaking-preview]'));
  function selectPreview(tab:HTMLButtonElement){
   previews.forEach(item=>{const active=item===tab;item.setAttribute('aria-selected',String(active));item.tabIndex=active?0:-1;document.getElementById(item.getAttribute('aria-controls')!)!.hidden=!active;});
  }
  previews.forEach((tab,index)=>{
   tab.addEventListener('click',()=>selectPreview(tab));
   tab.addEventListener('keydown',event=>{
    const next=event.key==='ArrowRight'?(index+1)%previews.length:event.key==='ArrowLeft'?(index+previews.length-1)%previews.length:event.key==='Home'?0:event.key==='End'?previews.length-1:-1;
    if(next>=0){event.preventDefault();selectPreview(previews[next]);previews[next].focus();}
   });
  });
}
