// Shared UI primitives for Trip Planner Pro 2
// All dark, minimal, data-first.

const { useState, useEffect, useRef, useMemo } = React;

// ─── helpers ───
function fmtDate(iso, opts = { day:'2-digit', month:'short' }) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-AR', opts).replace('.','');
}
function fmtRange(a, b) {
  const ma = fmtDate(a, { day:'numeric', month:'short' });
  const mb = fmtDate(b, { day:'numeric', month:'short', year:'numeric' });
  return `${ma} — ${mb}`;
}
function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
}
function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}

// ─── Cover placeholder ───
function Cover({ label, h = 140, colorHex, rounded = 16, mono = true }) {
  const T = window.TOKENS;
  const c = colorHex || '#4D96FF';
  const r = parseInt(c.slice(1,3),16);
  const g = parseInt(c.slice(3,5),16);
  const b = parseInt(c.slice(5,7),16);
  return (
    <div style={{
      height: h, borderRadius: rounded, position: 'relative', overflow: 'hidden',
      background: `linear-gradient(135deg, rgba(${r},${g},${b},0.22), rgba(${r},${g},${b},0.08))`,
      border: `1px solid ${T.bg.border}`,
      backgroundImage: `repeating-linear-gradient(45deg, rgba(${r},${g},${b},0.08) 0 8px, transparent 8px 16px), linear-gradient(135deg, rgba(${r},${g},${b},0.22), rgba(${r},${g},${b},0.06))`,
    }}>
      <div style={{
        position: 'absolute', bottom: 10, left: 12,
        fontFamily: T.font.mono, fontSize: 10, color: 'rgba(255,255,255,0.55)',
        letterSpacing: 0.5, textTransform: 'uppercase',
      }}>{label}</div>
    </div>
  );
}

// ─── Pill / tab pill ───
function Pill({ children, active, onClick, small = false }) {
  const T = window.TOKENS;
  return (
    <button onClick={onClick} style={{
      height: small ? 28 : 32, padding: small ? '0 12px' : '0 14px',
      borderRadius: 999, border: 'none', cursor: 'pointer',
      background: active ? '#fff' : T.bg.elevated,
      color: active ? '#000' : T.text.secondary,
      fontFamily: T.font.family, fontSize: small ? 12 : 13, fontWeight: 600,
      letterSpacing: -0.1, transition: 'all 160ms ease-out',
      whiteSpace: 'nowrap',
    }}>{children}</button>
  );
}

// ─── Segmented control ───
function Segmented({ options, value, onChange }) {
  const T = window.TOKENS;
  return (
    <div style={{
      display: 'inline-flex', background: T.bg.elevated, borderRadius: 999,
      padding: 3, gap: 2,
    }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          height: 30, padding: '0 14px', borderRadius: 999, border: 'none',
          background: value === o.value ? '#fff' : 'transparent',
          color: value === o.value ? '#000' : T.text.secondary,
          fontFamily: T.font.family, fontSize: 13, fontWeight: 600,
          cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
          transition: 'all 160ms',
        }}>
          {o.icon} {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Stat card ───
function StatCard({ value, label, accent, compact }) {
  const T = window.TOKENS;
  return (
    <div style={{
      background: T.bg.surface, borderRadius: T.radius.lg,
      padding: compact ? '14px 14px' : '18px 16px',
      border: `1px solid ${T.bg.borderSoft}`,
    }}>
      <div style={{
        fontFamily: T.font.family, fontSize: compact ? 22 : 26, fontWeight: 700,
        color: accent || T.text.primary, letterSpacing: -0.8, lineHeight: 1,
      }}>{value}</div>
      <div style={{
        marginTop: 6, fontFamily: T.font.family, fontSize: 12, fontWeight: 500,
        color: T.text.secondary, letterSpacing: 0.1,
      }}>{label}</div>
    </div>
  );
}

// ─── Confidence badge ───
function ConfidenceBadge({ score }) {
  const T = window.TOKENS;
  const c = score >= 0.85 ? T.accent.green : score >= 0.6 ? T.accent.orange : T.accent.red;
  const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 999,
      background: `rgba(${r},${g},${b},0.15)`, color: c,
      fontFamily: T.font.mono, fontSize: 10, fontWeight: 600, letterSpacing: 0.3,
    }}>
      <div style={{ width: 5, height: 5, borderRadius: 999, background: c }} />
      {Math.round(score*100)}%
    </div>
  );
}

