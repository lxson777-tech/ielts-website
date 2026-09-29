import {createJourneyShader} from './journey-shader';
import {journeySkills as skills, journeySteps, journeyDays, trialQuery, validJourney, type JourneyAnswers} from '../lib/journey-plan';
/* Every "start your free trial" link on the page carries the four answers
   once all are chosen, so the trial page can offer them as a suggested
   starting point (src/lib/trial/offer.ts, questionnaireFromSearch). */
function carryAnswersToTrial(answers:Record<string,string>){
 const complete=validJourney(answers);
 document.querySelectorAll<HTMLAnchorElement>('a[data-trial-link]').forEach(link=>{
  const plain=link.dataset.trialHref??(link.dataset.trialHref=link.getAttribute('href')!.split('?')[0]);
  link.setAttribute('href',complete?`${plain}${trialQuery(answers as JourneyAnswers)}`:plain);
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
 const labels:Record<string,string>={method:'A clear method',confidence:'More confident practice'};
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
  carryAnswersToTrial(answers);
  (root!.querySelector('[data-plan-card]') as HTMLElement).hidden=!ready;
  (root!.querySelector('[data-plan-placeholder]') as HTMLElement).hidden=ready;
  if(!ready){
   root!.querySelector('#journey-result-title')!.textContent='Make your goal a daily habit.';
   root!.querySelector('[data-result-description]')!.textContent=`${count} of 4 choices made. Finish the questions to see your suggested plan.`;
   return;
  }
  const skill=skills[answers.skill],time=Number(answers.time),method=answers.focus==='method';
  root!.querySelector('#journey-result-title')!.textContent=`Your Band ${answers.band==='8'?'8.0+':Number(answers.band).toFixed(1)} goal. Your first 3 days.`;
  root!.querySelector('[data-result-description]')!.textContent=`Start with ${skill.name.toLowerCase()}, the section you want most help with. Set aside ${time} minutes each day. Learn one method, practise it, then try a fresh task.`;
  root!.querySelector('[data-plan-label]')!.textContent=`${skill.name} / ${time} minutes a day`;
  root!.querySelector('[data-plan-title]')!.textContent=labels[answers.focus];
  const days=journeyDays(answers as JourneyAnswers);
  const routine=journeySteps(answers as JourneyAnswers);
  root!.querySelector<HTMLTextAreaElement>('[data-copy-plan]')!.value=`IELTS is EZ: suggested three-day plan\nTarget Band ${answers.band}, ${skill.name}, ${time} minutes daily\n\n${days.map(day=>`Day ${day.day}: ${day.title} (${day.minutes} min)\n${day.text}\nTake away: ${day.outcome}`).join('\n\n')}\n\nDaily time guide\n${routine.join('\n')}`;
  root!.querySelector('[data-daily-routine]')!.textContent=routine.join(' ');
  const list=root!.querySelector('[data-plan-steps]')!;
  list.replaceChildren(...days.map(day=>{
   const li=document.createElement('li');
   const duration=document.createElement('span');duration.className='plan-duration';duration.textContent=`Day ${day.day} / ${day.minutes} minutes`;
   const heading=document.createElement('h3');heading.textContent=day.title;
   const detail=document.createElement('p');detail.textContent=day.text;
   const outcome=document.createElement('p');outcome.className='plan-outcome';outcome.textContent=`Take away: ${day.outcome}`;
   li.append(duration,heading,detail,outcome);return li;
  }));
 }
 root.querySelector<HTMLTextAreaElement>('[data-copy-plan]')?.addEventListener('focus',event=>(event.target as HTMLTextAreaElement).select());
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
}
