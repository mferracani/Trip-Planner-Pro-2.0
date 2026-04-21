// Design tokens — Trip Planner Pro 2
// Dark mode premium system per DESIGN_BRIEF.md

const TOKENS = {
  bg: {
    base: '#0D0D0D',
    surface: '#1A1A1A',
    elevated: '#242424',
    border: '#333333',
    borderSoft: '#262626',
    modalBackdrop: 'rgba(0,0,0,0.72)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    tertiary: '#707070',
    quaternary: '#4D4D4D',
  },
  accent: {
    blue:   '#0A84FF',
    green:  '#30D158',
    orange: '#FF9F0A',
    red:    '#FF453A',
    purple: '#BF5AF2',
  },
  // Paleta rotativa de ciudades
  cities: [
    { key: 'coral',   hex: '#FF6B6B' },
    { key: 'teal',    hex: '#4ECDC4' },
    { key: 'yellow',  hex: '#FFD93D' },
    { key: 'mint',    hex: '#95E1D3' },
    { key: 'lavender',hex: '#C77DFF' },
    { key: 'salmon',  hex: '#FF8FA3' },
    { key: 'green',   hex: '#6BCB77' },
    { key: 'blue',    hex: '#4D96FF' },
  ],
  radius: { sm: 8, md: 12, lg: 16, xl: 20, pill: 999 },
  space: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 },
  font: {
    // Inter Tight como sustituto SF Pro
    family: `'Inter Tight', -apple-system, BlinkMacSystemFont, system-ui, sans-serif`,
    mono: `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace`,
  },
};

// Helpers para colores de ciudad con alpha
function cityBg(hex, alpha = 0.14) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function cityFg(hex, alpha = 1) {
  return cityBg(hex, alpha);
}

// ═══════════════════════════════════════════════════════════════
// MOCK DATA — Viaje Europa 14 días
// ═══════════════════════════════════════════════════════════════

const MOCK_TRIP = {
  id: 'europa-2026',
  name: 'Europa Primavera',
  start: '2026-03-15',
  end:   '2026-03-28',
  coverLabel: 'barcelona · sagrada familia',
  totalUSD: 4820,
  status: 'planned', // planned | active | past
  cities: [
    { id:'mad', name:'Madrid',    short:'MAD', country:'ES', colorIdx:0, days:['2026-03-16','2026-03-17','2026-03-18','2026-03-19'] },
    { id:'bcn', name:'Barcelona', short:'BCN', country:'ES', colorIdx:1, days:['2026-03-20','2026-03-21','2026-03-22','2026-03-23'] },
    { id:'rom', name:'Roma',      short:'ROM', country:'IT', colorIdx:2, days:['2026-03-24','2026-03-25','2026-03-26','2026-03-27'] },
  ],
  items: [
    // Flights
    { id:'f1', type:'flight', airline:'Iberia', code:'IB6844', from:'EZE', to:'MAD',
      dateLocal:'2026-03-15', timeLocal:'21:35', tzFrom:'America/Argentina/Buenos_Aires', tzTo:'Europe/Madrid',
      arrDate:'2026-03-16', arrTime:'14:20', duration:'12h 45m', cabin:'Business', seat:'24A',
      code6:'ABC123', price:742, currency:'EUR', priceUSD:810 },
    { id:'f2', type:'flight', airline:'Vueling', code:'VY1004', from:'MAD', to:'BCN',
      dateLocal:'2026-03-20', timeLocal:'10:15', arrDate:'2026-03-20', arrTime:'11:35',
      duration:'1h 20m', cabin:'Economy', seat:'12C', code6:'VY8821', price:68, currency:'EUR', priceUSD:74 },
    { id:'f3', type:'flight', airline:'Vueling', code:'VY6304', from:'BCN', to:'FCO',
      dateLocal:'2026-03-24', timeLocal:'09:40', arrDate:'2026-03-24', arrTime:'11:50',
      duration:'2h 10m', cabin:'Economy', seat:'8A', code6:'VY9932', price:112, currency:'EUR', priceUSD:122 },
    { id:'f4', type:'flight', airline:'Iberia', code:'IB6845', from:'FCO', to:'EZE',
      dateLocal:'2026-03-27', timeLocal:'22:10', arrDate:'2026-03-28', arrTime:'07:30',
      duration:'13h 20m', cabin:'Business', seat:'22B', code6:'ABC778', price:795, currency:'EUR', priceUSD:867 },
    // Hotels
    { id:'h1', type:'hotel', name:'NH Collection Paseo del Prado', chain:'NH', cityId:'mad',
      checkIn:'2026-03-16', checkOut:'2026-03-20', nights:4, room:'Deluxe King',
      code6:'NH-442189', price:612, currency:'EUR', priceUSD:668 },
    { id:'h2', type:'hotel', name:'H10 Casa Mimosa', chain:'H10', cityId:'bcn',
      checkIn:'2026-03-20', checkOut:'2026-03-24', nights:4, room:'Double Sea View',
      code6:'H10-88721', price:735, currency:'EUR', priceUSD:801 },
    { id:'h3', type:'hotel', name:'Hotel Artemide', chain:'Artemide', cityId:'rom',
      checkIn:'2026-03-24', checkOut:'2026-03-27', nights:3, room:'Classic Double',
      code6:'ART-1127', price:540, currency:'EUR', priceUSD:588 },
    // Transits
    { id:'t1', type:'transit', mode:'train', provider:'Renfe AVE', code:'9724',
      from:'Madrid Atocha', to:'Barcelona Sants', fromShort:'MAD', toShort:'BCN',
      dateLocal:'2026-03-23', timeLocal:'18:30', arrDate:'2026-03-23', arrTime:'21:05',
      duration:'2h 35m', seat:'Coach 5 · 14D', price:89, currency:'EUR', priceUSD:97 },
  ],
};

