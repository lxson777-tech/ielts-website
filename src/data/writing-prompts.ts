/* Writing practice prompts. Original material. Drives the essay checker at
   /writing/checker; more prompts can be added freely — the checker lists
   whatever is here. */

import type { EssayPrompt } from '../lib/writing/schema';

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
      <svg viewBox="0 0 560 320" role="img" aria-label="Line graph of visitor numbers to three museums, 2010 to 2019" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">
        <g stroke="#d8dde3" stroke-width="1">
          <line x1="70" y1="30" x2="70" y2="270" stroke="#333" />
          <line x1="70" y1="270" x2="530" y2="270" stroke="#333" />
          <line x1="70" y1="230" x2="530" y2="230" />
          <line x1="70" y1="190" x2="530" y2="190" />
          <line x1="70" y1="150" x2="530" y2="150" />
          <line x1="70" y1="110" x2="530" y2="110" />
          <line x1="70" y1="70" x2="530" y2="70" />
          <line x1="70" y1="30" x2="530" y2="30" />
        </g>
        <g font-size="11" fill="#333">
          <text x="60" y="274" text-anchor="end">0</text>
          <text x="60" y="234" text-anchor="end">1m</text>
          <text x="60" y="194" text-anchor="end">2m</text>
          <text x="60" y="154" text-anchor="end">3m</text>
          <text x="60" y="114" text-anchor="end">4m</text>
          <text x="60" y="74" text-anchor="end">5m</text>
          <text x="60" y="34" text-anchor="end">6m</text>
          <text x="70" y="290" text-anchor="middle">2010</text>
          <text x="210" y="290" text-anchor="middle">2013</text>
          <text x="350" y="290" text-anchor="middle">2016</text>
          <text x="490" y="290" text-anchor="middle">2019</text>
        </g>
        <polyline points="70,190 210,174 350,162 490,150" fill="none" stroke="#2563eb" stroke-width="2.5" />
        <polyline points="70,70 210,86 350,110 490,134" fill="none" stroke="#dc2626" stroke-width="2.5" />
        <polyline points="70,150 210,110 350,62 490,38" fill="none" stroke="#059669" stroke-width="2.5" />
        <g font-size="12" font-weight="700">
          <rect x="330" y="20" width="12" height="12" fill="#2563eb" /><text x="346" y="30" fill="#2563eb">Science Museum</text>
          <rect x="330" y="38" width="12" height="12" fill="#dc2626" /><text x="346" y="48" fill="#dc2626">Natural History Museum</text>
          <rect x="330" y="56" width="12" height="12" fill="#059669" /><text x="346" y="66" fill="#059669">Tate Modern</text>
        </g>
      </svg>`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w1-bar-internet-access',
    task: 'task1',
    variant: 'bar-chart',
    title: 'Household internet access',
    promptHtml: `The bar chart below shows the percentage of households with internet access in four countries in 2000 and 2020. <strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong>
      <svg viewBox="0 0 560 320" role="img" aria-label="Bar chart of household internet access by country, 2000 versus 2020" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">
        <g stroke="#333">
          <line x1="70" y1="30" x2="70" y2="270" />
          <line x1="70" y1="270" x2="530" y2="270" />
        </g>
        <g font-size="11" fill="#333">
          <text x="60" y="274" text-anchor="end">0%</text>
          <text x="60" y="222" text-anchor="end">25%</text>
          <text x="60" y="174" text-anchor="end">50%</text>
          <text x="60" y="126" text-anchor="end">75%</text>
          <text x="60" y="78" text-anchor="end">100%</text>
        </g>
        <g stroke="#e5e7eb"><line x1="70" y1="222" x2="530" y2="222" /><line x1="70" y1="174" x2="530" y2="174" /><line x1="70" y1="126" x2="530" y2="126" /><line x1="70" y1="78" x2="530" y2="78" /></g>
        <g>
          <rect x="95" y="186" width="26" height="84" fill="#2563eb" /><rect x="125" y="40" width="26" height="230" fill="#93c5fd" />
          <rect x="215" y="258" width="26" height="12" fill="#2563eb" /><rect x="245" y="76" width="26" height="194" fill="#93c5fd" />
          <rect x="335" y="268" width="26" height="2" fill="#2563eb" /><rect x="365" y="138" width="26" height="132" fill="#93c5fd" />
          <rect x="455" y="268" width="26" height="2" fill="#2563eb" /><rect x="485" y="126" width="26" height="144" fill="#93c5fd" />
        </g>
        <g font-size="11" fill="#333" text-anchor="middle">
          <text x="123" y="288">UK</text>
          <text x="243" y="288">Brazil</text>
          <text x="363" y="288">Nigeria</text>
          <text x="483" y="288">India</text>
        </g>
        <g font-size="12" font-weight="700">
          <rect x="330" y="20" width="12" height="12" fill="#2563eb" /><text x="346" y="30" fill="#2563eb">2000</text>
          <rect x="410" y="20" width="12" height="12" fill="#93c5fd" /><text x="426" y="30" fill="#2563eb">2020</text>
        </g>
      </svg>`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w1-pie-household-spending',
    task: 'task1',
    variant: 'pie-chart',
    title: 'Household spending, 1980 vs 2020',
    promptHtml: `The pie charts below show the proportion of household spending in a European country in 1980 and in 2020. <strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong>
      <svg viewBox="0 0 560 300" role="img" aria-label="Two pie charts comparing household spending categories in 1980 and 2020" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">
        <g stroke="#fff" stroke-width="1.5">
          <path d="M140,150 L140,40 A110,110 0 0,1 204.7,239.0 Z" fill="#2563eb" />
          <path d="M140,150 L204.7,239.0 A110,110 0 0,1 51.0,214.7 Z" fill="#dc2626" />
          <path d="M140,150 L51.0,214.7 A110,110 0 0,1 35.4,116.0 Z" fill="#059669" />
          <path d="M140,150 L35.4,116.0 A110,110 0 0,1 75.3,61.0 Z" fill="#d97706" />
          <path d="M140,150 L75.3,61.0 A110,110 0 0,1 140,40 Z" fill="#7c3aed" />
        </g>
        <g stroke="#fff" stroke-width="1.5">
          <path d="M420,150 L420,40 A110,110 0 0,1 524.6,116.0 Z" fill="#2563eb" />
          <path d="M420,150 L524.6,116.0 A110,110 0 1,1 386.0,254.6 Z" fill="#dc2626" />
          <path d="M420,150 L386.0,254.6 A110,110 0 0,1 315.4,184.0 Z" fill="#059669" />
          <path d="M420,150 L315.4,184.0 A110,110 0 0,1 355.3,61.0 Z" fill="#d97706" />
          <path d="M420,150 L355.3,61.0 A110,110 0 0,1 420,40 Z" fill="#7c3aed" />
        </g>
        <g font-size="13" font-weight="700" text-anchor="middle" fill="#333">
          <text x="140" y="285">1980</text>
          <text x="420" y="285">2020</text>
        </g>
        <g font-size="11" font-weight="700">
          <rect x="10" y="10" width="12" height="12" fill="#2563eb" /><text x="26" y="20" fill="#2563eb">Food (1980: 40% · 2020: 20%)</text>
          <rect x="10" y="26" width="12" height="12" fill="#dc2626" /><text x="26" y="36" fill="#dc2626">Housing (1980: 25% · 2020: 35%)</text>
          <rect x="290" y="10" width="12" height="12" fill="#059669" /><text x="306" y="20" fill="#059669">Transport (1980: 15% · 2020: 15%)</text>
          <rect x="290" y="26" width="12" height="12" fill="#d97706" /><text x="306" y="36" fill="#d97706">Leisure (1980: 10% · 2020: 20%)</text>
          <rect x="10" y="42" width="12" height="12" fill="#7c3aed" /><text x="26" y="52" fill="#7c3aed">Other (1980: 10% · 2020: 10%)</text>
        </g>
      </svg>`,
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
      <svg viewBox="0 0 560 260" role="img" aria-label="Flow diagram of the plastic bottle recycling process" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">
        <g fill="#eff6ff" stroke="#2563eb" stroke-width="1.5">
          <rect x="15" y="40" width="110" height="50" rx="6" /><rect x="155" y="40" width="110" height="50" rx="6" />
          <rect x="295" y="40" width="110" height="50" rx="6" /><rect x="435" y="40" width="110" height="50" rx="6" />
          <rect x="435" y="170" width="110" height="50" rx="6" /><rect x="295" y="170" width="110" height="50" rx="6" />
          <rect x="155" y="170" width="110" height="50" rx="6" />
        </g>
        <g font-size="12" font-weight="700" text-anchor="middle" fill="#1e3a8a">
          <text x="70" y="70">Collection</text>
          <text x="210" y="70">Sorting</text>
          <text x="350" y="70">Washing</text>
          <text x="490" y="70">Shredding</text>
          <text x="490" y="200">Melting</text>
          <text x="350" y="200">Pelletising</text>
          <text x="210" y="195">New</text>
          <text x="210" y="209">products</text>
        </g>
        <g stroke="#333" stroke-width="2" fill="none" marker-end="url(#arrow)">
          <line x1="125" y1="65" x2="153" y2="65" /><line x1="265" y1="65" x2="293" y2="65" /><line x1="405" y1="65" x2="433" y2="65" />
          <line x1="490" y1="90" x2="490" y2="168" />
          <line x1="433" y1="195" x2="407" y2="195" /><line x1="293" y1="195" x2="267" y2="195" />
        </g>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#333" /></marker>
        </defs>
      </svg>`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w1-map-riverside-town',
    task: 'task1',
    variant: 'map',
    title: 'Riverside town development',
    promptHtml: `The maps below show the town of Riverside in 1995 and today. <strong>Summarise the information by describing the main changes, and make comparisons where relevant.</strong>
      <svg viewBox="0 0 560 260" role="img" aria-label="Two maps comparing the town of Riverside in 1995 and today" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">
        <g>
          <rect x="10" y="10" width="250" height="220" fill="#f9fafb" stroke="#333" />
          <rect x="10" y="100" width="250" height="24" fill="#93c5fd" /><text x="20" y="117" font-size="10">River</text>
          <rect x="120" y="95" width="14" height="34" fill="#9ca3af" /><text x="127" y="90" font-size="9" text-anchor="middle">Bridge</text>
          <rect x="30" y="30" width="60" height="40" fill="#d6d3d1" /><text x="60" y="52" font-size="9" text-anchor="middle">Houses</text>
          <rect x="150" y="140" width="90" height="70" fill="#bbf7d0" /><text x="195" y="178" font-size="9" text-anchor="middle">Farmland</text>
          <rect x="30" y="150" width="60" height="30" fill="#d6d3d1" /><text x="60" y="169" font-size="9" text-anchor="middle">Post Office</text>
          <text x="135" y="245" font-size="12" font-weight="700" text-anchor="middle">1995</text>
        </g>
        <g>
          <rect x="300" y="10" width="250" height="220" fill="#f9fafb" stroke="#333" />
          <rect x="300" y="100" width="250" height="24" fill="#93c5fd" /><text x="310" y="117" font-size="10">River</text>
          <rect x="410" y="95" width="14" height="34" fill="#9ca3af" /><text x="417" y="90" font-size="9" text-anchor="middle">Bridge</text>
          <rect x="320" y="30" width="60" height="40" fill="#d6d3d1" /><text x="350" y="52" font-size="9" text-anchor="middle">Houses</text>
          <rect x="440" y="140" width="90" height="70" fill="#fecaca" /><text x="485" y="172" font-size="9" text-anchor="middle">Shopping</text><text x="485" y="184" font-size="9" text-anchor="middle">Centre</text>
          <rect x="320" y="150" width="60" height="30" fill="#fde68a" /><text x="350" y="169" font-size="9" text-anchor="middle">School</text>
          <rect x="390" y="30" width="60" height="40" fill="#d6d3d1" /><text x="420" y="52" font-size="9" text-anchor="middle">New Houses</text>
          <text x="425" y="245" font-size="12" font-weight="700" text-anchor="middle">Today</text>
        </g>
      </svg>`,
    minWords: 150,
    suggestedMinutes: 20,
  },
  {
    id: 'w1-combination-water-usage',
    task: 'task1',
    variant: 'combination',
    title: 'Water usage by sector',
    promptHtml: `The chart below shows the proportion of water used by three sectors in a country in 2020, and the table shows total daily water consumption over three years. <strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong>
      <svg viewBox="0 0 560 260" role="img" aria-label="Bar chart of water usage by sector in 2020" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">
        <g stroke="#333"><line x1="70" y1="20" x2="70" y2="210" /><line x1="70" y1="210" x2="530" y2="210" /></g>
        <g font-size="11" fill="#333">
          <text x="60" y="214" text-anchor="end">0%</text>
          <text x="60" y="118" text-anchor="end">50%</text>
          <text x="60" y="24" text-anchor="end">100%</text>
        </g>
        <rect x="120" y="52" width="70" height="158" fill="#2563eb" /><text x="155" y="230" font-size="11" text-anchor="middle">Agriculture (70%)</text>
        <rect x="270" y="115" width="70" height="95" fill="#059669" /><text x="305" y="230" font-size="11" text-anchor="middle">Industry (25%)</text>
        <rect x="420" y="191" width="70" height="19" fill="#d97706" /><text x="455" y="230" font-size="11" text-anchor="middle">Domestic (5%)</text>
      </svg>
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
];

export function getWritingPrompt(id: string): EssayPrompt | undefined {
  return WRITING_PROMPTS.find((p) => p.id === id);
}
