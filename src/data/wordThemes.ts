export type DifficultyLevel = 'easy' | 'standard' | 'challenge';

export interface DifficultyConfig {
  id: DifficultyLevel;
  label: string;
  description: string;
  gridSize: number;
  dailyWords: number;
  themeWords: number;
  scoreMultiplier: number;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  easy: {
    id: 'easy',
    label: 'Easy',
    description: '7×7 grid · Horizontal & Vertical only',
    gridSize: 7,
    dailyWords: 5,
    themeWords: 5,
    scoreMultiplier: 1.0,
  },
  standard: {
    id: 'standard',
    label: 'Standard',
    description: '8×8 grid · Includes Diagonals',
    gridSize: 8,
    dailyWords: 6,
    themeWords: 7,
    scoreMultiplier: 1.25,
  },
  challenge: {
    id: 'challenge',
    label: 'Challenge',
    description: '10×10 grid · All 8 directions incl. reversed',
    gridSize: 10,
    dailyWords: 7,
    themeWords: 7,
    scoreMultiplier: 1.6,
  },
};

export interface WordEntry {
  word: string;
  clue: string;
}

export interface WordThemePack {
  id: string;
  title: string;
  subtitle: string;
  edition: string;
  releaseMonth: string;
  difficulty: 'Relaxed' | 'Balanced' | 'Clever';
  isPeriodicUpdate: boolean;
  words: WordEntry[];
}

export interface GridCoord {
  row: number;
  col: number;
}

export interface PlacedWord {
  word: string;
  clue: string;
  coords: GridCoord[];
  orientation: string;
  startRow: number;
  startCol: number;
}

export interface GeneratedPuzzle {
  id: string;
  mode: 'daily' | 'theme';
  difficulty: DifficultyLevel;
  themeId: string;
  title: string;
  subtitle: string;
  edition: string;
  dateStr?: string;
  size: number;
  grid: string[][];
  placedWords: PlacedWord[];
}

