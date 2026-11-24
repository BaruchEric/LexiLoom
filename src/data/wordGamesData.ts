export interface WordGuessEntry {
  id: string;
  word: string; // 5-letter uppercase word
  clue: string; // Revealed when the player spends a Smart Hint
  category: string;
}

export interface AnagramItem {
  word: string;
  clue: string;
}

export interface AnagramSet {
  id: string;
  title: string;
  subtitle: string;
  words: AnagramItem[];
}

export const WORD_GUESS_ENTRIES: WordGuessEntry[] = [
  {
    id: 'wg_prism',
    word: 'PRISM',
    clue: 'Glass wedge that splits white light into a rainbow',
    category: 'Optics',
  },
  {
    id: 'wg_grove',
    word: 'GROVE',
    clue: 'Small sunlit cluster of fruit or olive trees',
    category: 'Nature',
  },
  {
    id: 'wg_ember',
    word: 'EMBER',
    clue: 'Warm glowing coal resting in a hearth after flames fade',
    category: 'Fireside',
  },
  {
    id: 'wg_flute',
    word: 'FLUTE',
    clue: 'Slender silver woodwind played sideways',
    category: 'Music',
  },
  {
    id: 'wg_crisp',
    word: 'CRISP',
    clue: 'Brisk and refreshing, like an autumn morning breeze',
    category: 'Seasons',
  },
  {
    id: 'wg_plume',
    word: 'PLUME',
    clue: 'Soft decorative feather or rising ribbon of steam',
    category: 'Nature',
  },
  {
    id: 'wg_haven',
    word: 'HAVEN',
    clue: 'Peaceful harbor or sheltered place of safety',
    category: 'Travel',
  },
  {
    id: 'wg_quilt',
    word: 'QUILT',
    clue: 'Stitched patchwork blanket layered for cozy warmth',
    category: 'Craft',
  },
  {
    id: 'wg_cedar',
    word: 'CEDAR',
    clue: 'Aromatic evergreen prized for chests and timber',
    category: 'Botany',
  },
  {
    id: 'wg_orbit',
    word: 'ORBIT',
    clue: 'Curved path a planet or moon traces around a star',
    category: 'Astronomy',
  },
  {
    id: 'wg_linen',
    word: 'LINEN',
    clue: 'Cool, breathable fabric woven from flax fibers',
    category: 'Textiles',
  },
  {
    id: 'wg_spark',
    word: 'SPARK',
    clue: 'Tiny sudden flash of light or fresh inspiration',
    category: 'Ideas',
  },
  {
    id: 'wg_fjord',
    word: 'FJORD',
    clue: 'Deep, narrow coastal inlet carved by ancient glaciers',
    category: 'Geography',
  },
  {
    id: 'wg_tempo',
    word: 'TEMPO',
    clue: 'Steady pace or speed at which a melody unfolds',
    category: 'Music',
  },
  {
    id: 'wg_maple',
    word: 'MAPLE',
    clue: 'Broad-leaved tree famous for autumn foliage and syrup',
    category: 'Botany',
  },
  {
    id: 'wg_amber',
    word: 'AMBER',
    clue: 'Warm golden resin fossilized over millions of years',
    category: 'Geology',
  },
];

export const ANAGRAM_SETS: AnagramSet[] = [
  {
    id: 'ana_bakery_morning',
    title: 'Morning Bakery',
    subtitle: '5 warm kitchen & pastry scrambles',
    words: [
      { word: 'SCONE', clue: 'Crumbly tea-time biscuit often served with jam' },
      { word: 'YEAST', clue: 'Baking ingredient that helps fresh bread dough rise' },
      { word: 'GLAZE', clue: 'Glossy sweet icing brushed over warm pastries' },
      { word: 'CRUMB', clue: 'Soft interior texture of a freshly sliced loaf' },
      { word: 'WHISK', clue: 'Wire kitchen tool for beating cream or eggs airy' },
    ],
  },
  {
    id: 'ana_night_observatory',
    title: 'Night Observatory',
    subtitle: '5 stargazing & skyward scrambles',
    words: [
      { word: 'COMET', clue: 'Icy traveler streaming a luminous tail across the sky' },
      { word: 'LUNAR', clue: 'Relating to the phases and tides of the Moon' },
      { word: 'ORBIT', clue: 'Elliptical track followed by planets and satellites' },
      { word: 'GLEAM', clue: 'Faint shimmer of distant starlight' },
      { word: 'ZENITH', clue: 'Highest point directly overhead in the celestial dome' },
    ],
  },
  {
    id: 'ana_coastal_voyage',
    title: 'Coastal Voyage',
    subtitle: '5 seaside & sailing scrambles',
    words: [
      { word: 'SHOAL', clue: 'Shallow sandbank beneath clear coastal waters' },
      { word: 'STERN', clue: 'Rear section of a wooden sailboat or ship' },
      { word: 'CORAL', clue: 'Vibrant reef builder thriving in sunlit tropical seas' },
      { word: 'DRIFT', clue: 'Float gently along with the evening tide' },
      { word: 'ANCHOR', clue: 'Heavy iron hook dropped to hold a boat steady' },
    ],
  },
  {
    id: 'ana_botanical_press',
    title: 'Botanical Press',
    subtitle: '5 meadow & conservatory scrambles',
    words: [
      { word: 'PETAL', clue: 'Delicate colorful leaf forming a flower blossom' },
      { word: 'THYME', clue: 'Fragrant garden herb with tiny aromatic leaves' },
      { word: 'BLOOM', clue: 'Open gracefully into full springtime flower' },
      { word: 'MOSSY', clue: 'Carpeted with soft velvety woodland greenery' },
      { word: 'ORCHID', clue: 'Sculptural greenhouse flower with intricate blooms' },
    ],
  },
];

export type LetterEvaluation = 'correct' | 'present' | 'absent';

/** Standard duplicate-aware 5-letter evaluation */
export function evaluateWordGuess(
  guess: string,
  target: string
): LetterEvaluation[] {
  const result: LetterEvaluation[] = Array(target.length).fill('absent');
  const remaining: Record<string, number> = {};

  for (let i = 0; i < target.length; i++) {
    if (guess[i] === target[i]) {
      result[i] = 'correct';
    } else {
      remaining[target[i]] = (remaining[target[i]] || 0) + 1;
    }
  }

  for (let i = 0; i < target.length; i++) {
    if (result[i] === 'correct') continue;
    const ch = guess[i];
    if (remaining[ch] && remaining[ch] > 0) {
      result[i] = 'present';
      remaining[ch] -= 1;
    }
  }

  return result;
}

/** Deterministic shuffle that guarantees the scrambled order differs from the original */
export function scrambleWord(word: string, seedOffset = 0): string[] {
  const letters = word.split('');
  let seed = seedOffset + 17;
  for (let i = 0; i < word.length; i++) {
    seed = (seed * 31 + word.charCodeAt(i)) % 100000;
  }
  const arr = [...letters];
  for (let i = arr.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    const j = seed % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (arr.join('') === word && arr.length > 1) {
    [arr[0], arr[arr.length - 1]] = [arr[arr.length - 1], arr[0]];
  }
  return arr;
}
