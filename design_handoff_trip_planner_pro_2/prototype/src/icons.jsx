// Icon set — Lucide-inspired, stroke 1.5, original
// Props: size, color, stroke (default 1.6)

const Ic = ({ children, size = 20, color = 'currentColor', stroke = 1.6, fill = 'none', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}
       stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
       style={{ flexShrink: 0, ...style }}>
    {children}
  </svg>
);

const I = {
  plane:    (p) => <Ic {...p}><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1L15 22v-1.5L13 19v-5.5z"/></Ic>,
  bed:      (p) => <Ic {...p}><path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 14h18M7 9V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3M3 18v3M21 18v3"/></Ic>,
  train:    (p) => <Ic {...p}><rect x="5" y="3" width="14" height="15" rx="3"/><path d="M9 8h6M5 12h14M8 22l2-4M16 22l-2-4M10 15h.01M14 15h.01"/></Ic>,
  sparkles: (p) => <Ic {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M18.4 5.6l-2 2M7.6 16.4l-2 2"/><circle cx="12" cy="12" r="2.5"/></Ic>,
  chat:     (p) => <Ic {...p}><path d="M21 12a8 8 0 1 1-3.5-6.6L21 4l-.9 3.5A8 8 0 0 1 21 12zM8 11h.01M12 11h.01M16 11h.01"/></Ic>,
  doc:      (p) => <Ic {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M9 13h6M9 17h6"/></Ic>,
  pencil:   (p) => <Ic {...p}><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></Ic>,
  plus:     (p) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></Ic>,
  plusSm:   (p) => <Ic {...p}><path d="M12 5v14M5 12h14"/></Ic>,
  chart:    (p) => <Ic {...p}><path d="M3 21h18M7 17V10M12 17V6M17 17V13"/></Ic>,
  gear:     (p) => <Ic {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Ic>,
  home:     (p) => <Ic {...p}><path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V10z"/></Ic>,
  suitcase: (p) => <Ic {...p}><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 12v4M14 12v4"/></Ic>,
  map:      (p) => <Ic {...p}><path d="M9 3L3 6v15l6-3 6 3 6-3V3l-6 3-6-3zM9 3v15M15 6v15"/></Ic>,
  chevronR: (p) => <Ic {...p}><path d="M9 18l6-6-6-6"/></Ic>,
  chevronL: (p) => <Ic {...p}><path d="M15 18l-9-6 9-6"/></Ic>,
  chevronD: (p) => <Ic {...p}><path d="M6 9l6 6 6-6"/></Ic>,
  chevronU: (p) => <Ic {...p}><path d="M18 15l-6-6-6 6"/></Ic>,
  close:    (p) => <Ic {...p}><path d="M18 6L6 18M6 6l12 12"/></Ic>,
  check:    (p) => <Ic {...p}><path d="M20 6L9 17l-5-5"/></Ic>,
  dots:     (p) => <Ic {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></Ic>,
  filter:   (p) => <Ic {...p}><path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3z"/></Ic>,
  search:   (p) => <Ic {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Ic>,
  calendar: (p) => <Ic {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></Ic>,
  list:     (p) => <Ic {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></Ic>,
  clock:    (p) => <Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Ic>,
  pin:      (p) => <Ic {...p}><path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></Ic>,
  user:     (p) => <Ic {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></Ic>,
  arrowR:   (p) => <Ic {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Ic>,
  arrowL:   (p) => <Ic {...p}><path d="M19 12H5M11 18l-6-6 6-6"/></Ic>,
  upload:   (p) => <Ic {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></Ic>,
  camera:   (p) => <Ic {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></Ic>,
  paste:    (p) => <Ic {...p}><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></Ic>,
  apple:    (p) => <Ic {...p} fill="currentColor" stroke="none"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></Ic>,
};

window.I = I;