export const WORD_THEME_PACKS: WordThemePack[] = [
  {
    id: 'botanical-conservatory',
    title: 'Botanical Conservatory',
    subtitle: 'Heirloom flora, greenhouse blooms, and aromatic herbs',
    edition: 'Core Collection',
    releaseMonth: 'Autumn 2026',
    difficulty: 'Relaxed',
    isPeriodicUpdate: false,
    words: [
      { word: 'ORCHID', clue: 'Delicate tropical bloom prized in glasshouses' },
      { word: 'FERN', clue: 'Ancient feathery woodland plant without flowers' },
      { word: 'SAGE', clue: 'Silvery-green culinary and garden herb' },
      { word: 'PETAL', clue: 'Velvety colorful segment of a blossom' },
      { word: 'MOSS', clue: 'Soft emerald carpet clinging to shaded stones' },
      { word: 'CEDAR', clue: 'Fragrant evergreen timber tree' },
      { word: 'CLOVER', clue: 'Three-leaved meadow plant of good fortune' },
    ],
  },
  {
    id: 'coastal-voyages',
    title: 'Coastal Voyages',
    subtitle: 'Nautical landmarks, harbors, and maritime horizons',
    edition: 'Core Collection',
    releaseMonth: 'Autumn 2026',
    difficulty: 'Relaxed',
    isPeriodicUpdate: false,
    words: [
      { word: 'ANCHOR', clue: 'Heavy iron hook that holds a vessel steady' },
      { word: 'HARBOR', clue: 'Sheltered coastal waters for resting ships' },
      { word: 'TIDE', clue: 'Rhythmic rise and fall of the ocean shore' },
      { word: 'BEACON', clue: 'Guiding coastal light warning sailors at night' },
      { word: 'CORAL', clue: 'Vivid living reef beneath warm clear seas' },
      { word: 'SAIL', clue: 'Canvas wing catching steady ocean winds' },
      { word: 'COVE', clue: 'Small curved inlet tucked along rocky cliffs' },
    ],
  },
  {
    id: 'artisan-kitchen',
    title: 'Artisan Kitchen',
    subtitle: 'Bakery aromas, pantry staples, and slow-cooked craft',
    edition: 'Core Collection',
    releaseMonth: 'Autumn 2026',
    difficulty: 'Balanced',
    isPeriodicUpdate: false,
    words: [
      { word: 'SAFFRON', clue: 'Golden crimson spice harvested from crocus threads' },
      { word: 'BRIOCHE', clue: 'Rich butter-laced French braided bread' },
      { word: 'THYME', clue: 'Woody Mediterranean herb with tiny leaves' },
      { word: 'SIMMER', clue: 'Gentle cooking just below a rolling boil' },
      { word: 'LADLE', clue: 'Deep long-handled spoon for serving soup' },
      { word: 'ZEST', clue: 'Fragrant grated outer peel of citrus fruit' },
      { word: 'BROTH', clue: 'Savory slow-steeped liquid base for stews' },
    ],
  },
  {
    id: 'midnight-observatory',
    title: 'Midnight Observatory',
    subtitle: 'Starlit instruments, lunar phases, and deep cosmos',
    edition: 'Core Collection',
    releaseMonth: 'Autumn 2026',
    difficulty: 'Balanced',
    isPeriodicUpdate: false,
    words: [
      { word: 'NEBULA', clue: 'Glowing interstellar cloud where stars are born' },
      { word: 'ORBIT', clue: 'Curved gravitational path around a planet or star' },
      { word: 'COMET', clue: 'Icy wanderer trailing a luminous tail' },
      { word: 'ZENITH', clue: 'Highest point in the sky directly overhead' },
      { word: 'LUNAR', clue: 'Pertaining to Earth’s silver night companion' },
      { word: 'QUASAR', clue: 'Distant blazing beacon at a galaxy core' },
      { word: 'PRISM', clue: 'Cut glass splitting starlight into spectra' },
    ],
  },
  {
    id: 'symphony-hall',
    title: 'Symphony Hall',
    subtitle: 'Acoustic resonance, tempo markings, and concert strings',
    edition: 'Periodic Update · Oct 2026',
    releaseMonth: 'October 2026',
    difficulty: 'Balanced',
    isPeriodicUpdate: true,
    words: [
      { word: 'CELLO', clue: 'Warm resonant string instrument played seated' },
      { word: 'ADAGIO', clue: 'Slow, graceful musical tempo marking' },
      { word: 'CHORD', clue: 'Three or more notes sounding in harmony' },
      { word: 'OBOE', clue: 'Double-reed woodwind that tunes the orchestra' },
      { word: 'BATON', clue: 'Slender wand guiding the ensemble’s pulse' },
      { word: 'ARIA', clue: 'Expressive solo melody in an opera' },
      { word: 'OCTAVE', clue: 'Interval spanning eight diatonic scale steps' },
    ],
  },
  {
    id: 'world-architecture',
    title: 'World Architecture',
    subtitle: 'Classical stone arches, courtyards, and structural grace',
    edition: 'Periodic Update · Nov 2026',
    releaseMonth: 'November 2026',
    difficulty: 'Clever',
    isPeriodicUpdate: true,
    words: [
      { word: 'ATRIUM', clue: 'Sunlit open central hall inside a building' },
      { word: 'DOME', clue: 'Hemispherical roof crowning grand halls' },
      { word: 'ARCH', clue: 'Curved span distributing stone weight evenly' },
      { word: 'FACADE', clue: 'Principal outward face of an edifice' },
      { word: 'PILLAR', clue: 'Upright column supporting an overhead beam' },
      { word: 'PLAZA', clue: 'Open public square framed by civic buildings' },
      { word: 'FRIEZE', clue: 'Sculpted horizontal band along an upper wall' },
    ],
  },
  {
    id: 'alpine-trails',
    title: 'Alpine Trails',
    subtitle: 'High mountain passes, pine ridges, and crisp summit air',
    edition: 'Periodic Update · Nov 2026',
    releaseMonth: 'November 2026',
    difficulty: 'Relaxed',
    isPeriodicUpdate: true,
    words: [
      { word: 'SUMMIT', clue: 'Highest crest of a mountain peak' },
      { word: 'RIDGE', clue: 'Long narrow highland spine between valleys' },
      { word: 'CAIRN', clue: 'Stacked stones marking a rocky trail' },
      { word: 'GLACIER', clue: 'Slow-moving river of ancient compacted ice' },
      { word: 'MEADOW', clue: 'Sunlit clearing of wild grasses and blooms' },
      { word: 'PINE', clue: 'Needle-bearing tree perfuming mountain air' },
      { word: 'CREEK', clue: 'Clear bubbling stream fed by snowmelt' },
    ],
  },
  {
    id: 'literary-salon',
    title: 'Literary Salon',
    subtitle: 'Bookbinding craft, poetic meter, and timeless prose',
    edition: 'Periodic Update · Late Nov 2026',
    releaseMonth: 'November 2026',
    difficulty: 'Clever',
    isPeriodicUpdate: true,
    words: [
      { word: 'SONNET', clue: 'Fourteen-line lyric poem with classic rhyme' },
      { word: 'FOLIO', clue: 'Large folded sheet in traditional bookmaking' },
      { word: 'STANZA', clue: 'Grouped lines forming a verse paragraph' },
      { word: 'PROSE', clue: 'Natural flowing written language without meter' },
      { word: 'QUILL', clue: 'Feather pen dipped in archival ink' },
      { word: 'NOVEL', clue: 'Extended work of narrative fiction' },
      { word: 'INDEX', clue: 'Alphabetical guide tucked at a book’s end' },
    ],
  },
];

