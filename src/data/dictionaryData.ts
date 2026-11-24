export interface DictionaryEntry {
  word: string;
  partOfSpeech: string;
  phonetic: string;
  definition: string;
  example: string;
}

const CURATED_ENTRIES: Record<string, Omit<DictionaryEntry, 'word'>> = {
  // Botanical Conservatory
  ORCHID: {
    partOfSpeech: 'noun',
    phonetic: 'OR-kid',
    definition: 'A flowering plant prized for its intricate, symmetrical blossoms in vivid shades.',
    example: 'A pale white orchid bloomed beside the sunlit glasshouse window.',
  },
  FERN: {
    partOfSpeech: 'noun',
    phonetic: 'furn',
    definition: 'A shade-loving vascular plant with feathery fronds that reproduces via spores instead of seeds.',
    example: 'Soft green ferns lined the damp mossy trail through the cedar woods.',
  },
  SAGE: {
    partOfSpeech: 'noun',
    phonetic: 'sayj',
    definition: 'An aromatic herb with velvety gray-green leaves used in savory cooking and herbal tea.',
    example: 'She chopped fresh sage to scatter over roasted autumn squash.',
  },
  PETAL: {
    partOfSpeech: 'noun',
    phonetic: 'PET-ul',
    definition: 'One of the colorful, delicate modified leaves forming the corolla of a blossom.',
    example: 'Morning dew sparkled along the curved edge of every rose petal.',
  },
  MOSS: {
    partOfSpeech: 'noun',
    phonetic: 'maws',
    definition: 'A low, cushiony non-flowering plant that forms dense emerald mats over shaded stone and bark.',
    example: 'Velvety moss softened the old stone wall behind the garden bench.',
  },
  CEDAR: {
    partOfSpeech: 'noun',
    phonetic: 'SEE-der',
    definition: 'A tall evergreen conifer valued for its warm reddish grain and naturally fragrant timber.',
    example: 'The linen chest was lined with cedar to keep sweaters smelling crisp.',
  },
  CLOVER: {
    partOfSpeech: 'noun',
    phonetic: 'KLOH-ver',
    definition: 'A low meadow legume known for its trifoliate leaves and nectar-rich flower heads.',
    example: 'Honeybees hummed steadily across the sunlit patch of white clover.',
  },

  // Coastal Voyages
  ANCHOR: {
    partOfSpeech: 'noun',
    phonetic: 'ANG-ker',
    definition: 'A heavy hooked metal weight lowered to the seabed to keep a vessel moored in place.',
    example: 'The crew dropped anchor inside the calm bay just before dusk.',
  },
  HARBOR: {
    partOfSpeech: 'noun',
    phonetic: 'HAR-ber',
    definition: 'A sheltered body of coastal water deep enough for ships to dock safely away from storms.',
    example: 'Wooden fishing boats swayed gently in the quiet morning harbor.',
  },
  TIDE: {
    partOfSpeech: 'noun',
    phonetic: 'tyd',
    definition: 'The rhythmic rising and falling of ocean waters driven by the gravitational pull of the Moon and Sun.',
    example: 'At low tide, smooth tidepools appeared between the coastal rocks.',
  },
  BEACON: {
    partOfSpeech: 'noun',
    phonetic: 'BEE-kun',
    definition: 'A bright guiding light or coastal tower erected to warn and orient navigators.',
    example: 'The cliffside beacon swept across the dark water every ten seconds.',
  },
  CORAL: {
    partOfSpeech: 'noun',
    phonetic: 'KOR-ul',
    definition: 'A marine organism whose calcium carbonate skeletons build colorful underwater reefs.',
    example: 'Schools of silver fish darted above the warm sunlit coral reef.',
  },
  SAIL: {
    partOfSpeech: 'noun',
    phonetic: 'sayl',
    definition: 'A shaped sheet of sturdy cloth rigged to a mast to capture wind and propel a boat.',
    example: 'The white mainsail billowed cleanly as the afternoon breeze picked up.',
  },
  COVE: {
    partOfSpeech: 'noun',
    phonetic: 'kohv',
    definition: 'A small, sheltered curved recess or bay tucked along a rugged shoreline.',
    example: 'Kayakers paddled into a quiet sandy cove framed by limestone cliffs.',
  },

  // Artisan Kitchen
  SAFFRON: {
    partOfSpeech: 'noun',
    phonetic: 'SAF-run',
    definition: 'A fragrant golden-crimson spice harvested from the dried stigmas of the crocus flower.',
    example: 'Just a pinch of saffron steeped in warm broth turned the risotto bright gold.',
  },
  BRIOCHE: {
    partOfSpeech: 'noun',
    phonetic: 'bree-OHSH',
    definition: 'A tender, slightly sweet French bread enriched generously with butter and eggs.',
    example: 'Warm slices of toasted brioche filled the bakery with a rich buttery aroma.',
  },
  THYME: {
    partOfSpeech: 'noun',
    phonetic: 'tym',
    definition: 'A woody Mediterranean culinary herb prized for its tiny leaves and earthy fragrance.',
    example: 'A few sprigs of lemon thyme brightened the slow-simmered lentil soup.',
  },
  SIMMER: {
    partOfSpeech: 'verb',
    phonetic: 'SIM-er',
    definition: 'To cook liquid gently just below the boiling point so small bubbles rise steadily.',
    example: 'Let the tomato sauce simmer uncovered for twenty minutes to deepen its flavor.',
  },
  LADLE: {
    partOfSpeech: 'noun',
    phonetic: 'LAY-dul',
    definition: 'A deep, cup-shaped spoon with a long handle designed for serving soups and stews.',
    example: 'He used a brass ladle to pour hot vegetable broth into ceramic bowls.',
  },
  ZEST: {
    partOfSpeech: 'noun',
    phonetic: 'zest',
    definition: 'The brightly colored, oil-rich outer peel of a citrus fruit grated for aroma and flavor.',
    example: 'Fresh orange zest added a crisp brightness to the afternoon scones.',
  },
  BROTH: {
    partOfSpeech: 'noun',
    phonetic: 'brawth',
    definition: 'A clear, savory liquid prepared by gently steeping vegetables, herbs, or bones in water.',
    example: 'A steaming mug of ginger broth felt restorative on a chilly evening.',
  },

  // Midnight Observatory
  NEBULA: {
    partOfSpeech: 'noun',
    phonetic: 'NEB-yoo-luh',
    definition: 'A vast interstellar cloud of luminous gas and cosmic dust where new stars coalesce.',
    example: 'Through the hilltop telescope, the Orion nebula glowed like pale silver mist.',
  },
  ORBIT: {
    partOfSpeech: 'noun',
    phonetic: 'OR-bit',
    definition: 'The curved gravitational path traced repeatedly by a planet, moon, or satellite around a body.',
    example: 'Mars completes a full orbit around the Sun in roughly 687 Earth days.',
  },
  COMET: {
    partOfSpeech: 'noun',
    phonetic: 'KOM-it',
    definition: 'An icy small solar-system body that develops a glowing tail when passing near the Sun.',
    example: 'Stargazers gathered on the ridge to watch the bright comet cross the northern sky.',
  },
  ZENITH: {
    partOfSpeech: 'noun',
    phonetic: 'ZEE-nith',
    definition: 'The point on the celestial sphere directly overhead, or the highest peak of achievement.',
    example: 'By midnight the summer constellation sat directly at the zenith.',
  },
  LUNAR: {
    partOfSpeech: 'adjective',
    phonetic: 'LOO-ner',
    definition: 'Relating to, measured by, or resembling Earth’s Moon.',
    example: 'The observatory hosted a public viewing night during the total lunar eclipse.',
  },
  QUASAR: {
    partOfSpeech: 'noun',
    phonetic: 'KWAY-zar',
    definition: 'An extraordinarily luminous active galactic core powered by a supermassive black hole.',
    example: 'Light from that distant quasar traveled billions of years before reaching our lens.',
  },
  PRISM: {
    partOfSpeech: 'noun',
    phonetic: 'PRIZ-um',
    definition: 'A transparent cut-glass wedge that refracts white light into its component spectrum of colors.',
    example: 'Afternoon sunlight hit the window prism and painted a neat rainbow across the desk.',
  },

  // Symphony Hall
  CELLO: {
    partOfSpeech: 'noun',
    phonetic: 'CHEL-oh',
    definition: 'A large four-stringed orchestral instrument played upright between the seated musician’s knees.',
    example: 'The solo cello opened the evening suite with a rich, velvety melody.',
  },
  ADAGIO: {
    partOfSpeech: 'adverb',
    phonetic: 'uh-DAH-joh',
    definition: 'In music, performed at a slow, unhurried, and deeply expressive tempo.',
    example: 'The string quartet lingered gracefully through the quiet adagio movement.',
  },
  CHORD: {
    partOfSpeech: 'noun',
    phonetic: 'kord',
    definition: 'Three or more musical pitches sounded together to create harmonic resonance.',
    example: 'She resolved the passage with a warm major chord on the grand piano.',
  },
  OBOE: {
    partOfSpeech: 'noun',
    phonetic: 'OH-boh',
    definition: 'A slender double-reed woodwind whose clear, penetrating tone tunes the entire orchestra.',
    example: 'Silence fell across the concert hall as the oboe sounded its steady A note.',
  },
  BATON: {
    partOfSpeech: 'noun',
    phonetic: 'buh-TON',
    definition: 'A lightweight tapered wand held by a conductor to shape rhythm, phrasing, and dynamics.',
    example: 'With one crisp lift of the baton, the brass section entered in unison.',
  },
  ARIA: {
    partOfSpeech: 'noun',
    phonetic: 'AR-ee-uh',
    definition: 'An expressive, self-contained solo vocal piece featured within an opera or cantata.',
    example: 'The soprano’s final aria drew a warm, sustained round of applause.',
  },
  OCTAVE: {
    partOfSpeech: 'noun',
    phonetic: 'OK-tiv',
    definition: 'The musical interval spanning eight diatonic notes where the higher pitch vibrates at double frequency.',
    example: 'The pianist repeated the main theme an octave higher for sparkling clarity.',
  },

  // World Architecture
  ATRIUM: {
    partOfSpeech: 'noun',
    phonetic: 'AY-tree-um',
    definition: 'An open-roofed or skylight-covered central courtyard rising through the heart of a building.',
    example: 'Daylight poured down into the museum atrium, illuminating the limestone steps.',
  },
  DOME: {
    partOfSpeech: 'noun',
    phonetic: 'dohm',
    definition: 'A rounded vault forming a hemispherical roof over a large hall or civic sanctuary.',
    example: 'Acoustic whispers carried clearly beneath the cathedral’s vaulted dome.',
  },
  ARCH: {
    partOfSpeech: 'noun',
    phonetic: 'arch',
    definition: 'A curved structural span that channels overhead weight cleanly into its supporting piers.',
    example: 'Centuries-old sandstone arches framed the sunlit walkway around the courtyard.',
  },
  FACADE: {
    partOfSpeech: 'noun',
    phonetic: 'fuh-SAHD',
    definition: 'The primary exterior front face of a building, often distinguished by sculptural ornament.',
    example: 'Golden late-afternoon light warmed the carved marble facade of the library.',
  },
  PILLAR: {
    partOfSpeech: 'noun',
    phonetic: 'PIL-er',
    definition: 'A tall vertical column of stone, timber, or steel supporting an architrave or roof.',
    example: 'Each fluted pillar along the portico was carved from a single block of travertine.',
  },
  PLAZA: {
    partOfSpeech: 'noun',
    phonetic: 'PLAH-zuh',
    definition: 'An open public square surrounded by civic buildings, arcades, or neighborhood cafés.',
    example: 'Neighbors gathered in the brick plaza to hear the Saturday string ensemble.',
  },
  FRIEZE: {
    partOfSpeech: 'noun',
    phonetic: 'freez',
    definition: 'A broad horizontal architectural band decorated with carved relief or painted motifs.',
    example: 'Botanical leaves and geometric knots ran along the carved stone frieze.',
  },

  // Alpine Trails
  SUMMIT: {
    partOfSpeech: 'noun',
    phonetic: 'SUM-it',
    definition: 'The highest crest or crowning point of a mountain or steep highland ridge.',
    example: 'From the wind-swept summit, hikers could trace three river valleys below.',
  },
  RIDGE: {
    partOfSpeech: 'noun',
    phonetic: 'rij',
    definition: 'A long, narrow elevated crest running between two sloping mountain flanks.',
    example: 'The footpath followed the sunlit granite ridge above the treeline.',
  },
  CAIRN: {
    partOfSpeech: 'noun',
    phonetic: 'kairn',
    definition: 'A carefully balanced mound of stones stacked to guide travelers along rocky trails.',
    example: 'A waist-high stone cairn marked the turn toward the upper alpine pass.',
  },
  GLACIER: {
    partOfSpeech: 'noun',
    phonetic: 'GLAY-sher',
    definition: 'A massive, slow-moving river of compacted ancient snow and crystalline ice.',
    example: 'Clear turquoise meltwater emerged from beneath the edge of the glacier.',
  },
  MEADOW: {
    partOfSpeech: 'noun',
    phonetic: 'MED-oh',
    definition: 'An open sunlit field carpeted with wild grasses and seasonal mountain blossoms.',
    example: 'Yellow lupines swayed across the quiet alpine meadow after the rain.',
  },
  PINE: {
    partOfSpeech: 'noun',
    phonetic: 'pyn',
    definition: 'An evergreen conifer bearing slender clustered needles and woody seed cones.',
    example: 'Warm sun drew a crisp resinous fragrance from the tall mountain pines.',
  },
  CREEK: {
    partOfSpeech: 'noun',
    phonetic: 'kreek',
    definition: 'A narrow, clear-flowing natural stream fed by springs or highland snowmelt.',
    example: 'Cold water tumbled over rounded pebbles along the shaded timber creek.',
  },

  // Literary Salon
  SONNET: {
    partOfSpeech: 'noun',
    phonetic: 'SON-it',
    definition: 'A classic fourteen-line lyric poem structured with a disciplined meter and rhyme scheme.',
    example: 'The final couplet of the sonnet turned the image into a quiet revelation.',
  },
  FOLIO: {
    partOfSpeech: 'noun',
    phonetic: 'FOH-lee-oh',
    definition: 'A large printing sheet folded once to create four pages, or a handsome bound volume.',
    example: 'The archivist carefully opened the cloth-bound botanical folio on the reading table.',
  },
  STANZA: {
    partOfSpeech: 'noun',
    phonetic: 'STAN-zuh',
    definition: 'A grouped set of poetic lines forming a recurring structural unit within a poem.',
    example: 'Each four-line stanza echoed the steady cadence of ocean waves.',
  },
  PROSE: {
    partOfSpeech: 'noun',
    phonetic: 'prohz',
    definition: 'Natural written or spoken language flowing in ordinary sentences without metrical verse.',
    example: 'Her travel essays were admired for their clear, unhurried prose.',
  },
  QUILL: {
    partOfSpeech: 'noun',
    phonetic: 'kwil',
    definition: 'A traditional writing pen fashioned from the hollow shaft of a large bird feather.',
    example: 'Calligraphers demonstrated how a trimmed goose quill holds archival ink.',
  },
  NOVEL: {
    partOfSpeech: 'noun',
    phonetic: 'NOV-ul',
    definition: 'An extended work of narrative fiction exploring characters and events in depth.',
    example: 'He finished the last chapter of the coastal novel beside a warm lamp.',
  },
  INDEX: {
    partOfSpeech: 'noun',
    phonetic: 'IN-deks',
    definition: 'An alphabetical reference list at the back of a book pointing to key subjects and page numbers.',
    example: 'She checked the index to locate the chapter on classical stone arches.',
  },

  // Mini Crossword & Additional Word Games Vocabulary
  PLANT: {
    partOfSpeech: 'noun',
    phonetic: 'plant',
    definition: 'A living photosynthetic organism rooted in soil or water, from herbs to towering trees.',
    example: 'Every morning she misted the potted ivy plant on the kitchen sill.',
  },
  SPORE: {
    partOfSpeech: 'noun',
    phonetic: 'spor',
    definition: 'A microscopic single-celled reproductive unit dispersed by ferns, mosses, and fungi.',
    example: 'Woodland ferns release clouds of golden spores on dry autumn breezes.',
  },
  ANTS: {
    partOfSpeech: 'noun',
    phonetic: 'ants',
    definition: 'Small social insects that build intricate colonies and forage in coordinated trails.',
    example: 'A tidy file of garden ants carried crumbs along the warm flagstone.',
  },
  POST: {
    partOfSpeech: 'noun',
    phonetic: 'pohst',
    definition: 'An upright beam of wood or stone set firmly into the ground as a support or marker.',
    example: 'Climbing jasmine wrapped neatly around the weathered cedar fence post.',
  },
  ACORN: {
    partOfSpeech: 'noun',
    phonetic: 'AY-korn',
    definition: 'The smooth oval nut of an oak tree nestled inside a textured woody cup.',
    example: 'Squirrels tucked dozens of shiny acorns beneath the roots of the old oak.',
  },
  TREES: {
    partOfSpeech: 'noun',
    phonetic: 'treez',
    definition: 'Tall perennial woody plants with sturdy trunks and spreading leafy canopies.',
    example: 'Rows of sycamore trees cast cool dappled shade across the park lane.',
  },
  STOW: {
    partOfSpeech: 'verb',
    phonetic: 'stoh',
    definition: 'To pack gear or supplies away neatly and securely, especially aboard a vessel.',
    example: 'Before setting sail, the crew made sure to stow the coiled ropes below deck.',
  },
  INERT: {
    partOfSpeech: 'adjective',
    phonetic: 'in-URT',
    definition: 'Completely motionless, inactive, or chemically unreactive under normal conditions.',
    example: 'The heavy iron buoy lay inert on the sandy slipway awaiting fresh paint.',
  },
  SONAR: {
    partOfSpeech: 'noun',
    phonetic: 'SOH-nar',
    definition: 'A navigation technique using underwater sound pulses to measure depth and map the seabed.',
    example: 'Marine researchers used gentle sonar sweeps to chart the sunken ridge.',
  },
  SHIPS: {
    partOfSpeech: 'noun',
    phonetic: 'ships',
    definition: 'Large seagoing vessels built to carry cargo or travelers across open oceans.',
    example: 'Three tall-masted ships glided past the breakwater at sunrise.',
  },
  OCEAN: {
    partOfSpeech: 'noun',
    phonetic: 'OH-shun',
    definition: 'A vast continuous expanse of deep saltwater covering most of Earth’s surface.',
    example: 'Cool breezes carried the clean scent of the open ocean into town.',
  },
  STAR: {
    partOfSpeech: 'noun',
    phonetic: 'star',
    definition: 'A luminous sphere of hot plasma shining across space through nuclear fusion.',
    example: 'Sailors once aligned their sextants with the steady northern star.',
  },
  GREEN: {
    partOfSpeech: 'adjective',
    phonetic: 'green',
    definition: 'Having the fresh, lively color of spring foliage, garden herbs, or sunlit jade.',
    example: 'Fresh green basil leaves perfumed the entire kitchen counter.',
  },
  LEAFY: {
    partOfSpeech: 'adjective',
    phonetic: 'LEE-fee',
    definition: 'Abundant with crisp leaves or shaded by dense green foliage.',
    example: 'The neighborhood library sits on a quiet, leafy residential street.',
  },
  BAGEL: {
    partOfSpeech: 'noun',
    phonetic: 'BAY-gul',
    definition: 'A dense, chewy ring-shaped bread roll boiled briefly before being baked crisp.',
    example: 'A warm sesame bagel with cream cheese made a simple Sunday breakfast.',
  },
  OPERA: {
    partOfSpeech: 'noun',
    phonetic: 'OP-er-uh',
    definition: 'A dramatic theatrical art form combining orchestral music, staging, and sung narrative.',
    example: 'The historic theater opened its autumn season with a classic Italian opera.',
  },
  HONEY: {
    partOfSpeech: 'noun',
    phonetic: 'HUN-ee',
    definition: 'A golden, naturally sweet nectar produced by bees from wildflower blossoms.',
    example: 'A spoonful of clover honey melted softly into her afternoon chamomile tea.',
  },
  SPACE: {
    partOfSpeech: 'noun',
    phonetic: 'spays',
    definition: 'The boundless expanse beyond Earth’s atmosphere where planets, stars, and galaxies travel.',
    example: 'Clear desert nights offer an unobstructed window into deep space.',
  },
  GLOWS: {
    partOfSpeech: 'verb',
    phonetic: 'glohz',
    definition: 'Emits a gentle, steady radiance without harsh glare.',
    example: 'The paper lantern glows warmly on the porch after twilight.',
  },
  TOTAL: {
    partOfSpeech: 'adjective',
    phonetic: 'TOH-tul',
    definition: 'Complete and entire, encompassing every part without exception.',
    example: 'During a total solar eclipse, the midday sky turns deep indigo.',
  },
  SIGHT: {
    partOfSpeech: 'noun',
    phonetic: 'syt',
    definition: 'The visual faculty of perceiving light, color, and form, or a memorable view.',
    example: 'Spotting a shooting star over the lake was an unforgettable sight.',
  },
  ABOUT: {
    partOfSpeech: 'preposition',
    phonetic: 'uh-BOWT',
    definition: 'Concerning a topic, or approximately near a given figure or location.',
    example: 'The monograph is about traditional Japanese woodblock printmaking.',
  },
  EASEL: {
    partOfSpeech: 'noun',
    phonetic: 'EE-zul',
    definition: 'A sturdy upright wooden frame used to hold an artist’s canvas or sketchboard.',
    example: 'She set her folding oak easel near the orchard to paint the late light.',
  },
  MUSIC: {
    partOfSpeech: 'noun',
    phonetic: 'MYOO-zik',
    definition: 'The expressive art of arranging sound in time through melody, harmony, and rhythm.',
    example: 'Soft acoustic music drifted across the courtyard during intermission.',
  },
  TANGO: {
    partOfSpeech: 'noun',
    phonetic: 'TANG-goh',
    definition: 'A poised, rhythmic partner dance and musical tradition originating in the Rio de la Plata.',
    example: 'A bandoneon and violin led the crisp opening bars of the tango.',
  },
  LASER: {
    partOfSpeech: 'noun',
    phonetic: 'LAY-zer',
    definition: 'A tightly focused beam of coherent single-wavelength light used in optics and precision tools.',
    example: 'Astronomers used a guide laser to calibrate the observatory mirror.',
  },
  METAL: {
    partOfSpeech: 'noun',
    phonetic: 'MET-ul',
    definition: 'A lustrous, malleable solid element or alloy such as bronze, silver, or brass.',
    example: 'Hand-hammered bronze metal gives concert cymbals their shimmering sustain.',
  },
  SONGS: {
    partOfSpeech: 'noun',
    phonetic: 'sawngz',
    definition: 'Short musical compositions pairing lyric verse with memorable vocal melodies.',
    example: 'The folk trio performed traditional maritime songs from the coastal archive.',
  },
  CHOIR: {
    partOfSpeech: 'noun',
    phonetic: 'KWY-er',
    definition: 'An organized ensemble of vocalists singing layered harmonies together.',
    example: 'The chamber choir rehearsed beneath the oak rafters every Thursday evening.',
  },
  TRAIN: {
    partOfSpeech: 'noun',
    phonetic: 'trayn',
    definition: 'A connected line of passenger or freight carriages traveling smoothly along iron rails.',
    example: 'The morning mountain train curved gracefully across the stone viaduct.',
  },
  ALOFT: {
    partOfSpeech: 'adverb',
    phonetic: 'uh-LAWFT',
    definition: 'High up in the air or positioned near the upper rigging of a sailing ship.',
    example: 'Steady coastal winds kept the paper kite soaring aloft for an hour.',
  },
  LANES: {
    partOfSpeech: 'noun',
    phonetic: 'laynz',
    definition: 'Narrow winding country roads or marked channels guiding steady passage.',
    example: 'Stone hedgerows bordered the quiet bicycle lanes outside the village.',
  },
  TRAIL: {
    partOfSpeech: 'noun',
    phonetic: 'trayl',
    definition: 'A marked footpath winding through woods, meadows, or mountain terrain.',
    example: 'Wooden signposts guided walkers along the four-mile lakeside trail.',
  },
  ADORN: {
    partOfSpeech: 'verb',
    phonetic: 'uh-DORN',
    definition: 'To enhance or decorate gracefully with thoughtful detail or ornament.',
    example: 'Hand-painted botanical tiles adorn the archway of the conservatory.',
  },
  NOTES: {
    partOfSpeech: 'noun',
    phonetic: 'nohts',
    definition: 'Brief written observations, or individual pitches in a musical score.',
    example: 'She kept neat pencil notes on wildflowers spotted during the hike.',
  },
  GROVE: {
    partOfSpeech: 'noun',
    phonetic: 'grohv',
    definition: 'A small, inviting cluster of trees—often olive, citrus, or orchard fruit.',
    example: 'Afternoon sunlight filtered softly through the quiet olive grove.',
  },
  EMBER: {
    partOfSpeech: 'noun',
    phonetic: 'EM-ber',
    definition: 'A small glowing piece of wood or coal radiating steady warmth in a dying fire.',
    example: 'One bright ember pulsed softly in the hearth long after midnight.',
  },
  FLUTE: {
    partOfSpeech: 'noun',
    phonetic: 'floot',
    definition: 'A slender woodwind instrument producing pure airy notes across a side embouchure.',
    example: 'The silver flute carried a bright pastoral melody over the strings.',
  },
  CRISP: {
    partOfSpeech: 'adjective',
    phonetic: 'krisp',
    definition: 'Brisk, clean, and invigorating, or pleasantly firm and fresh in texture.',
    example: 'A crisp October breeze rustled the gold maple leaves along the lane.',
  },
  PLUME: {
    partOfSpeech: 'noun',
    phonetic: 'ploom',
    definition: 'A soft decorative feather, or a tall graceful ribbon of rising mist or steam.',
    example: 'A pale plume of kettle steam curled upward in the cool morning kitchen.',
  },
  HAVEN: {
    partOfSpeech: 'noun',
    phonetic: 'HAY-vun',
    definition: 'A sheltered harbor or peaceful sanctuary offering calm rest and safety.',
    example: 'The quiet walled courtyard served as a green haven in the center of town.',
  },
  QUILT: {
    partOfSpeech: 'noun',
    phonetic: 'kwilt',
    definition: 'A warm stitched coverlet crafted by layering patterned fabric over soft batting.',
    example: 'A hand-stitched indigo quilt was folded neatly across the reading chair.',
  },
  LINEN: {
    partOfSpeech: 'noun',
    phonetic: 'LIN-in',
    definition: 'A cool, durable woven textile spun from natural flax plant fibers.',
    example: 'Crisp natural linen curtains softened the afternoon sun in the studio.',
  },
  SPARK: {
    partOfSpeech: 'noun',
    phonetic: 'spark',
    definition: 'A brief luminous flash of light or a sudden lively flash of creative insight.',
    example: 'One unexpected clue provided the spark that unlocked the entire crossword.',
  },
  FJORD: {
    partOfSpeech: 'noun',
    phonetic: 'fyord',
    definition: 'A deep, narrow sea inlet flanked by dramatic sheer cliffs carved by ancient glaciers.',
    example: 'The ferry glided silently across the mirror-calm waters of the northern fjord.',
  },
  TEMPO: {
    partOfSpeech: 'noun',
    phonetic: 'TEM-poh',
    definition: 'The measured speed or rhythmic pulse at which a musical work unfolds.',
    example: 'The conductor set a lively, unhurried tempo for the opening waltz.',
  },
  MAPLE: {
    partOfSpeech: 'noun',
    phonetic: 'MAY-pul',
    definition: 'A broad-leaved shade tree celebrated for its crimson autumn leaves and sweet sap.',
    example: 'A towering sugar maple framed the corner of the historic town square.',
  },
  AMBER: {
    partOfSpeech: 'noun',
    phonetic: 'AM-ber',
    definition: 'Translucent honey-gold fossilized tree resin treasured since antiquity.',
    example: 'Sunlight turned the polished Baltic amber pendant a warm glowing gold.',
  },
  SCONE: {
    partOfSpeech: 'noun',
    phonetic: 'skohn',
    definition: 'A tender, lightly sweetened baked biscuit traditionally enjoyed warm with tea and jam.',
    example: 'Fresh currant scones came out of the oven just as the kettle whistled.',
  },
  YEAST: {
    partOfSpeech: 'noun',
    phonetic: 'yeest',
    definition: 'A beneficial single-celled fungus that gently leavens bread dough into airy loaves.',
    example: 'Warm water awakened the baker’s yeast within ten minutes.',
  },
  GLAZE: {
    partOfSpeech: 'noun',
    phonetic: 'glayz',
    definition: 'A smooth, glossy culinary coating or vitreous ceramic finish.',
    example: 'She brushed a light lemon glaze across the warm almond pastries.',
  },
  CRUMB: {
    partOfSpeech: 'noun',
    phonetic: 'krum',
    definition: 'The soft tender interior structure of baked bread, or a tiny morsel of pastry.',
    example: 'Slow fermentation gave the sourdough loaf an open, silky crumb.',
  },
  WHISK: {
    partOfSpeech: 'noun',
    phonetic: 'wisk',
    definition: 'A looped wire culinary tool crafted to blend batters smoothly or whip airy cream.',
    example: 'A few brisk turns with the wire whisk folded air neatly into the custard.',
  },
  GLEAM: {
    partOfSpeech: 'noun',
    phonetic: 'gleem',
    definition: 'A soft, brief shimmer of reflected or distant light.',
    example: 'A faint silver gleam on the horizon signaled the rising moon.',
  },
  SHOAL: {
    partOfSpeech: 'noun',
    phonetic: 'shohl',
    definition: 'A shallow sandbar beneath coastal water, or a shimmering school of fish swimming together.',
    example: 'The sailboat steered cleanly around the sunlit sandy shoal.',
  },
  STERN: {
    partOfSpeech: 'noun',
    phonetic: 'sturn',
    definition: 'The rear-most section of a boat or ship where the rudder sits.',
    example: 'From the wooden stern, she watched silver ripples trail behind the ferry.',
  },
  DRIFT: {
    partOfSpeech: 'verb',
    phonetic: 'drift',
    definition: 'To move effortlessly along with a gentle current, tide, or evening breeze.',
    example: 'White clouds began to drift slowly above the lighthouse ridge.',
  },
  BLOOM: {
    partOfSpeech: 'verb',
    phonetic: 'bloom',
    definition: 'To open into full blossom or flourish with fresh vitality.',
    example: 'Heirloom peonies begin to bloom across the conservatory every May.',
  },
  MOSSY: {
    partOfSpeech: 'adjective',
    phonetic: 'MAW-see',
    definition: 'Softly carpeted or bordered with cushiony green woodland moss.',
    example: 'Stepping stones wound across the cool mossy floor of the fern garden.',
  },
};

export function lookupDictionaryEntry(
  rawWord: string,
  fallbackClue?: string
): DictionaryEntry {
  const normalized = rawWord.trim().toUpperCase();
  const match = CURATED_ENTRIES[normalized];
  if (match) {
    return {
      word: normalized,
      ...match,
    };
  }
  return {
    word: normalized,
    partOfSpeech: 'vocabulary',
    phonetic: normalized.toLowerCase(),
    definition:
      fallbackClue?.trim() ||
      'A featured word from today’s LexiLoom puzzle collection.',
    example: `You uncovered “${normalized.toLowerCase()}” during your LexiLoom puzzle session.`,
  };
}
