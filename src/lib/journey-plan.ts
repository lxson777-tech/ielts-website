export const journeySkills:Record<string,{name:string;route:string;method:string;practice:string;review:string}>={
  speaking:{name:'Speaking',route:'/trainers/speaking',method:'Use a reason and a specific example to develop a short answer.',practice:'Answer a speaking question out loud using a reason and an example.',review:'Review the speaking feedback, choose one focus and try another answer.'},
  writing:{name:'Writing',route:'/trainers/writing',method:'Plan a clear position, two main points and supporting examples.',practice:'Write one focused paragraph with a clear point and example.',review:'Check how each sentence supports your point. Revise one weak sentence.'},
  reading:{name:'Reading',route:'/lessons/reading/paraphrase',method:'Learn to recognise the same idea expressed in different words.',practice:'Find a question phrase and match it to evidence in a passage.',review:'Explain why your evidence supports the answer before moving on.'},
  listening:{name:'Listening',route:'/lessons/listening/section1',method:'Predict what type of information fills each gap before listening.',practice:'Try a short listening exercise and note where you lose the thread.',review:'Replay that part and identify the words that signalled the answer.'},
 };

export type JourneyAnswers={band:string;skill:string;focus:string;time:string};
export function validJourney(value:Record<string,unknown>): value is JourneyAnswers {
 return ['7','7.5','8'].includes(String(value.band)) && Object.hasOwn(journeySkills,String(value.skill)) && ['method','confidence'].includes(String(value.focus)) && ['15','30','60'].includes(String(value.time));
}
export function journeySteps(answers:JourneyAnswers){
 const skill=journeySkills[answers.skill],time=Number(answers.time);
 return answers.focus==='method'?[`${time===15?5:time===30?10:20} min: ${skill.method}`,`${time===15?7:time===30?15:30} min: ${skill.practice}`,`${time===15?3:time===30?5:10} min: ${skill.review}`]:[`${time===15?2:time===30?5:10} min: Choose one ${skill.name.toLowerCase()} task and a single thing to improve.`,`${time===15?10:time===30?20:40} min: ${skill.practice}`,`${time===15?3:time===30?5:10} min: ${skill.review}`];
}

export function journeyDays(answers: JourneyAnswers) {
 const skill = journeySkills[answers.skill];
 const fresh: Record<string,string> = {
  speaking: 'Answer a fresh Part 1 question without the structure beside you. Compare how fully you develop your answer.',
  writing: 'Write a paragraph for a different topic without the guide. Check for a clear point, explanation and example.',
  reading: 'Try a fresh passage question. Underline the evidence and explain why the other answers do not fit.',
  listening: 'Try a fresh recording task. Predict the missing information first, then check the detail you heard.',
 };
 const warmup = answers.focus === 'method'
  ? skill.method
  : `Start with a short ${skill.name.toLowerCase()} task. Note the exact moment you get stuck, then review the relevant method.`;
 return [
  {title:'Find your starting point',text:warmup,outcome:answers.focus==='method'?'One method you can explain in your own words.':'One specific obstacle to focus on.'},
  {title:'Practise with support',text:`${skill.practice} ${skill.review}`,outcome:'One revised answer or corrected mistake, with a reason.'},
  {title:'Try something fresh',text:fresh[answers.skill],outcome:'A fresh attempt to compare with your starting point.'},
 ].map((day,index)=>({...day,day:index+1,minutes:Number(answers.time)}));
}

/** The query string the trial page reads back (questionnaireFromSearch in
    src/lib/trial/offer.ts). The answers become a suggested starting point
    for the trial, never an assessed level. tests/journey-plan.test.ts checks
    the trial reads exactly what this writes. */
export function trialQuery(answers: JourneyAnswers): string {
 const params = new URLSearchParams({ journey: '1', band: answers.band, skill: answers.skill, focus: answers.focus, time: answers.time });
 return `?${params.toString()}`;
}