// Compute expenses
const MOCK_STATS = {
  tripsYear: 3,
  citiesVisited: 7,
  daysTraveling: 38,
  totalSpentUSD: 12480,
};

// Todos los viajes para la lista
const MOCK_TRIPS_LIST = [
  { id:'europa-2026', name:'Europa Primavera', start:'2026-03-15', end:'2026-03-28', totalUSD:4820, status:'planned', cover:'barcelona' },
  { id:'tokyo-2026',  name:'Tokio + Kyoto',    start:'2026-05-10', end:'2026-05-22', totalUSD:3950, status:'planned', cover:'tokyo' },
  { id:'nyc-2026',    name:'NYC Weekend',      start:'2026-01-23', end:'2026-01-26', totalUSD:1280, status:'past',    cover:'nyc' },
  { id:'bariloche-25',name:'Bariloche',        start:'2025-09-12', end:'2025-09-18', totalUSD:890,  status:'past',    cover:'bariloche' },
];

// Mensajes de saludo contextual
const GREETINGS = {
  idle:       'Hola, Mati',
  soon:       'Tu próximo viaje empieza pronto',
  departure:  'Buen viaje, Mati ✈',
  during:     'Día 3 en Madrid · ☀ 18°',
  lastday:    'Último día en Barcelona',
  return:     'Bienvenido a casa, Mati',
  postTrip:   'Buen reencuentro con Buenos Aires',
};

// Ejemplos prearmados para el Modal IA Chat
const PARSE_EXAMPLES = [
  {
    kind: 'flight',
    input: `Vuelo Iberia IB6844 de Buenos Aires (EZE) a Madrid (MAD) el 15/03/2026.
Salida 21:35 hora local, llegada 14:20 del 16/03 hora Madrid.
Clase Business, asiento 24A, código ABC123. EUR 742.`,
    result: {
      items: [{
        type:'flight', airline:'Iberia', code:'IB6844',
        from:'EZE', to:'MAD', date:'15 mar 2026', time:'21:35',
        price:'€742', confidence:0.92,
      }],
      tokens: 847, latency: 1840,
    },
  },
  {
    kind: 'hotel',
    input: `Booking confirmado: H10 Casa Mimosa, Barcelona.
Check-in 20 de marzo, check-out 24 de marzo.
Habitación Double Sea View. Total €735. Código de reserva H10-88721.`,
    result: {
      items: [{
        type:'hotel', name:'H10 Casa Mimosa', chain:'H10',
        city:'Barcelona', checkIn:'20 mar', checkOut:'24 mar',
        price:'€735', confidence:0.88,
      }],
      tokens: 612, latency: 1450,
    },
  },
  {
    kind: 'multi',
    input: `Email de Renfe: Tren AVE 9724 Madrid Atocha - Barcelona Sants.
23/03/2026 18:30 → 21:05. Coche 5 asiento 14D. Total 89 EUR.`,
    result: {
      items: [{
        type:'transit', mode:'train', provider:'Renfe AVE', code:'9724',
        from:'Madrid', to:'Barcelona', date:'23 mar', time:'18:30',
        price:'€89', confidence:0.94,
      }],
      tokens: 543, latency: 1210,
    },
  },
];

window.TOKENS = TOKENS;
window.cityBg = cityBg;
window.cityFg = cityFg;
window.MOCK_TRIP = MOCK_TRIP;
window.MOCK_STATS = MOCK_STATS;
window.MOCK_TRIPS_LIST = MOCK_TRIPS_LIST;
window.GREETINGS = GREETINGS;
window.PARSE_EXAMPLES = PARSE_EXAMPLES;
