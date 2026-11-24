export interface IllustratedAvatar {
  id: string;
  label: string;
  src: string;
  fallbackBg: string;
  alt: string;
}

export const ILLUSTRATED_AVATARS: IllustratedAvatar[] = [
  {
    id: 'owl',
    label: 'Scholar Owl',
    src: '/src/assets/images/avatar_owl_1795147346890.jpg',
    fallbackBg: '#3D5A52',
    alt: 'Illustrated scholar owl wearing brass spectacles beside stacked vintage books',
  },
  {
    id: 'fox',
    label: 'Quill Fox',
    src: '/src/assets/images/avatar_fox_1795147347194.jpg',
    fallbackBg: '#1F5C63',
    alt: 'Illustrated red fox in a tweed collar holding an antique fountain pen',
  },
  {
    id: 'compass',
    label: 'Brass Compass',
    src: '/src/assets/images/avatar_compass_1795147347127.jpg',
    fallbackBg: '#1D2D3E',
    alt: 'Illustrated antique brass maritime compass rose on slate navy',
  },
  {
    id: 'botanical',
    label: 'Botanical Lexicon',
    src: '/src/assets/images/avatar_botanical_1795147346493.jpg',
    fallbackBg: '#2A473E',
    alt: 'Illustrated open leather-bound lexicon framed by olive and eucalyptus leaves',
  },
  {
    id: 'celestial',
    label: 'Astrolabe Moon',
    src: '/src/assets/images/avatar_celestial_1795147346418.jpg',
    fallbackBg: '#162438',
    alt: 'Illustrated golden crescent moon with antique brass astrolabe rings',
  },
];

export interface MonogramPalette {
  id: string;
  label: string;
  bgHex: string;
  textHex: string;
}

export const MONOGRAM_PALETTES: MonogramPalette[] = [
  { id: 'pine', label: 'Forest Pine', bgHex: '#176B52', textHex: '#FFFFFF' },
  { id: 'slate', label: 'Deep Slate', bgHex: '#243447', textHex: '#F8FAFC' },
  { id: 'amber', label: 'Warm Ochre', bgHex: '#9A5B13', textHex: '#FFFFFF' },
  { id: 'plum', label: 'Burgundy Ink', bgHex: '#6B2D46', textHex: '#FFFFFF' },
  { id: 'cobalt', label: 'Maritime Blue', bgHex: '#1E4E79', textHex: '#FFFFFF' },
  { id: 'moss', label: 'Olive Sage', bgHex: '#4A5D3F', textHex: '#FFFFFF' },
];

export function getIllustratedAvatarById(id: string): IllustratedAvatar {
  return (
    ILLUSTRATED_AVATARS.find((item) => item.id === id) || ILLUSTRATED_AVATARS[0]
  );
}