// Deterministic PRNG (Mulberry32) so every player worldwide gets identical daily grids
function createSeededRandom(seedStr: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DirectionDef {
  dr: number;
  dc: number;
  orientation: string;
}

const EASY_DIRECTIONS: DirectionDef[] = [
  { dr: 0, dc: 1, orientation: 'Horizontal' },
  { dr: 1, dc: 0, orientation: 'Vertical' },
];

const STANDARD_DIRECTIONS: DirectionDef[] = [
  { dr: 0, dc: 1, orientation: 'Horizontal' },
  { dr: 1, dc: 0, orientation: 'Vertical' },
  { dr: 1, dc: 1, orientation: 'Diagonal' },
  { dr: -1, dc: 1, orientation: 'Diagonal' },
];

const CHALLENGE_DIRECTIONS: DirectionDef[] = [
  { dr: 0, dc: 1, orientation: 'Horizontal' },
  { dr: 0, dc: -1, orientation: 'Horizontal (Reversed)' },
  { dr: 1, dc: 0, orientation: 'Vertical' },
  { dr: -1, dc: 0, orientation: 'Vertical (Reversed)' },
  { dr: 1, dc: 1, orientation: 'Diagonal' },
  { dr: -1, dc: 1, orientation: 'Diagonal' },
  { dr: 1, dc: -1, orientation: 'Diagonal (Reversed)' },
  { dr: -1, dc: -1, orientation: 'Diagonal (Reversed)' },
];

function getDirectionsForDifficulty(difficulty: DifficultyLevel): DirectionDef[] {
  if (difficulty === 'easy') return EASY_DIRECTIONS;
  if (difficulty === 'challenge') return CHALLENGE_DIRECTIONS;
  return STANDARD_DIRECTIONS;
}

const FILLER_LETTERS = 'EEEEEEEEAAAAARRRRRIIIIIOOOOTTTTNNNNSSSSLLLLCCCCUUDDPMHGBFYWKV';

function buildGridFromWords(
  entries: WordEntry[],
  size: number,
  seed: string,
  difficulty: DifficultyLevel
): { grid: string[][]; placedWords: PlacedWord[] } {
  const rand = createSeededRandom(seed);
  const directions = getDirectionsForDifficulty(difficulty);
  const grid: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => '')
  );

  // Place longest words first for maximum placement reliability
  const sorted = [...entries].sort((a, b) => b.word.length - a.word.length);
  const placedWords: PlacedWord[] = [];

  for (const entry of sorted) {
    const letters = entry.word.toUpperCase();
    const candidates: {
      row: number;
      col: number;
      dir: DirectionDef;
      overlaps: number;
    }[] = [];

    for (const dir of directions) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const endR = r + dir.dr * (letters.length - 1);
          const endC = c + dir.dc * (letters.length - 1);
          if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;

          let fits = true;
          let overlaps = 0;
          for (let i = 0; i < letters.length; i++) {
            const cell = grid[r + dir.dr * i][c + dir.dc * i];
            if (cell !== '' && cell !== letters[i]) {
              fits = false;
              break;
            }
            if (cell === letters[i]) overlaps++;
          }

          if (fits) {
            candidates.push({ row: r, col: c, dir, overlaps });
          }
        }
      }
    }

    if (candidates.length === 0) continue;

    // Shuffle candidates deterministically, slightly preferring neat single overlaps
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    candidates.sort((a, b) => {
      const scoreA = a.overlaps === 1 ? 2 : a.overlaps === 0 ? 1 : 0;
      const scoreB = b.overlaps === 1 ? 2 : b.overlaps === 0 ? 1 : 0;
      return scoreB - scoreA;
    });

    const pickPool = candidates.slice(0, Math.min(6, candidates.length));
    const chosen = pickPool[Math.floor(rand() * pickPool.length)];
    const coords: GridCoord[] = [];

    for (let i = 0; i < letters.length; i++) {
      const nr = chosen.row + chosen.dir.dr * i;
      const nc = chosen.col + chosen.dir.dc * i;
      grid[nr][nc] = letters[i];
      coords.push({ row: nr, col: nc });
    }

    placedWords.push({
      word: letters,
      clue: entry.clue,
      coords,
      orientation: chosen.dir.orientation,
      startRow: chosen.row,
      startCol: chosen.col,
    });
  }

  // Fill remaining cells deterministically
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        const idx = Math.floor(rand() * FILLER_LETTERS.length);
        grid[r][c] = FILLER_LETTERS[idx];
      }
    }
  }

  // Sort placed words alphabetically for consistent clue list display
  placedWords.sort((a, b) => a.word.localeCompare(b.word));

  return { grid, placedWords };
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(todayStr: string): string {
  const [y, m, d] = todayStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function generateDailyPuzzle(
  dateStr: string = getTodayDateString(),
  difficulty: DifficultyLevel = 'standard'
): GeneratedPuzzle {
  const cfg = DIFFICULTY_CONFIGS[difficulty];
  const rand = createSeededRandom(`lexiloom-daily-pack-${dateStr}`);
  const packIdx = Math.floor(rand() * WORD_THEME_PACKS.length);
  const pack = WORD_THEME_PACKS[packIdx];

  // For Easy 7x7, prioritize shorter approachable words first
  const pool =
    difficulty === 'easy'
      ? [...pack.words].sort((a, b) => a.word.length - b.word.length)
      : pack.words;
  const selectedEntries = pool.slice(0, cfg.dailyWords);

  const { grid, placedWords } = buildGridFromWords(
    selectedEntries,
    cfg.gridSize,
    `lexiloom-daily-grid-${dateStr}-${difficulty}`,
    difficulty
  );

  return {
    id:
      difficulty === 'standard'
        ? `daily-${dateStr}`
        : `daily-${dateStr}-${difficulty}`,
    mode: 'daily',
    difficulty,
    themeId: pack.id,
    title: `Daily Challenge: ${pack.title}`,
    subtitle: pack.subtitle,
    edition: `Edition ${dateStr} · ${cfg.label} (${cfg.gridSize}×${cfg.gridSize})`,
    dateStr,
    size: cfg.gridSize,
    grid,
    placedWords,
  };
}

export interface ArchiveDailySummary {
  dateStr: string;
  displayDate: string;
  weekday: string;
  isToday: boolean;
  themeId: string;
  themeTitle: string;
  themeSubtitle: string;
  wordCount: number;
}

export function getPastDailyDates(
  count = 30,
  referenceDateStr: string = getTodayDateString()
): string[] {
  const [y, m, d] = referenceDateStr.split('-').map(Number);
  const dates: string[] = [];
  for (let offset = 0; offset < count; offset++) {
    const dt = new Date(y, (m || 1) - 1, (d || 1) - offset);
    dates.push(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
        dt.getDate()
      ).padStart(2, '0')}`
    );
  }
  return dates;
}

export function getArchiveDailySummary(
  dateStr: string,
  difficulty: DifficultyLevel = 'standard',
  todayStr: string = getTodayDateString()
): ArchiveDailySummary {
  const cfg = DIFFICULTY_CONFIGS[difficulty];
  const rand = createSeededRandom(`lexiloom-daily-pack-${dateStr}`);
  const packIdx = Math.floor(rand() * WORD_THEME_PACKS.length);
  const pack = WORD_THEME_PACKS[packIdx];

  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const displayDate = dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const weekday = dt.toLocaleDateString('en-US', { weekday: 'long' });

  return {
    dateStr,
    displayDate,
    weekday,
    isToday: dateStr === todayStr,
    themeId: pack.id,
    themeTitle: pack.title,
    themeSubtitle: pack.subtitle,
    wordCount: cfg.dailyWords,
  };
}

export function generateArchivePuzzle(
  dateStr: string,
  difficulty: DifficultyLevel = 'standard'
): GeneratedPuzzle {
  const base = generateDailyPuzzle(dateStr, difficulty);
  const todayStr = getTodayDateString();
  if (dateStr === todayStr) {
    return base;
  }
  return {
    ...base,
    mode: 'theme',
    title: `Archive · ${base.title.replace(/^Daily Challenge:\s*/, '')}`,
    edition: `Archive ${dateStr} · ${DIFFICULTY_CONFIGS[difficulty].label} (${base.size}×${base.size})`,
  };
}

export function generateThemePuzzle(
  themeId: string,
  shuffleNonce = 0,
  difficulty: DifficultyLevel = 'standard'
): GeneratedPuzzle {
  const cfg = DIFFICULTY_CONFIGS[difficulty];
  const pack =
    WORD_THEME_PACKS.find((p) => p.id === themeId) || WORD_THEME_PACKS[0];

  const pool =
    difficulty === 'easy'
      ? [...pack.words].sort((a, b) => a.word.length - b.word.length)
      : pack.words;
  const selectedEntries = pool.slice(0, cfg.themeWords);

  const { grid, placedWords } = buildGridFromWords(
    selectedEntries,
    cfg.gridSize,
    `lexiloom-theme-${pack.id}-${difficulty}-${shuffleNonce}`,
    difficulty
  );

  return {
    id:
      difficulty === 'standard'
        ? `theme-${pack.id}`
        : `theme-${pack.id}-${difficulty}`,
    mode: 'theme',
    difficulty,
    themeId: pack.id,
    title: pack.title,
    subtitle: pack.subtitle,
    edition: `${pack.edition} · ${cfg.label} (${cfg.gridSize}×${cfg.gridSize})`,
    size: cfg.gridSize,
    grid,
    placedWords,
  };
}
