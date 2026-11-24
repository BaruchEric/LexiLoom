export interface CrosswordClueEntry {
  number: number;
  direction: 'across' | 'down';
  answer: string;
  clue: string;
  startRow: number;
  startCol: number;
  cells: { row: number; col: number }[];
}

export interface CrosswordPuzzleDef {
  id: string;
  title: string;
  subtitle: string;
  difficulty: 'Easy' | 'Standard';
  grid: string[]; // 5x5 where '#' is a solid block
  clues: {
    across: Record<string, string>; // keyed by answer
    down: Record<string, string>; // keyed by answer
  };
}

export interface ParsedCrossword {
  def: CrosswordPuzzleDef;
  size: number;
  cellNumbers: Record<string, number>; // "r-c" -> clue number
  across: CrosswordClueEntry[];
  down: CrosswordClueEntry[];
  totalOpenCells: number;
}

export const CROSSWORD_PUZZLES: CrosswordPuzzleDef[] = [
  {
    id: 'cw_garden_bench',
    title: 'Garden Bench',
    subtitle: 'Botanical patio & backyard essentials',
    difficulty: 'Easy',
    grid: ['PLANT', 'O#C#R', 'SPORE', 'T#R#E', '#ANTS'],
    clues: {
      across: {
        PLANT: 'Potted greenery resting on a sunny windowsill',
        SPORE: 'Tiny reproductive cell released by a fern or mushroom',
        ANTS: 'Industrious little insects marching along a garden stone',
      },
      down: {
        POST: 'Sturdy wooden upright supporting a garden fence',
        ACORN: 'Smooth little nut that drops from an oak tree',
        TREES: 'Tall leafy shade-givers lining a quiet park',
      },
    },
  },
  {
    id: 'cw_harbor_watch',
    title: 'Harbor Watch',
    subtitle: 'Maritime vessels & coastal navigation',
    difficulty: 'Standard',
    grid: ['STOW#', 'H#C#S', 'INERT', 'P#A#A', 'SONAR'],
    clues: {
      across: {
        STOW: 'Pack sailing gear neatly below deck',
        INERT: 'Completely still and motionless',
        SONAR: 'Underwater sound system used to map the seabed',
      },
      down: {
        SHIPS: 'Large ocean-going vessels crossing the bay',
        OCEAN: 'Vast expanse of deep blue saltwater',
        STAR: 'Bright celestial guide mariners steer by at night',
      },
    },
  },
  {
    id: 'cw_morning_kitchen',
    title: 'Morning Kitchen',
    subtitle: 'Warm breakfast fare & pantry staples',
    difficulty: 'Easy',
    grid: ['BROTH', 'A#P#O', 'GREEN', 'E#R#E', 'LEAFY'],
    clues: {
      across: {
        BROTH: 'Warm, savory liquid base for homemade soup',
        GREEN: 'Fresh hue of garden basil or whisked matcha',
        LEAFY: 'Full of crisp salad greens and herbs',
      },
      down: {
        BAGEL: 'Chewy ring-shaped roll toasted at breakfast',
        OPERA: 'Grand dramatic musical work performed on stage',
        HONEY: 'Golden sweet nectar gathered by worker bees',
      },
    },
  },
  {
    id: 'cw_starlight_studio',
    title: 'Starlight Studio',
    subtitle: 'Night sky wonders & creative craft',
    difficulty: 'Standard',
    grid: ['SPACE', 'I#B#A', 'GLOWS', 'H#U#E', 'TOTAL'],
    clues: {
      across: {
        SPACE: 'Vast cosmos stretching beyond our atmosphere',
        GLOWS: 'Shines softly with a steady warm light',
        TOTAL: 'Complete sum, or a full solar eclipse',
      },
      down: {
        SIGHT: 'Sense relied upon for spotting constellations',
        ABOUT: 'Concerning, or roughly in the neighborhood of',
        EASEL: 'Three-legged wooden stand holding a canvas',
      },
    },
  },
  {
    id: 'cw_concert_hall',
    title: 'Concert Hall',
    subtitle: 'Rhythm, melody & evening performances',
    difficulty: 'Standard',
    grid: ['MUSIC', 'E#O#H', 'TANGO', 'A#G#I', 'LASER'],
    clues: {
      across: {
        MUSIC: 'Art woven from melody, harmony, and rhythm',
        TANGO: 'Expressive ballroom dance born in Buenos Aires',
        LASER: 'Focused beam of light illuminating a stage show',
      },
      down: {
        METAL: 'Gleaming bronze or brass used to forge cymbals',
        SONGS: 'Melodic vocal tracks arranged on an album',
        CHOIR: 'Group of voices harmonizing together in a hall',
      },
    },
  },
  {
    id: 'cw_scenic_route',
    title: 'Scenic Route',
    subtitle: 'Open rails, footpaths & travel notes',
    difficulty: 'Easy',
    grid: ['TRAIN', 'R#D#O', 'ALOFT', 'I#R#E', 'LANES'],
    clues: {
      across: {
        TRAIN: 'Passenger rail line gliding through valley passes',
        ALOFT: 'High up in the breeze, like a kite or sail',
        LANES: 'Marked tracks along a winding country road',
      },
      down: {
        TRAIL: 'Blazed footpath winding through woodland pines',
        ADORN: 'Decorate gracefully with ribbons or wildflowers',
        NOTES: 'Brief journal entries jotted down during a trip',
      },
    },
  },
];

export function parseCrossword(def: CrosswordPuzzleDef): ParsedCrossword {
  const size = def.grid.length;
  const cellNumbers: Record<string, number> = {};
  const across: CrosswordClueEntry[] = [];
  const down: CrosswordClueEntry[] = [];
  let nextNum = 1;
  let totalOpenCells = 0;

  const isOpen = (r: number, c: number) =>
    r >= 0 && r < size && c >= 0 && c < size && def.grid[r][c] !== '#';

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!isOpen(r, c)) continue;
      totalOpenCells += 1;

      const startsAcross = !isOpen(r, c - 1) && isOpen(r, c + 1);
      const startsDown = !isOpen(r - 1, c) && isOpen(r + 1, c);

      if (startsAcross || startsDown) {
        const num = nextNum++;
        cellNumbers[`${r}-${c}`] = num;

        if (startsAcross) {
          const cells: { row: number; col: number }[] = [];
          let answer = '';
          let cc = c;
          while (isOpen(r, cc)) {
            cells.push({ row: r, col: cc });
            answer += def.grid[r][cc];
            cc++;
          }
          across.push({
            number: num,
            direction: 'across',
            answer,
            clue: def.clues.across[answer] ?? `${answer.length}-letter word`,
            startRow: r,
            startCol: c,
            cells,
          });
        }

        if (startsDown) {
          const cells: { row: number; col: number }[] = [];
          let answer = '';
          let rr = r;
          while (isOpen(rr, c)) {
            cells.push({ row: rr, col: c });
            answer += def.grid[rr][c];
            rr++;
          }
          down.push({
            number: num,
            direction: 'down',
            answer,
            clue: def.clues.down[answer] ?? `${answer.length}-letter word`,
            startRow: r,
            startCol: c,
            cells,
          });
        }
      }
    }
  }

  return { def, size, cellNumbers, across, down, totalOpenCells };
}