// ─── Tab bar (mobile) ───
function TabBar({ active, onTab }) {
  const T = window.TOKENS;
  const I = window.I;
  const tabs = [
    { id:'home', label:'Home', icon: I.home },
    { id:'trips', label:'Viajes', icon: I.suitcase },
    { id:'add', label:'Cargar', icon: I.sparkles, primary: true },
    { id:'map', label:'Mapa', icon: I.map },
    { id:'settings', label:'Ajustes', icon: I.gear },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'rgba(13,13,13,0.85)', backdropFilter: 'blur(24px) saturate(180%)',
      borderTop: `0.5px solid ${T.bg.border}`,
      padding: '8px 12px 28px', display: 'flex', justifyContent: 'space-around',
      zIndex: 40,
    }}>
      {tabs.map(t => {
        const isActive = active === t.id;
        const Ic = t.icon;
        return (
          <button key={t.id} onClick={() => onTab(t.id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: 4, color: t.primary ? T.accent.purple : (isActive ? T.accent.blue : T.text.tertiary),
          }}>
            {t.primary
              ? <div style={{
                  width: 44, height: 44, borderRadius: 999,
                  background: `linear-gradient(135deg, ${T.accent.purple}, #9647D4)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 8px 20px rgba(191,90,242,0.35)',
                }}>
                  <Ic size={22} color="#fff" />
                </div>
              : <Ic size={22} stroke={isActive ? 2 : 1.6} />
            }
            {!t.primary && <span style={{ fontSize: 10, fontWeight: 500, fontFamily: T.font.family }}>{t.label}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ─── Desktop sidebar (web) ───
function Sidebar({ active, onTab, tripName }) {
  const T = window.TOKENS;
  const I = window.I;
  const items = [
    { id:'home', label:'Dashboard', icon: I.home },
    { id:'trips', label:'Mis viajes', icon: I.suitcase },
    { id:'map', label:'Mapa global', icon: I.map },
    { id:'settings', label:'Ajustes', icon: I.gear },
  ];
  return (
    <div style={{
      width: 240, background: T.bg.base, borderRight: `1px solid ${T.bg.borderSoft}`,
      padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 4,
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px 18px',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `linear-gradient(135deg, ${T.accent.blue}, ${T.accent.purple})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.font.family, fontSize: 13, fontWeight: 700, color: '#fff',
        }}>T</div>
        <div>
          <div style={{ fontFamily: T.font.family, fontSize: 13, fontWeight: 700, color: T.text.primary, letterSpacing: -0.2 }}>Trip Planner</div>
          <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.text.tertiary, letterSpacing: 1 }}>PRO · 2</div>
        </div>
      </div>
      {items.map(i => {
        const isActive = active === i.id;
        const Ic = i.icon;
        return (
          <button key={i.id} onClick={() => onTab(i.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 8, border: 'none',
            background: isActive ? T.bg.elevated : 'transparent',
            color: isActive ? T.text.primary : T.text.secondary,
            fontFamily: T.font.family, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', textAlign: 'left', letterSpacing: -0.1,
          }}>
            <Ic size={16} />
            {i.label}
          </button>
        );
      })}
      <div style={{ flex: 1 }} />
      <button style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px', borderRadius: 10, border: 'none',
        background: `linear-gradient(135deg, rgba(191,90,242,0.18), rgba(191,90,242,0.08))`,
        color: T.accent.purple, cursor: 'pointer',
        fontFamily: T.font.family, fontSize: 13, fontWeight: 600, letterSpacing: -0.1,
      }}>
        <window.I.sparkles size={16} />
        Cargar con IA
      </button>
    </div>
  );
}

// ─── Sheet (from bottom) ───
function Sheet({ open, onClose, children, mobile = true, maxHeight = '85%' }) {
  const T = window.TOKENS;
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: open ? 'auto' : 'none', zIndex: 50,
    }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: T.bg.modalBackdrop,
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        opacity: open ? 1 : 0, transition: 'opacity 220ms',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: T.bg.surface, borderRadius: '20px 20px 0 0',
        maxHeight, overflow: 'hidden',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 320ms cubic-bezier(0.32, 0.72, 0, 1)',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '10px 0 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 36, height: 5, borderRadius: 999, background: T.bg.border }} />
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Badge (tipo vuelo/hotel/transit en calendar) ───
function ItemBadge({ item, small = false }) {
  const T = window.TOKENS;
  const I = window.I;
  let label, color, Icon;
  if (item.type === 'flight') {
    label = item.timeLocal;
    color = T.accent.blue;
    Icon = I.plane;
  } else if (item.type === 'hotel') {
    label = item.chain;
    color = T.accent.orange;
    Icon = I.bed;
  } else {
    label = item.timeLocal;
    color = T.accent.purple;
    Icon = I.train;
  }
  const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 3,
      padding: small ? '1px 4px' : '2px 5px',
      borderRadius: 4,
      background: `rgba(${r},${g},${b},0.20)`,
      color: `rgb(${Math.min(r+60,255)},${Math.min(g+60,255)},${Math.min(b+60,255)})`,
      fontFamily: T.font.mono, fontSize: small ? 9 : 10, fontWeight: 600,
      lineHeight: 1.2, letterSpacing: -0.1, minWidth: 0,
    }}>
      <Icon size={small ? 9 : 10} stroke={2} />
      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{label}</span>
    </div>
  );
}

window.UI = {
  fmtDate, fmtRange, daysBetween, addDays,
  Cover, Pill, Segmented, StatCard, ConfidenceBadge,
  TabBar, Sidebar, Sheet, ItemBadge,
};
