/* Writing practice prompts. Original material. Drives the Writing Trainer at
   /trainers/writing; more prompts can be added freely — the trainer lists
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
    suggestedVocab: [
      { phrase: 'face-to-face interaction', meaning: 'talking with someone in person rather than through a screen', example: 'Video calls are convenient, but they can never fully replace face-to-face interaction.' },
      { phrase: 'social isolation', meaning: 'the state of having little contact with other people', example: 'Excessive screen time has been linked to rising levels of social isolation among teenagers.' },
      { phrase: 'digital dependency', meaning: 'relying heavily on phones, apps or the internet in daily life', example: 'Many young people now suffer from a digital dependency that limits their attention span.' },
      { phrase: 'erode', meaning: 'to gradually wear away or weaken something', example: 'Critics argue that constant messaging has begun to erode our ability to hold a real conversation.' },
      { phrase: 'virtual connection', meaning: 'a relationship maintained mainly online rather than in person', example: 'A virtual connection with hundreds of followers is not the same as a close friendship.' },
    ],
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
    suggestedVocab: [
      { phrase: 'vocational training', meaning: 'education focused on preparing students for a specific job', example: 'Some universities now offer vocational training alongside traditional academic degrees.' },
      { phrase: 'employability', meaning: 'how likely someone is to get a job based on their skills and qualifications', example: 'Employers increasingly judge graduates on their employability rather than their exam results alone.' },
      { phrase: 'knowledge for its own sake', meaning: 'learning something purely out of intellectual interest, not for practical use', example: 'Philosophy students often study knowledge for its own sake rather than for career prospects.' },
      { phrase: 'well-rounded individual', meaning: 'a person with broad skills and interests, not just narrow expertise', example: 'Universities argue that a broad curriculum produces a more well-rounded individual.' },
      { phrase: 'intellectual curiosity', meaning: 'a natural desire to learn and understand new ideas', example: 'A good university education should nurture intellectual curiosity, not just job-ready skills.' },
    ],
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
    suggestedVocab: [
      { phrase: 'gridlock', meaning: 'a situation where traffic is so heavy that nothing can move', example: 'During rush hour, the city centre often descends into complete gridlock.' },
      { phrase: 'public transport network', meaning: 'the system of buses, trains and trams available in a city', example: 'Investing in a reliable public transport network would encourage commuters to leave their cars at home.' },
      { phrase: 'congestion charge', meaning: 'a fee drivers pay to enter a busy area of a city', example: 'London introduced a congestion charge to discourage unnecessary car journeys into the centre.' },
      { phrase: 'carbon emissions', meaning: 'the greenhouse gases released by burning fuel, especially from vehicles', example: 'Traffic jams increase carbon emissions because engines run inefficiently while idling.' },
      { phrase: 'commuter', meaning: 'a person who regularly travels between home and work', example: 'The average commuter in a large city now spends over an hour a day stuck in traffic.' },
    ],
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
    suggestedVocab: [
      { phrase: 'disturb', meaning: "to interrupt someone's peace or rest, especially with noise", example: "I'm writing to apologise in advance if the party disturbs you on Saturday night." },
      { phrase: 'keep the noise down', meaning: 'to make an effort to be quieter', example: 'We will do our best to keep the noise down after 11 p.m.' },
      { phrase: 'inconvenience', meaning: 'trouble or difficulty caused to someone', example: "I hope this doesn't cause you too much inconvenience." },
      { phrase: 'wind down', meaning: 'to gradually bring an event to an end', example: 'The music will wind down by midnight at the latest.' },
      { phrase: 'extend an invitation', meaning: 'to formally invite someone', example: "I'd like to extend an invitation to you and your family to join us." },
    ],
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
    suggestedVocab: [
      { phrase: 'work-life balance', meaning: 'the balance between time spent working and time spent on personal life', example: 'Remote working has helped many employees achieve a healthier work-life balance.' },
      { phrase: 'commute', meaning: 'the journey to and from work', example: 'Working from home eliminates the daily commute, saving employees valuable time.' },
      { phrase: 'productivity', meaning: 'the rate at which work is completed effectively', example: 'Some managers worry that remote working reduces productivity due to fewer face-to-face check-ins.' },
      { phrase: 'isolation', meaning: 'the feeling of being cut off from colleagues or social contact', example: 'Working alone at home for months can lead to a sense of isolation.' },
      { phrase: 'flexible working arrangement', meaning: 'a job structure that allows employees to choose when or where they work', example: 'Companies that offer a flexible working arrangement often report higher staff retention.' },
    ],
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
    suggestedVocab: [
      { phrase: 'critical period', meaning: 'a limited stage in childhood when language learning is believed to happen most naturally', example: 'Some linguists claim there is a critical period in early childhood ideal for acquiring a second language.' },
      { phrase: 'cognitive development', meaning: "the growth of a child's thinking and reasoning abilities", example: 'Learning a second language early is thought to support cognitive development more broadly.' },
      { phrase: 'mother tongue', meaning: "a person's first or native language", example: "Parents sometimes worry that early bilingual education will weaken a child's mother tongue." },
      { phrase: 'immersion', meaning: 'learning a language by being surrounded by it constantly', example: 'Immersion programmes place young children in an environment where only the target language is spoken.' },
      { phrase: 'overburden', meaning: 'to place too much pressure or work on someone', example: 'Critics argue that introducing a second language too early can overburden young learners.' },
    ],
  },
  {
    id: 'w1-line-museum-visitors',
    task: 'task1',
    variant: 'line-graph',
    title: 'Museum visitor numbers',
    promptHtml: `The line graph below shows the number of annual visitors (in millions) to three London museums (the Science Museum, the Natural History Museum, and Tate Modern) between 2010 and 2019. <strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong>
      <img src="${withBase('/pics/writing/test-line-museum-visitors.png')}" alt="Line graph of annual visitor numbers to the Science Museum, Natural History Museum and Tate Modern from 2010 to 2019, with Tate Modern overtaking both other museums" loading="lazy" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">`,
    minWords: 150,
    suggestedMinutes: 20,
    suggestedVocab: [
      { phrase: 'footfall', meaning: 'the number of people visiting a place, especially a shop or attraction', example: 'Footfall at Tate Modern grew steadily throughout the period shown.' },
      { phrase: 'cultural institution', meaning: 'an organisation such as a museum or gallery that preserves or promotes culture', example: 'As a major cultural institution, the Science Museum attracts millions of visitors annually.' },
      { phrase: 'overtake', meaning: 'to rise above and surpass something else', example: "Tate Modern's visitor numbers eventually overtook those of the Natural History Museum." },
      { phrase: 'attendance figures', meaning: 'statistics showing how many people attended or visited', example: 'Attendance figures for all three museums rose between 2010 and 2019.' },
      { phrase: 'narrow the gap', meaning: 'to reduce the difference between two amounts', example: 'The Natural History Museum narrowed the gap with the Science Museum by the end of the decade.' },
    ],
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
    suggestedVocab: [
      { phrase: 'internet penetration', meaning: 'the proportion of a population or households with internet access', example: 'Internet penetration in India rose sharply between 2000 and 2020.' },
      { phrase: 'digital divide', meaning: 'the gap between those with and without access to technology', example: 'The figures highlight a persistent digital divide between developed and developing nations.' },
      { phrase: 'connectivity', meaning: 'the state of being connected to the internet or a network', example: 'Improved infrastructure has driven greater connectivity across rural areas.' },
      { phrase: 'marginal increase', meaning: 'a small rise in an amount', example: 'The UK saw only a marginal increase, as household internet access was already near its ceiling in 2000.' },
      { phrase: 'broadband access', meaning: 'a fast, always-on internet connection', example: 'Widespread broadband access has transformed how households in Brazil use the internet.' },
    ],
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
    suggestedVocab: [
      { phrase: 'household budget', meaning: 'the total money a household has to spend and how it is divided', example: 'Housing now takes up a far larger share of the average household budget than it did in 1980.' },
      { phrase: 'disposable income', meaning: 'money left over after essential expenses are paid', example: 'A shrinking proportion of disposable income was spent on leisure by 2020.' },
      { phrase: 'proportion', meaning: 'a share or part of a whole, often expressed as a percentage', example: 'The proportion spent on food fell considerably over the forty-year period.' },
      { phrase: 'discretionary spending', meaning: 'spending on non-essential goods and services', example: 'Discretionary spending on leisure activities declined as housing costs rose.' },
      { phrase: 'cost of living', meaning: 'the amount of money needed to cover basic expenses', example: "A rising cost of living explains why housing's share of the budget expanded so dramatically." },
    ],
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
    suggestedVocab: [
      { phrase: 'rent', meaning: 'the regular payment made for the use of a property', example: 'Rent in London more than doubled between 2000 and 2020.' },
      { phrase: 'affordability', meaning: 'the degree to which something is reasonably priced for the average person', example: 'Rising rents have made affordability a growing concern in major cities.' },
      { phrase: 'stagnate', meaning: 'to stay at roughly the same level without change', example: 'Rent in Tokyo largely stagnated after 2010, unlike the other three cities.' },
      { phrase: 'city-centre apartment', meaning: 'a flat located in the middle of a city, typically close to amenities', example: 'A one-bedroom city-centre apartment in New York became far less affordable over the two decades.' },
      { phrase: 'outpace', meaning: 'to increase faster than something else', example: 'Rent growth in London outpaced that of Berlin throughout the period.' },
    ],
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
    suggestedVocab: [
      { phrase: 'raw material', meaning: 'the basic substance used to make a product', example: 'Shredded plastic becomes the raw material for a wide range of new products.' },
      { phrase: 'sort', meaning: 'to separate items into different categories', example: 'Collected bottles are first sorted by colour and plastic type.' },
      { phrase: 'molten', meaning: 'melted, especially describing metal, glass or plastic', example: 'The shredded plastic is heated until it becomes molten before being reshaped.' },
      { phrase: 'pellet', meaning: 'a small, rounded piece of compressed material', example: 'The melted plastic is cooled and cut into small pellets, ready for manufacturing.' },
      { phrase: 'environmentally friendly', meaning: 'causing little or no harm to the environment', example: 'Recycling plastic bottles is a far more environmentally friendly option than sending them to landfill.' },
    ],
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
    suggestedVocab: [
      { phrase: 'urban development', meaning: 'the growth and building of towns and cities', example: 'The maps illustrate significant urban development in Riverside over the 25-year period.' },
      { phrase: 'farmland', meaning: 'land used for growing crops or raising animals', example: 'Most of the farmland to the south of the town was converted into a shopping centre.' },
      { phrase: 'residential area', meaning: 'a part of a town or city where people live', example: 'New housing considerably expanded the residential area to the west of the river.' },
      { phrase: 'demolish', meaning: 'to knock down or destroy a building', example: 'The old Post Office was demolished to make way for the new school.' },
      { phrase: 'unchanged', meaning: 'staying exactly the same, without alteration', example: 'The river, the bridge and the original houses remained largely unchanged.' },
    ],
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
    suggestedVocab: [
      { phrase: 'sector', meaning: 'a distinct part of an economy or area of activity, such as agriculture or industry', example: 'The agricultural sector accounted for the largest share of water consumption in 2020.' },
      { phrase: 'consumption', meaning: 'the amount of something used', example: 'Total daily water consumption rose from 18.2 to 25.9 billion litres between 2000 and 2020.' },
      { phrase: 'domestic use', meaning: 'use within the home, as opposed to industry or agriculture', example: 'Domestic use made up only a small fraction of overall water consumption.' },
      { phrase: 'steady rise', meaning: 'a continuous, gradual increase', example: 'The table shows a steady rise in total water consumption over the two decades.' },
      { phrase: 'allocate', meaning: 'to give a share of a resource to a particular use', example: 'The majority of water was allocated to agriculture rather than industry or households.' },
    ],
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
    suggestedVocab: [
      { phrase: 'primary responsibility', meaning: 'the main duty or obligation for something', example: 'Some argue that governments should bear primary responsibility for protecting the environment.' },
      { phrase: 'environmental legislation', meaning: 'laws designed to protect the environment', example: 'Strict environmental legislation can force industries to reduce pollution far more effectively than individual choices.' },
      { phrase: 'carbon footprint', meaning: 'the total amount of greenhouse gases produced by a person or organisation', example: 'Individuals can reduce their own carbon footprint, but large-scale change requires government action.' },
      { phrase: 'collective action', meaning: 'action taken together by a group of people to achieve a shared goal', example: 'Tackling climate change ultimately depends on collective action rather than isolated efforts.' },
      { phrase: 'hold accountable', meaning: "to make someone responsible for their actions", example: 'Governments must hold major polluters accountable through fines and regulation.' },
    ],
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
    suggestedVocab: [
      { phrase: 'deterrent', meaning: 'something that discourages a person from doing something', example: 'Supporters of prison argue that it acts as a powerful deterrent against future crime.' },
      { phrase: 'reoffend', meaning: 'to commit another crime after already being punished', example: 'Studies suggest that offenders given community sentences are less likely to reoffend.' },
      { phrase: 'rehabilitation', meaning: 'the process of helping someone return to a normal, law-abiding life', example: 'Community-based punishments place greater emphasis on rehabilitation than on punishment alone.' },
      { phrase: 'reintegrate into society', meaning: 'to help someone become an accepted, functioning member of the community again', example: 'Unpaid community work can help offenders reintegrate into society more smoothly than a prison term.' },
      { phrase: 'custodial sentence', meaning: 'a punishment that involves being sent to prison', example: 'A custodial sentence removes an offender from society but does little to address the causes of their behaviour.' },
    ],
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
    suggestedVocab: [
      { phrase: 'life expectancy', meaning: 'the average number of years a person is expected to live', example: 'Rising life expectancy is a major factor behind the growth of ageing populations worldwide.' },
      { phrase: 'pension system', meaning: 'the system that provides income to people after they retire', example: "An ageing population places significant strain on a country's pension system." },
      { phrase: 'workforce', meaning: 'the total number of people available to work', example: 'A shrinking workforce must support an increasing number of retirees.' },
      { phrase: 'healthcare burden', meaning: 'the demand and cost placed on medical services', example: 'Elderly citizens often require more medical care, adding to the healthcare burden.' },
      { phrase: 'dependency ratio', meaning: 'the proportion of dependents (young and elderly) compared to the working-age population', example: 'A rising dependency ratio means fewer workers are supporting more retirees.' },
    ],
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
    suggestedVocab: [
      { phrase: 'property ladder', meaning: 'the progression of buying increasingly valuable homes over time', example: 'Many young people feel they can no longer get onto the property ladder.' },
      { phrase: 'first-time buyer', meaning: 'someone purchasing a home for the first time', example: 'Government subsidies for first-time buyers could help ease the affordability crisis.' },
      { phrase: 'housing supply', meaning: 'the number of homes available for sale or rent', example: 'A shortage in housing supply has pushed prices far beyond what young people can afford.' },
      { phrase: 'mortgage', meaning: 'a loan used to buy a property, repaid over many years', example: 'Rising interest rates have made mortgages increasingly difficult for young buyers to secure.' },
      { phrase: 'rent-to-own scheme', meaning: 'a housing arrangement in which tenants can eventually buy the property they rent', example: 'A rent-to-own scheme would allow young people to build equity while they save.' },
    ],
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
    suggestedVocab: [
      { phrase: 'scientific advancement', meaning: 'progress in scientific knowledge or technology', example: 'Space exploration has driven scientific advancement in fields far beyond astronomy.' },
      { phrase: 'national prestige', meaning: 'the reputation and status of a country in the eyes of the world', example: 'Some governments invest in space programmes largely for national prestige.' },
      { phrase: 'opportunity cost', meaning: 'what is given up in order to pursue a particular course of action', example: 'Critics point to the opportunity cost of space spending, which could instead fund healthcare or education.' },
      { phrase: 'technological spin-off', meaning: 'a useful invention or technology that results indirectly from another project', example: 'Satellite navigation is one of many technological spin-offs from early space missions.' },
      { phrase: 'immediate problems on Earth', meaning: 'urgent, pressing issues affecting people right now', example: 'Opponents argue that money should be directed towards immediate problems on Earth, such as poverty.' },
    ],
  },
  {
    id: 'w1-line-social-media-time',
    task: 'task1',
    variant: 'line-graph',
    title: 'Time spent on social media',
    promptHtml: `The line graph below shows the average daily time spent on social media by three age groups (teenagers, young adults, and older adults) between 2015 and 2023. <strong>Summarise the information by selecting and reporting the main features, and make comparisons where relevant.</strong>
      <img src="${withBase('/pics/writing/test-line-social-media.png')}" alt="Line graph of average daily social media time for teenagers, young adults and older adults from 2015 to 2023, all three rising, with young adults narrowing the gap with teenagers" loading="lazy" style="width:100%;max-width:560px;height:auto;margin-top:12px;background:#fff">`,
    minWords: 150,
    suggestedMinutes: 20,
    suggestedVocab: [
      { phrase: 'steady upward trend', meaning: 'a continuous increase over time', example: 'All three age groups show a steady upward trend in social media use across the period.' },
      { phrase: 'converge', meaning: 'to move towards the same point or value', example: 'The lines for teenagers and young adults gradually converge by 2023.' },
      { phrase: 'age group', meaning: 'a category of people within a certain age range', example: 'Older adults form the age group with the lowest average time spent on social media.' },
      { phrase: 'daily average', meaning: 'the typical amount per day, calculated over a period', example: 'The daily average for teenagers nearly doubled between 2015 and 2023.' },
      { phrase: 'outstrip', meaning: 'to grow faster than or exceed something else', example: "Young adults' social media use began to outstrip that of teenagers towards the end of the period." },
    ],
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
    suggestedVocab: [
      { phrase: 'tourist arrivals', meaning: 'the number of visitors entering a country', example: 'Tourist arrivals to Spain grew steadily between 2015 and 2023.' },
      { phrase: 'decline', meaning: 'a decrease in amount or quality', example: 'Thailand was the only country to see a decline in visitor numbers over the period.' },
      { phrase: 'tourism industry', meaning: 'the businesses and services that cater to travellers', example: "A drop in arrivals can have a serious impact on a country's tourism industry." },
      { phrase: 'modest growth', meaning: 'a small or moderate increase', example: "Mexico experienced only modest growth compared with France's sharp rise." },
      { phrase: 'peak', meaning: 'the highest point reached', example: 'France reached its peak number of tourist arrivals in 2023.' },
    ],
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
    suggestedVocab: [
      { phrase: 'convenience', meaning: 'the quality of being easy or useful for a particular purpose', example: 'A quarter of respondents cited convenience as their main reason for using public transport.' },
      { phrase: 'environmental concern', meaning: 'worry about the impact of an action on the natural world', example: 'Environmental concern was the third most common reason given by survey respondents.' },
      { phrase: 'survey respondent', meaning: "a person who answers a survey's questions", example: 'Each survey respondent was asked to select their primary reason for choosing public transport.' },
      { phrase: 'car ownership', meaning: 'possessing a private vehicle', example: 'Twelve percent of respondents had no car ownership and relied entirely on public transport.' },
      { phrase: 'cost-effective', meaning: 'providing good value for the money spent', example: 'Many people view public transport as a more cost-effective option than running a car.' },
    ],
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
    suggestedVocab: [
      { phrase: 'working week', meaning: 'the total hours worked in a standard week', example: 'The average working week in Germany fell by six hours between 1990 and 2020.' },
      { phrase: 'decline steadily', meaning: 'to decrease gradually and continuously', example: 'Working hours in Sweden declined steadily across all three decades shown.' },
      { phrase: 'labour market', meaning: 'the system of jobs, employers and workers in an economy', example: 'Changes in the labour market have contributed to shorter average working hours.' },
      { phrase: 'consistently high', meaning: 'remaining at a high level without much change', example: 'Mexico maintained consistently high working hours throughout the period, with only a slight fall.' },
      { phrase: 'productivity gains', meaning: 'improvements in the amount of output produced per hour worked', example: 'Productivity gains have allowed many countries to reduce average working hours without losing output.' },
    ],
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
    suggestedVocab: [
      { phrase: 'faulty', meaning: 'not working correctly, defective', example: 'The washing machine I purchased last month is faulty and has stopped working entirely.' },
      { phrase: 'malfunction', meaning: 'to fail to work properly', example: 'The appliance began to malfunction just two weeks after purchase.' },
      { phrase: 'warranty', meaning: "a manufacturer's promise to repair or replace a faulty product within a certain period", example: 'As the item is still under warranty, I would like it repaired or replaced free of charge.' },
      { phrase: 'refund', meaning: 'money given back to a customer, usually for a returned or faulty product', example: 'I would appreciate a full refund if a replacement is not possible.' },
      { phrase: 'customer service', meaning: 'the assistance and support a business provides to its customers', example: 'I contacted customer service twice, but the issue was never resolved.' },
    ],
  },
];

export function getWritingPrompt(id: string): EssayPrompt | undefined {
  return WRITING_PROMPTS.find((p) => p.id === id);
}
