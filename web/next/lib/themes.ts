export interface TripTheme {
  id: string;
  label: string;
  emoji: string;
  coverUrl: string;
  gradientFrom: string;
  gradientMid: string;
  category: 'nature' | 'city';
}

export const TRIP_THEMES: TripTheme[] = [
  // Nature
  { id: 'beach',       label: 'Playa',     emoji: '🏖️', coverUrl: '/themes/beach.svg',       gradientFrom: 'rgba(230,150,20,0.80)', gradientMid: 'rgba(180,80,10,0.65)',   category: 'nature' },
  { id: 'mountain',    label: 'Montaña',   emoji: '🏔️', coverUrl: '/themes/mountain.svg',    gradientFrom: 'rgba(50,80,160,0.82)',  gradientMid: 'rgba(20,40,100,0.68)',   category: 'nature' },
  { id: 'forest',      label: 'Bosque',    emoji: '🌲', coverUrl: '/themes/forest.svg',      gradientFrom: 'rgba(15,65,25,0.88)',   gradientMid: 'rgba(8,45,15,0.72)',     category: 'nature' },
  { id: 'ocean',       label: 'Mar',       emoji: '🌊', coverUrl: '/themes/ocean.svg',       gradientFrom: 'rgba(8,75,150,0.85)',   gradientMid: 'rgba(4,45,100,0.70)',    category: 'nature' },
  { id: 'desert',      label: 'Desierto',  emoji: '🏜️', coverUrl: '/themes/desert.svg',      gradientFrom: 'rgba(195,90,15,0.82)', gradientMid: 'rgba(150,50,8,0.68)',    category: 'nature' },
  { id: 'cold',        label: 'Nieve',     emoji: '❄️', coverUrl: '/themes/cold.svg',        gradientFrom: 'rgba(70,150,220,0.78)', gradientMid: 'rgba(30,90,160,0.63)',  category: 'nature' },
  // Cities
  { id: 'city',        label: 'Ciudad',    emoji: '🏙️', coverUrl: '/themes/city.svg',        gradientFrom: 'rgba(25,45,110,0.82)',  gradientMid: 'rgba(10,25,70,0.68)',    category: 'city' },
  { id: 'paris',       label: 'París',     emoji: '🗼', coverUrl: '/themes/paris.svg',       gradientFrom: 'rgba(110,80,20,0.82)', gradientMid: 'rgba(70,50,10,0.68)',    category: 'city' },
  { id: 'london',      label: 'Londres',   emoji: '🎡', coverUrl: '/themes/london.svg',      gradientFrom: 'rgba(140,15,15,0.78)', gradientMid: 'rgba(90,8,8,0.63)',      category: 'city' },
  { id: 'newyork',     label: 'New York',  emoji: '🗽', coverUrl: '/themes/newyork.svg',     gradientFrom: 'rgba(15,45,110,0.82)', gradientMid: 'rgba(8,25,70,0.68)',     category: 'city' },
  { id: 'tokyo',       label: 'Tokyo',     emoji: '⛩️', coverUrl: '/themes/tokyo.svg',       gradientFrom: 'rgba(160,15,35,0.78)', gradientMid: 'rgba(100,8,20,0.63)',    category: 'city' },
  { id: 'buenosaires', label: 'Bs. Aires', emoji: '🫶', coverUrl: '/themes/buenosaires.svg', gradientFrom: 'rgba(20,70,170,0.82)', gradientMid: 'rgba(10,45,120,0.68)',   category: 'city' },
];

export function getTheme(coverUrl?: string): TripTheme | undefined {
  if (!coverUrl) return undefined;
  return TRIP_THEMES.find(t => t.coverUrl === coverUrl);
}
