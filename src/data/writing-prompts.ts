/* Writing practice prompts. Original material. Drives the writing checker at
   /writing/checker; more prompts can be added freely — the checker lists
   whatever is here. */

import type { EssayPrompt } from '../lib/writing/schema';
import { withBase } from '../lib/url';

export const WRITING_PROMPTS: EssayPrompt[] = [
  {
    id: 'w2-technology-social',
    task: 'task2',
    variant: 'opinion',
    title: 'Technology & sociability',
    promptHtml:
      'Some people believe that modern technology is making people less sociable. <strong>To what extent do you agree or disagree?</strong> Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
    minWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w2-university-purpose',
    task: 'task2',
    variant: 'discussion',
    title: 'The purpose of university',
    promptHtml:
      'Some people think the main purpose of university education is to prepare students for employment, while others believe it should develop knowledge for its own sake. <strong>Discuss both views and give your own opinion.</strong>',
    minWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w2-city-traffic',
    task: 'task2',
    variant: 'problem-solution',
    title: 'Traffic in cities',
    promptHtml:
      'Traffic congestion in large cities is getting worse every year. <strong>What problems does this cause, and what measures could governments take to solve them?</strong>',
    minWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w1-letter-neighbour',
    task: 'task1',
    variant: 'letter',
    title: 'Letter to a neighbour (General Training)',
    promptHtml:
      'You are planning to hold a party at your home, and you are worried the noise may disturb your neighbour. Write a letter to your neighbour. In your letter: <em>explain the reason for the party · describe what you will do to limit the noise · invite them to attend</em>.',
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w2-adv-disadv-remote-work',
    task: 'task2',
    variant: 'advantages-disadvantages',
    title: 'Remote working',
    promptHtml:
      'In recent years, many companies have allowed employees to work from home instead of the office. <strong>What are the advantages and disadvantages of this trend?</strong>',
    minWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w2-two-part-language-learning',
    task: 'task2',
    variant: 'two-part',
    title: 'Early foreign-language learning',
    promptHtml:
      'Many parents believe that children should begin learning a foreign language as early as possible. <strong>Why do some people hold this view? What might be the disadvantages of learning a foreign language at a young age?</strong>',
    minWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w1-line-museum-visitors',
    task: 'task1',
    variant: 'line-graph',
    title: 'Museum visitor numbers',
    promptHtml: `The line graph below shows the number of annual visitors (in millions) to three London museums — the Science Museum, the Natural History Museum, and Tate Modern — between 2010 and 2019. <strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong>
      <img src="${withBase('/pics/writing/test-line-museum-visitors.png')}" alt="Line graph of annual visitor numbers to the Science Museum, Natural History Museum and Tate Modern from 2010 to 2019, with Tate Modern overtaking both other museums" loading="lazy" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w1-bar-internet-access',
    task: 'task1',
    variant: 'bar-chart',
    title: 'Household internet access',
    promptHtml: `The bar chart below shows the percentage of households with internet access in four countries in 2000 and 2020. <strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong>
      <img src="${withBase('/pics/writing/test-bar-internet-access.png')}" alt="Bar chart of household internet access in the UK, Brazil, Nigeria and India in 2000 and 2020" loading="lazy" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w1-pie-household-spending',
    task: 'task1',
    variant: 'pie-chart',
    title: 'Household spending, 1980 vs 2020',
    promptHtml: `The pie charts below show the proportion of household spending in a European country in 1980 and in 2020. <strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong>
      <img src="${withBase('/pics/writing/test-pie-household-spending.png')}" alt="Two pie charts comparing household spending on food, housing, transport, leisure and other categories in 1980 and 2020" loading="lazy" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w1-table-rent-prices',
    task: 'task1',
    variant: 'table',
    title: 'City-centre rent prices',
    promptHtml: `The table below shows the average monthly rent (in US dollars) for a one-bedroom, city-centre apartment in four cities in 2000, 2010, and 2020. <strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:0.9rem">
        <thead>
          <tr style="background:#f3f4f6;text-align:left">
            <th style="padding:8px;border:1px solid #d1d5db">City</th>
            <th style="padding:8px;border:1px solid #d1d5db">2000</th>
            <th style="padding:8px;border:1px solid #d1d5db">2010</th>
            <th style="padding:8px;border:1px solid #d1d5db">2020</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding:8px;border:1px solid #d1d5db">London</td><td style="padding:8px;border:1px solid #d1d5db">$900</td><td style="padding:8px;border:1px solid #d1d5db">$1,500</td><td style="padding:8px;border:1px solid #d1d5db">$2,200</td></tr>
          <tr><td style="padding:8px;border:1px solid #d1d5db">New York</td><td style="padding:8px;border:1px solid #d1d5db">$1,100</td><td style="padding:8px;border:1px solid #d1d5db">$1,800</td><td style="padding:8px;border:1px solid #d1d5db">$2,600</td></tr>
          <tr><td style="padding:8px;border:1px solid #d1d5db">Tokyo</td><td style="padding:8px;border:1px solid #d1d5db">$1,400</td><td style="padding:8px;border:1px solid #d1d5db">$1,600</td><td style="padding:8px;border:1px solid #d1d5db">$1,500</td></tr>
          <tr><td style="padding:8px;border:1px solid #d1d5db">Berlin</td><td style="padding:8px;border:1px solid #d1d5db">$500</td><td style="padding:8px;border:1px solid #d1d5db">$650</td><td style="padding:8px;border:1px solid #d1d5db">$950</td></tr>
        </tbody>
      </table>`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w1-process-plastic-recycling',
    task: 'task1',
    variant: 'process',
    title: 'Plastic bottle recycling process',
    promptHtml: `The diagram below shows the process by which plastic bottles are recycled. <strong>Summarise the information by describing the main stages of the process.</strong>
      <img src="${withBase('/pics/writing/test-process-plastic-recycling.png')}" alt="Flow diagram of the plastic bottle recycling process: collection, sorting, washing, shredding, melting, pelletising, then new products" loading="lazy" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w1-map-riverside-town',
    task: 'task1',
    variant: 'map',
    title: 'Riverside town development',
    promptHtml: `The maps below show the town of Riverside in 1995 and today. <strong>Summarise the information by describing the main changes, and make comparisons where relevant.</strong>
      <img src="${withBase('/pics/writing/test-map-riverside-town.png')}" alt="Two maps comparing the town of Riverside in 1995 and today: the Post Office is replaced by a School, most of the farmland becomes a Shopping Centre, and new houses appear, while the river, bridge and original houses stay unchanged" loading="lazy" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w1-combination-water-usage',
    task: 'task1',
    variant: 'combination',
    title: 'Water usage by sector',
    promptHtml: `The chart below shows the proportion of water used by three sectors in a country in 2020, and the table shows total daily water consumption over three years. <strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong>
      <img src="${withBase('/pics/writing/test-bar-water-usage.png')}" alt="Bar chart showing water usage by sector in 2020: Agriculture 70%, Industry 25%, Domestic 5%" loading="lazy" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">
      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:0.9rem">
        <thead><tr style="background:#f3f4f6;text-align:left"><th style="padding:8px;border:1px solid #d1d5db">Year</th><th style="padding:8px;border:1px solid #d1d5db">Total consumption (billion litres/day)</th></tr></thead>
        <tbody>
          <tr><td style="padding:8px;border:1px solid #d1d5db">2000</td><td style="padding:8px;border:1px solid #d1d5db">18.2</td></tr>
          <tr><td style="padding:8px;border:1px solid #d1d5db">2010</td><td style="padding:8px;border:1px solid #d1d5db">21.6</td></tr>
          <tr><td style="padding:8px;border:1px solid #d1d5db">2020</td><td style="padding:8px;border:1px solid #d1d5db">25.9</td></tr>
        </tbody>
      </table>`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w2-opinion-environment-responsibility',
    task: 'task2',
    variant: 'opinion',
    title: 'Who should protect the environment?',
    promptHtml:
      'Many people believe that the government, rather than individuals, should take primary responsibility for protecting the environment. <strong>To what extent do you agree or disagree?</strong> Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
    minWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w2-discussion-prison-vs-community',
    task: 'task2',
    variant: 'discussion',
    title: 'Prison vs community punishment',
    promptHtml:
      'Some people believe that prison is the most effective way to deal with criminals, while others think community-based punishments, such as unpaid work, are more effective. <strong>Discuss both views and give your own opinion.</strong>',
    minWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w2-adv-disadv-ageing-population',
    task: 'task2',
    variant: 'advantages-disadvantages',
    title: 'An ageing population',
    promptHtml:
      'Many countries now have an ageing population, with more elderly people than ever before. <strong>What are the advantages and disadvantages of this development for society?</strong>',
    minWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w2-problem-solution-housing-affordability',
    task: 'task2',
    variant: 'problem-solution',
    title: 'Unaffordable housing for young people',
    promptHtml:
      'In many major cities, house prices have risen so much that young people can no longer afford to buy their own home. <strong>What problems does this cause, and what solutions can you suggest?</strong>',
    minWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w2-two-part-space-exploration',
    task: 'task2',
    variant: 'two-part',
    title: 'Funding space exploration',
    promptHtml:
      'Some governments spend large amounts of money exploring outer space, while others believe this money should be spent on more immediate problems on Earth. <strong>Why do some governments continue to invest in space exploration? Do the benefits of this investment outweigh the costs?</strong>',
    minWords: 250,
    suggestedMinutes: 40,
  },
  {
    id: 'w1-line-social-media-time',
    task: 'task1',
    variant: 'line-graph',
    title: 'Time spent on social media',
    promptHtml: `The line graph below shows the average daily time spent on social media by three age groups — teenagers, young adults, and older adults — between 2015 and 2023. <strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong>
      <img src="${withBase('/pics/writing/test-line-social-media.png')}" alt="Line graph of average daily social media time for teenagers, young adults and older adults from 2015 to 2023, all three rising, with young adults narrowing the gap with teenagers" loading="lazy" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w1-bar-tourist-arrivals',
    task: 'task1',
    variant: 'bar-chart',
    title: 'International tourist arrivals',
    promptHtml: `The bar chart below shows the number of international tourists (in millions) visiting four countries in 2015 and 2023. <strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong>
      <img src="${withBase('/pics/writing/test-bar-tourist-arrivals.png')}" alt="Bar chart of international tourist arrivals to France, Spain, Thailand and Mexico in 2015 and 2023, with Thailand the only country to see a decline" loading="lazy" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w1-pie-public-transport-reasons',
    task: 'task1',
    variant: 'pie-chart',
    title: 'Reasons for using public transport',
    promptHtml: `The pie chart below shows the main reasons people gave for using public transport in a recent survey. <strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong>
      <img src="${withBase('/pics/writing/test-pie-public-transport.png')}" alt="Pie chart showing reasons for using public transport: cost 35%, convenience 25%, environmental concerns 20%, no car available 12%, other 8%" loading="lazy" style="width:100%;max-width:480px;height:auto;margin-top:12px;background:#fff">`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w1-table-working-hours',
    task: 'task1',
    variant: 'table',
    title: 'Average working hours',
    promptHtml: `The table below shows the average number of working hours per week in five countries in 1990, 2010, and 2020. <strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:0.9rem">
        <thead>
          <tr style="background:#f3f4f6;text-align:left">
            <th style="padding:8px;border:1px solid #d1d5db">Country</th>
            <th style="padding:8px;border:1px solid #d1d5db">1990</th>
            <th style="padding:8px;border:1px solid #d1d5db">2010</th>
            <th style="padding:8px;border:1px solid #d1d5db">2020</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding:8px;border:1px solid #d1d5db">Germany</td><td style="padding:8px;border:1px solid #d1d5db">40</td><td style="padding:8px;border:1px solid #d1d5db">35</td><td style="padding:8px;border:1px solid #d1d5db">34</td></tr>
          <tr><td style="padding:8px;border:1px solid #d1d5db">Japan</td><td style="padding:8px;border:1px solid #d1d5db">44</td><td style="padding:8px;border:1px solid #d1d5db">42</td><td style="padding:8px;border:1px solid #d1d5db">38</td></tr>
          <tr><td style="padding:8px;border:1px solid #d1d5db">South Korea</td><td style="padding:8px;border:1px solid #d1d5db">48</td><td style="padding:8px;border:1px solid #d1d5db">45</td><td style="padding:8px;border:1px solid #d1d5db">40</td></tr>
          <tr><td style="padding:8px;border:1px solid #d1d5db">Mexico</td><td style="padding:8px;border:1px solid #d1d5db">45</td><td style="padding:8px;border:1px solid #d1d5db">43</td><td style="padding:8px;border:1px solid #d1d5db">43</td></tr>
          <tr><td style="padding:8px;border:1px solid #d1d5db">Sweden</td><td style="padding:8px;border:1px solid #d1d5db">38</td><td style="padding:8px;border:1px solid #d1d5db">36</td><td style="padding:8px;border:1px solid #d1d5db">35</td></tr>
        </tbody>
      </table>`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w1-letter-faulty-appliance',
    task: 'task1',
    variant: 'letter',
    title: 'Letter about a faulty appliance (General Training)',
    promptHtml:
      'You recently bought a piece of electrical equipment for your home, but it stopped working properly after a short time. Write a letter to the shop where you bought it. In your letter: <em>describe the item and the problem · explain what happened when you contacted the shop · say what you would like them to do</em>.',
    minWords: 150,
    suggestedMinutes: 20,
  },
];

export function getWritingPrompt(id: string): EssayPrompt | undefined {
  return WRITING_PROMPTS.find((p) => p.id === id);
}
