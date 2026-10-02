import {createJourneyShader} from './journey-shader';
import {journeySkill, journeyLessons, journeyQuery, validJourney, JOURNEY_LANDING, type JourneyAnswers} from '../lib/journey-plan';
import {salesText, type SalesKey} from '../marketing/sales-copy';
import {salesLocale, SALES_LOCALE_EVENT} from '../marketing/sales-i18n';
/* Every "Create a free account" link on the page carries the four answers
   once all are chosen. They ride inside the sign-up page's own `next`
   (`/sign-up?next=/dashboard?journey=1&band=...`), which sign-up hands to the
   profile page and the profile page follows once the details are given, so
   the answers arrive on the dashboard after the whole round trip, where
   questionnaireFromSearch (src/lib/trial/offer.ts) reads them. The same
   answers also stay in this tab's session storage (`ielts.journey.draft.v1`,
   below), as they always have. Sign-in links are left alone: a returning
   student already has a plan. */
function carryAnswersToSignUp(answers:Record<string,string>){
 const complete=validJourney(answers);
 document.querySelectorAll<HTMLAnchorElement>('a[data-signup-link]').forEach(link=>{
  const plain=link.dataset.signupHref??(link.dataset.signupHref=link.getAttribute('href')!.split('?')[0]);
  link.setAttribute('href',complete?`${plain}?next=${encodeURIComponent(JOURNEY_LANDING+journeyQuery(answers as JourneyAnswers))}`:plain);
 });
}
const root=document.querySelector<HTMLElement>('[data-question-journey]');
if(root){
 const names=['band','skill','focus','time'] as const;
 const answers:Record<string,string>={};
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const setShaderMotion=createJourneyShader(root.querySelector<HTMLCanvasElement>('.journey-shader')!);
 let inView=false;
 const updateMotion=()=>{
  setShaderMotion(inView&&!reduce.matches&&!document.hidden);
 };
 reduce.addEventListener('change',updateMotion);
 document.addEventListener('visibilitychange',updateMotion);
 new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;updateMotion();}).observe(root);
 updateMotion();
 // Every sentence below is written whole in both languages (sales-copy.ts and journey-plan.ts).
 const say=(key:SalesKey,vars?:Record<string,string|number>)=>salesText(key,salesLocale(),vars);
 const panels=Array.from(root.querySelectorAll<HTMLElement>('[data-question]'));
 const result=root.querySelector<HTMLElement>('.journey-result-wrap')!;
 let advanceTimer:number|undefined;
 let scrollFrame=0;
 function cancelJourneyScroll(){
  window.clearTimeout(advanceTimer);
  cancelAnimationFrame(scrollFrame);
 }
 // Give control back immediately if the visitor scrolls or interacts mid-glide.
 window.addEventListener('wheel',cancelJourneyScroll,{passive:true});
 window.addEventListener('touchstart',cancelJourneyScroll,{passive:true});
 window.addEventListener('pointerdown',cancelJourneyScroll,{passive:true});
 window.addEventListener('keydown',event=>{
  if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End','Escape','Tab',' '].includes(event.key)) cancelJourneyScroll();
 });
 reduce.addEventListener('change',cancelJourneyScroll);
 function show(index:number){
  cancelJourneyScroll();
  const target=index===4?result:panels[index];
  const heading=target.querySelector<HTMLElement>('.journey-question-title')||target.querySelector<HTMLElement>('#journey-result')!;
  const start=window.scrollY;
  const margin=parseFloat(getComputedStyle(target).scrollMarginTop)||0;
  const end=Math.max(0,Math.min(start+target.getBoundingClientRect().top-margin,document.documentElement.scrollHeight-window.innerHeight));
  if(reduce.matches || Math.abs(end-start)<2){
   window.scrollTo({top:end,behavior:'instant'});
   heading.focus({preventScroll:true});
   return;
  }
  // Native smooth scrolling has browser-dependent timing. Use a consistent slow glide.
  const duration=1450;
  const began=performance.now();
  const tick=(now:number)=>{
   const progress=Math.min(1,(now-began)/duration);
   const eased=progress*progress*progress*(progress*(progress*6-15)+10);
   window.scrollTo({top:start+(end-start)*eased,behavior:'instant'});
   if(progress<1) scrollFrame=requestAnimationFrame(tick);
   else heading.focus({preventScroll:true});
  };
  scrollFrame=requestAnimationFrame(tick);
 }
 function render(){
  for(const [i,name] of names.entries()){
   const input=root!.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`);
   const label=input?.closest('label')?.querySelector('b')?.textContent;
   root!.querySelector(`[data-answer-chip="${name}"]`)!.textContent=label||'';
   root!.querySelector<HTMLButtonElement>(`[data-edit-step="${i}"]`)!.hidden=!answers[name];
  }
  const count=names.filter(n=>answers[n]).length;
  const ready=count===4;
  carryAnswersToSignUp(answers);
  (root!.querySelector('[data-plan-card]') as HTMLElement).hidden=!ready;
  (root!.querySelector('[data-plan-placeholder]') as HTMLElement).hidden=ready;
  if(!ready){
   root!.querySelector('#journey-result-title')!.textContent=say('journey.result.title');
   root!.querySelector('[data-result-description]')!.textContent=say('journey.progress',{count});
   return;
  }
  const locale=salesLocale();
  // The suggested lessons are course content, which has no Kazakh: a Kazakh
  // reader gets their Russian titles (Kazakh falls back to Russian).
  const content=locale==='en'?'en':'ru';
  const skill=journeySkill(answers.skill,content),time=Number(answers.time);
  // "Start with speaking" in English, "Начните с Speaking" in Russian and Kazakh: the paper name stays English there.
  const skillInSentence=locale==='en'?skill.name.toLowerCase():skill.name;
  root!.querySelector('#journey-result-title')!.textContent=say('journey.plan.title',{band:answers.band==='8'?'8.0+':Number(answers.band).toFixed(1)});
  root!.querySelector('[data-plan-label]')!.textContent=say('journey.plan.label',{skill:skill.name,time});
  root!.querySelector('[data-result-description]')!.textContent=say('journey.plan.lead',{skill:skillInSentence,focus:say(answers.focus==='method'?'journey.plan.help.method':'journey.plan.help.confidence')});
  // Two free lessons, each with the one thing it helps with.
  const list=root!.querySelector('[data-plan-lessons]')!;
  list.replaceChildren(...journeyLessons(answers as JourneyAnswers,content).map(lesson=>{
   const li=document.createElement('li');
   li.dataset.lessonKey=lesson.key;
   const tag=document.createElement('span');tag.className='plan-access is-free';tag.dataset.planAccess='free';tag.textContent=say('journey.plan.free');
   const heading=document.createElement('h3');heading.textContent=lesson.title;
   const detail=document.createElement('p');detail.textContent=lesson.helps;
   li.append(tag,heading,detail);return li;
  }));
 }
 // Keep this lightweight draft on this tab only, without changing an existing course plan.
 const storageKey='ielts.journey.draft.v1';
 try {
  const saved=JSON.parse(sessionStorage.getItem(storageKey)||'{}');
  root.querySelectorAll<HTMLInputElement>('input[type=radio]').forEach(input=>{
   if(saved[input.name]===input.value){input.checked=true;answers[input.name]=input.value;}
  });
 } catch { /* Private browsing or blocked storage must not prevent the journey. */ }
 root.querySelectorAll<HTMLInputElement>('input[type=radio]').forEach(input=>{
  const choose=()=>{
   answers[input.name]=input.value;
   try {sessionStorage.setItem(storageKey,JSON.stringify(answers));} catch { /* The plan still works in memory. */ }
   render();
   window.clearTimeout(advanceTimer);
   // Briefly show the selected answer before scrolling. Also supports choosing it again.
   advanceTimer=window.setTimeout(()=>{
    const index=names.indexOf(input.name as typeof names[number]);
    const missing=names.findIndex(n=>!answers[n]);
    show(index<3?index+1:missing>=0?missing:4);
   },reduce.matches?0:300);
  };
  input.addEventListener('change',choose);
  input.addEventListener('click',choose);
 });
 root.querySelectorAll<HTMLButtonElement>('[data-edit-step]').forEach(button=>button.addEventListener('click',()=>show(Number(button.dataset.editStep))));
 root.querySelector('[data-plan-complete]')!.addEventListener('click',event=>{event.preventDefault();show(Math.max(0,names.findIndex(n=>!answers[n])));});
 root.querySelectorAll<HTMLElement>('[data-journey-interactive]').forEach(el=>el.hidden=false);
 // Every question remains in document flow. Scrolling, not answer replacement, moves the story.
 const reveal=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
   if(!entry.isIntersecting)return;
   if(!reduce.matches) (entry.target as HTMLElement).animate([
    {opacity:.75},{opacity:1}
   ],{duration:650,easing:'cubic-bezier(.2,.7,.2,1)'});
   reveal.unobserve(entry.target);
  });
 },{threshold:.18});
 panels.forEach(panel=>reveal.observe(panel));
 reveal.observe(result);
 render();
 // The visitor switched language: rewrite the plan (the answer chips read the translated option labels).
 document.addEventListener(SALES_LOCALE_EVENT,()=>render());
}
