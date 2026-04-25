export interface TripTheme {
  id: string;
  label: string;
  emoji: string;
  coverUrl: string;
  gradientFrom: string;
  gradientMid: string;
  category: 'nature' | 'city';
  groupId: string;
}

export const TRIP_THEMES: TripTheme[] = [
  // Nature — Beach
  { id: 'beach',     label: 'Playa',     emoji: '🏖️', coverUrl: '/themes/beach.svg',     gradientFrom: 'rgba(230,150,20,0.80)',  gradientMid: 'rgba(180,80,10,0.65)',   category: 'nature', groupId: 'beach' },
  { id: 'beach-2',   label: 'Playa II',  emoji: '🏖️', coverUrl: '/themes/beach-2.svg',   gradientFrom: 'rgba(0,150,210,0.80)',   gradientMid: 'rgba(0,90,150,0.65)',    category: 'nature', groupId: 'beach' },
  { id: 'beach-3',   label: 'Playa III', emoji: '🏖️', coverUrl: '/themes/beach-3.svg',   gradientFrom: 'rgba(2,12,40,0.90)',    gradientMid: 'rgba(1,8,30,0.75)',      category: 'nature', groupId: 'beach' },
  { id: 'beach-4',   label: 'Playa IV',  emoji: '🏖️', coverUrl: '/themes/beach-4.svg',   gradientFrom: 'rgba(0,90,170,0.82)',   gradientMid: 'rgba(0,60,120,0.68)',    category: 'nature', groupId: 'beach' },
  // Nature — Mountain
  { id: 'mountain',   label: 'Montaña',    emoji: '🏔️', coverUrl: '/themes/mountain.svg',   gradientFrom: 'rgba(50,80,160,0.82)',   gradientMid: 'rgba(20,40,100,0.68)',   category: 'nature', groupId: 'mountain' },
  { id: 'mountain-2', label: 'Montaña II', emoji: '🏔️', coverUrl: '/themes/mountain-2.svg', gradientFrom: 'rgba(220,80,10,0.82)',   gradientMid: 'rgba(150,30,5,0.68)',    category: 'nature', groupId: 'mountain' },
  { id: 'mountain-3', label: 'Montaña III',emoji: '🏔️', coverUrl: '/themes/mountain-3.svg', gradientFrom: 'rgba(20,100,50,0.80)',   gradientMid: 'rgba(10,60,30,0.65)',    category: 'nature', groupId: 'mountain' },
  { id: 'mountain-4', label: 'Montaña IV', emoji: '🏔️', coverUrl: '/themes/mountain-4.svg', gradientFrom: 'rgba(180,30,5,0.88)',    gradientMid: 'rgba(80,10,2,0.75)',     category: 'nature', groupId: 'mountain' },
  // Nature — Forest
  { id: 'forest',   label: 'Bosque',    emoji: '🌲', coverUrl: '/themes/forest.svg',   gradientFrom: 'rgba(15,65,25,0.88)',    gradientMid: 'rgba(8,45,15,0.72)',     category: 'nature', groupId: 'forest' },
  { id: 'forest-2', label: 'Bosque II', emoji: '🌲', coverUrl: '/themes/forest-2.svg', gradientFrom: 'rgba(180,80,10,0.85)',   gradientMid: 'rgba(120,40,5,0.70)',    category: 'nature', groupId: 'forest' },
  { id: 'forest-3', label: 'Bosque III',emoji: '🌲', coverUrl: '/themes/forest-3.svg', gradientFrom: 'rgba(50,80,100,0.78)',   gradientMid: 'rgba(30,55,75,0.63)',    category: 'nature', groupId: 'forest' },
  { id: 'forest-4', label: 'Bosque IV', emoji: '🌲', coverUrl: '/themes/forest-4.svg', gradientFrom: 'rgba(10,80,30,0.88)',    gradientMid: 'rgba(5,50,18,0.73)',     category: 'nature', groupId: 'forest' },
  // Nature — Ocean
  { id: 'ocean',   label: 'Mar',    emoji: '🌊', coverUrl: '/themes/ocean.svg',   gradientFrom: 'rgba(8,75,150,0.85)',    gradientMid: 'rgba(4,45,100,0.70)',    category: 'nature', groupId: 'ocean' },
  { id: 'ocean-2', label: 'Mar II', emoji: '🌊', coverUrl: '/themes/ocean-2.svg', gradientFrom: 'rgba(0,100,190,0.82)',   gradientMid: 'rgba(0,60,130,0.68)',    category: 'nature', groupId: 'ocean' },
  { id: 'ocean-3', label: 'Mar III',emoji: '🌊', coverUrl: '/themes/ocean-3.svg', gradientFrom: 'rgba(160,40,8,0.82)',    gradientMid: 'rgba(100,20,5,0.68)',    category: 'nature', groupId: 'ocean' },
  { id: 'ocean-4', label: 'Mar IV', emoji: '🌊', coverUrl: '/themes/ocean-4.svg', gradientFrom: 'rgba(0,160,180,0.80)',   gradientMid: 'rgba(0,100,120,0.65)',   category: 'nature', groupId: 'ocean' },
  // Nature — Desert
  { id: 'desert',   label: 'Desierto',    emoji: '🏜️', coverUrl: '/themes/desert.svg',   gradientFrom: 'rgba(195,90,15,0.82)',  gradientMid: 'rgba(150,50,8,0.68)',    category: 'nature', groupId: 'desert' },
  { id: 'desert-2', label: 'Desierto II', emoji: '🏜️', coverUrl: '/themes/desert-2.svg', gradientFrom: 'rgba(200,130,20,0.82)', gradientMid: 'rgba(160,90,10,0.68)',   category: 'nature', groupId: 'desert' },
  { id: 'desert-3', label: 'Desierto III',emoji: '🏜️', coverUrl: '/themes/desert-3.svg', gradientFrom: 'rgba(140,30,8,0.85)',   gradientMid: 'rgba(90,15,4,0.70)',     category: 'nature', groupId: 'desert' },
  { id: 'desert-4', label: 'Desierto IV', emoji: '🏜️', coverUrl: '/themes/desert-4.svg', gradientFrom: 'rgba(4,8,28,0.92)',     gradientMid: 'rgba(2,5,18,0.78)',      category: 'nature', groupId: 'desert' },
  // Nature — Cold
  { id: 'cold',   label: 'Nieve',    emoji: '❄️', coverUrl: '/themes/cold.svg',   gradientFrom: 'rgba(70,150,220,0.78)',  gradientMid: 'rgba(30,90,160,0.63)',   category: 'nature', groupId: 'cold' },
  { id: 'cold-2', label: 'Nieve II', emoji: '❄️', coverUrl: '/themes/cold-2.svg', gradientFrom: 'rgba(120,150,180,0.80)', gradientMid: 'rgba(80,110,140,0.65)',  category: 'nature', groupId: 'cold' },
  { id: 'cold-3', label: 'Nieve III',emoji: '❄️', coverUrl: '/themes/cold-3.svg', gradientFrom: 'rgba(60,20,80,0.80)',    gradientMid: 'rgba(40,10,55,0.65)',    category: 'nature', groupId: 'cold' },
  { id: 'cold-4', label: 'Nieve IV', emoji: '❄️', coverUrl: '/themes/cold-4.svg', gradientFrom: 'rgba(2,15,30,0.88)',     gradientMid: 'rgba(1,8,20,0.73)',      category: 'nature', groupId: 'cold' },
  // Cities — City
  { id: 'city',   label: 'Ciudad',    emoji: '🏙️', coverUrl: '/themes/city.svg',   gradientFrom: 'rgba(25,45,110,0.82)',   gradientMid: 'rgba(10,25,70,0.68)',    category: 'city', groupId: 'city' },
  { id: 'city-2', label: 'Ciudad II', emoji: '🏙️', coverUrl: '/themes/city-2.svg', gradientFrom: 'rgba(80,10,120,0.85)',   gradientMid: 'rgba(40,5,70,0.70)',     category: 'city', groupId: 'city' },
  { id: 'city-3', label: 'Ciudad III',emoji: '🏙️', coverUrl: '/themes/city-3.svg', gradientFrom: 'rgba(2,4,12,0.95)',      gradientMid: 'rgba(1,2,8,0.80)',       category: 'city', groupId: 'city' },
  { id: 'city-4', label: 'Ciudad IV', emoji: '🏙️', coverUrl: '/themes/city-4.svg', gradientFrom: 'rgba(10,25,90,0.85)',    gradientMid: 'rgba(5,15,60,0.70)',     category: 'city', groupId: 'city' },
  // Cities — Paris
  { id: 'paris',   label: 'París',    emoji: '🗼', coverUrl: '/themes/paris.svg',   gradientFrom: 'rgba(110,80,20,0.82)',  gradientMid: 'rgba(70,50,10,0.68)',    category: 'city', groupId: 'paris' },
  { id: 'paris-2', label: 'París II', emoji: '🗼', coverUrl: '/themes/paris-2.svg', gradientFrom: 'rgba(2,8,35,0.90)',     gradientMid: 'rgba(1,5,25,0.75)',      category: 'city', groupId: 'paris' },
  { id: 'paris-3', label: 'París III',emoji: '🗼', coverUrl: '/themes/paris-3.svg', gradientFrom: 'rgba(80,40,10,0.82)',   gradientMid: 'rgba(50,25,5,0.68)',     category: 'city', groupId: 'paris' },
  { id: 'paris-4', label: 'París IV', emoji: '🗼', coverUrl: '/themes/paris-4.svg', gradientFrom: 'rgba(90,45,8,0.85)',    gradientMid: 'rgba(50,20,4,0.70)',     category: 'city', groupId: 'paris' },
  // Cities — London
  { id: 'london',   label: 'Londres',    emoji: '🎡', coverUrl: '/themes/london.svg',   gradientFrom: 'rgba(140,15,15,0.78)',  gradientMid: 'rgba(90,8,8,0.63)',      category: 'city', groupId: 'london' },
  { id: 'london-2', label: 'Londres II', emoji: '🎡', coverUrl: '/themes/london-2.svg', gradientFrom: 'rgba(5,15,45,0.88)',    gradientMid: 'rgba(3,8,30,0.73)',      category: 'city', groupId: 'london' },
  { id: 'london-3', label: 'Londres III',emoji: '🎡', coverUrl: '/themes/london-3.svg', gradientFrom: 'rgba(12,22,48,0.85)',   gradientMid: 'rgba(8,15,35,0.70)',     category: 'city', groupId: 'london' },
  { id: 'london-4', label: 'Londres IV', emoji: '🎡', coverUrl: '/themes/london-4.svg', gradientFrom: 'rgba(20,30,40,0.85)',   gradientMid: 'rgba(12,20,28,0.70)',    category: 'city', groupId: 'london' },
  // Cities — New York
  { id: 'newyork',   label: 'New York',    emoji: '🗽', coverUrl: '/themes/newyork.svg',   gradientFrom: 'rgba(15,45,110,0.82)',  gradientMid: 'rgba(8,25,70,0.68)',     category: 'city', groupId: 'newyork' },
  { id: 'newyork-2', label: 'New York II', emoji: '🗽', coverUrl: '/themes/newyork-2.svg', gradientFrom: 'rgba(4,10,35,0.90)',    gradientMid: 'rgba(2,5,22,0.75)',      category: 'city', groupId: 'newyork' },
  { id: 'newyork-3', label: 'New York III',emoji: '🗽', coverUrl: '/themes/newyork-3.svg', gradientFrom: 'rgba(15,60,120,0.82)',  gradientMid: 'rgba(8,40,85,0.68)',     category: 'city', groupId: 'newyork' },
  { id: 'newyork-4', label: 'New York IV', emoji: '🗽', coverUrl: '/themes/newyork-4.svg', gradientFrom: 'rgba(2,4,12,0.92)',     gradientMid: 'rgba(1,2,8,0.78)',       category: 'city', groupId: 'newyork' },
  // Cities — Tokyo
  { id: 'tokyo',   label: 'Tokyo',    emoji: '⛩️', coverUrl: '/themes/tokyo.svg',   gradientFrom: 'rgba(160,15,35,0.78)',  gradientMid: 'rgba(100,8,20,0.63)',    category: 'city', groupId: 'tokyo' },
  { id: 'tokyo-2', label: 'Tokyo II', emoji: '⛩️', coverUrl: '/themes/tokyo-2.svg', gradientFrom: 'rgba(1,2,6,0.95)',      gradientMid: 'rgba(0,1,4,0.80)',       category: 'city', groupId: 'tokyo' },
  { id: 'tokyo-3', label: 'Tokyo III',emoji: '⛩️', coverUrl: '/themes/tokyo-3.svg', gradientFrom: 'rgba(140,40,10,0.85)',  gradientMid: 'rgba(80,15,5,0.70)',     category: 'city', groupId: 'tokyo' },
  { id: 'tokyo-4', label: 'Tokyo IV', emoji: '⛩️', coverUrl: '/themes/tokyo-4.svg', gradientFrom: 'rgba(2,4,8,0.92)',      gradientMid: 'rgba(1,2,5,0.78)',       category: 'city', groupId: 'tokyo' },
  // Cities — Buenos Aires
  { id: 'buenosaires',   label: 'Bs. Aires',    emoji: '🫶', coverUrl: '/themes/buenosaires.svg',   gradientFrom: 'rgba(20,70,170,0.82)',  gradientMid: 'rgba(10,45,120,0.68)',   category: 'city', groupId: 'buenosaires' },
  { id: 'buenosaires-2', label: 'Bs. Aires II', emoji: '🫶', coverUrl: '/themes/buenosaires-2.svg', gradientFrom: 'rgba(15,80,160,0.82)',  gradientMid: 'rgba(8,50,110,0.68)',    category: 'city', groupId: 'buenosaires' },
  { id: 'buenosaires-3', label: 'Bs. Aires III',emoji: '🫶', coverUrl: '/themes/buenosaires-3.svg', gradientFrom: 'rgba(15,80,168,0.85)',  gradientMid: 'rgba(8,50,115,0.70)',    category: 'city', groupId: 'buenosaires' },
  { id: 'buenosaires-4', label: 'Bs. Aires IV', emoji: '🫶', coverUrl: '/themes/buenosaires-4.svg', gradientFrom: 'rgba(8,20,80,0.85)',    gradientMid: 'rgba(4,12,55,0.70)',     category: 'city', groupId: 'buenosaires' },
  // Cities — Rio de Janeiro
  { id: 'rio',   label: 'Rio',    emoji: '🌴', coverUrl: '/themes/rio.svg',   gradientFrom: 'rgba(0,120,100,0.82)',  gradientMid: 'rgba(0,70,60,0.68)',     category: 'city', groupId: 'rio' },
  { id: 'rio-2', label: 'Rio II', emoji: '🌴', coverUrl: '/themes/rio-2.svg', gradientFrom: 'rgba(60,10,100,0.88)',  gradientMid: 'rgba(30,5,60,0.73)',     category: 'city', groupId: 'rio' },
  { id: 'rio-3', label: 'Rio III',emoji: '🌴', coverUrl: '/themes/rio-3.svg', gradientFrom: 'rgba(0,100,160,0.82)',  gradientMid: 'rgba(0,60,100,0.68)',    category: 'city', groupId: 'rio' },
  { id: 'rio-4', label: 'Rio IV', emoji: '🌴', coverUrl: '/themes/rio-4.svg', gradientFrom: 'rgba(80,5,50,0.88)',    gradientMid: 'rgba(40,2,25,0.73)',     category: 'city', groupId: 'rio' },
];

export function getTheme(coverUrl?: string): TripTheme | undefined {
  if (!coverUrl) return undefined;
  return TRIP_THEMES.find(t => t.coverUrl === coverUrl);
}
