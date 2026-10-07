/* Topic illustrations for the Vocabulary area (8 October 2026).

   One picture per topic in src/data/vocabulary.ts, made with Higgsfield
   (GPT Image 2.5) in the flat editorial style Alex chose: no outlines, clean
   shapes, warm ivory background. The scene behind each one is in
   tools/vocab-art/scenes.json; files are public/pics/vocab/<slug>.webp,
   960x720. Decorative next to the topic name, so the alt text describes
   the scene rather than repeating the title. */

export interface VocabTopicArt {
  /** Path under the site base; pass it through withBase(). */
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const VOCAB_TOPIC_ART: Record<string, VocabTopicArt> = {
  'conjunctions': { src: '/pics/vocab/conjunctions.webp', alt: 'A row of rounded stepping stones linked by small wooden bridges across a calm pond, each stone a different soft colour', width: 960, height: 720 },
  'environment': { src: '/pics/vocab/environment.webp', alt: 'A hand planting a young tree on a green hillside, wind turbines and solar panels in the distance, a curving river, a few birds', width: 960, height: 720 },
  'education': { src: '/pics/vocab/education.webp', alt: 'A bright classroom corner with a desk, an open notebook, a stack of books, a globe and a window with morning light', width: 960, height: 720 },
  'technology': { src: '/pics/vocab/technology.webp', alt: 'A laptop, a smartphone and a small robot arm on a tidy desk, soft geometric circuit patterns on the wall', width: 960, height: 720 },
  'work': { src: '/pics/vocab/work.webp', alt: 'A calm modern office with two colleagues talking at a standing desk, plants and a big window onto a city', width: 960, height: 720 },
  'health': { src: '/pics/vocab/health.webp', alt: 'A person jogging on a park path at sunrise, a water bottle, fruit and a heart-shaped leaf in the foreground', width: 960, height: 720 },
  'food': { src: '/pics/vocab/food.webp', alt: 'A market stall with vegetables, bread, fruit and a steaming bowl of soup on a wooden table', width: 960, height: 720 },
  'transport': { src: '/pics/vocab/transport.webp', alt: 'A city street with a tram, a cyclist in a bike lane and a bus, gentle hills behind', width: 960, height: 720 },
  'leisure': { src: '/pics/vocab/leisure.webp', alt: 'A person reading in a hammock between two trees, a guitar and a board game on a blanket nearby', width: 960, height: 720 },
  'people': { src: '/pics/vocab/people.webp', alt: 'A diverse group of friends of different ages chatting on a park bench, one laughing', width: 960, height: 720 },
  'places': { src: '/pics/vocab/places.webp', alt: 'An old town square with a fountain, cafe tables, a clock tower and mountains in the distance', width: 960, height: 720 },
  'childhood': { src: '/pics/vocab/childhood.webp', alt: 'Two children flying a kite on a grassy hill, a red ball and a small bicycle nearby', width: 960, height: 720 },
  'weather': { src: '/pics/vocab/weather.webp', alt: 'A landscape split between sun and rain, a rainbow arching over a field, an umbrella and clouds', width: 960, height: 720 },
  'music-film': { src: '/pics/vocab/music-film.webp', alt: 'A cinema screen glowing in a dark room beside headphones, a vinyl record and a film reel', width: 960, height: 720 },
  'books': { src: '/pics/vocab/books.webp', alt: 'A cosy reading nook with a tall bookshelf, an armchair, a lamp and an open book with a cup of tea', width: 960, height: 720 },
  'sport': { src: '/pics/vocab/sport.webp', alt: 'A running track and a football on grass, a basketball hoop and a medal on a ribbon', width: 960, height: 720 },
  'society': { src: '/pics/vocab/society.webp', alt: 'A lively city neighbourhood with people of many backgrounds walking, a community garden and apartment blocks', width: 960, height: 720 },
  'crime': { src: '/pics/vocab/crime.webp', alt: 'A quiet courthouse with columns and balanced scales of justice in front, a police car parked calmly nearby', width: 960, height: 720 },
  'government': { src: '/pics/vocab/government.webp', alt: 'A parliament building with a dome, flags, and a ballot box with a hand placing a vote', width: 960, height: 720 },
  'money': { src: '/pics/vocab/money.webp', alt: 'Coins, a bank card, a piggy bank and a simple rising bar chart on a desk', width: 960, height: 720 },
  'ai': { src: '/pics/vocab/ai.webp', alt: 'A friendly abstract robot head made of soft shapes next to a glowing brain-like network of dots and lines', width: 960, height: 720 },
  'social-media': { src: '/pics/vocab/social-media.webp', alt: 'A large smartphone with speech bubbles, hearts and photo frames floating out of it', width: 960, height: 720 },
  'media': { src: '/pics/vocab/media.webp', alt: 'A newspaper, a microphone, a television camera and a radio on a studio table', width: 960, height: 720 },
  'travel': { src: '/pics/vocab/travel.webp', alt: 'A suitcase and passport beside a window seat on a plane, clouds and a distant coastline outside', width: 960, height: 720 },
  'housing': { src: '/pics/vocab/housing.webp', alt: 'A street of different homes: a small house with a garden, a tall apartment block and a modern cabin', width: 960, height: 720 },
  'family': { src: '/pics/vocab/family.webp', alt: 'Three generations of a family sharing a meal at a round table, grandparents, parents and a child', width: 960, height: 720 },
  'language': { src: '/pics/vocab/language.webp', alt: 'Two speech bubbles with different alphabets shapes meeting in the middle, open dictionaries and a globe', width: 960, height: 720 },
  'arts': { src: '/pics/vocab/arts.webp', alt: "An artist's easel with a painting, a sculpture on a plinth and paint brushes in a jar in a gallery", width: 960, height: 720 },
  'science': { src: '/pics/vocab/science.webp', alt: 'A laboratory bench with a microscope, flasks of coloured liquid, a DNA spiral and a telescope by the window', width: 960, height: 720 },
  'animals': { src: '/pics/vocab/animals.webp', alt: 'An elephant, a fox and a few birds in a savannah and forest edge, under a big sky', width: 960, height: 720 },
  'business': { src: '/pics/vocab/business.webp', alt: 'A small shop front with an open sign, a handshake, a laptop showing a chart and boxes ready to ship', width: 960, height: 720 },
  'traditions': { src: '/pics/vocab/traditions.webp', alt: 'A festive table with lanterns, a decorated cake, traditional patterned fabric and candles', width: 960, height: 720 },
  'fashion': { src: '/pics/vocab/fashion.webp', alt: 'A clothes rail with colourful garments, a sewing machine, a measuring tape and a mannequin', width: 960, height: 720 },
  'volunteering': { src: '/pics/vocab/volunteering.webp', alt: 'Volunteers in matching shirts planting flowers and handing out food boxes in a community park', width: 960, height: 720 },
  'ageing': { src: '/pics/vocab/ageing.webp', alt: 'An older couple walking arm in arm along a seaside promenade at sunset, a bench and a small dog', width: 960, height: 720 },
  'success': { src: '/pics/vocab/success.webp', alt: 'A person standing on a mountain peak with arms raised, a flag, a winding path below', width: 960, height: 720 },
};

export function vocabTopicArt(slug: string): VocabTopicArt | undefined {
  return VOCAB_TOPIC_ART[slug];
}
