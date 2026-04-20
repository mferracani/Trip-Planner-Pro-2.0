// Dashboard, Trips list — Trip Planner Pro 2

const { useState: useStateD, useEffect: useEffectD } = React;

function GreetingHeader({ greetingKey, mobile }) {
  const T = window.TOKENS;
  const G = window.GREETINGS;
  const text = G[greetingKey] || G.idle;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      padding: mobile ? '12px 20px 14px' : '24px 28px 18px',
    }}>
      <div>
        <div style={{
          fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary,
          letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6,
        }}>{new Date().toLocaleDateString('es-AR', { weekday:'long', day:'numeric', month:'long' })}</div>
        <h1 style={{
          margin: 0, fontFamily: T.font.family,
          fontSize: mobile ? 28 : 34, fontWeight: 700,
          color: T.text.primary, letterSpacing: -1.2, lineHeight: 1.05,
          maxWidth: 380,
        }}>{text}</h1>
      </div>
      <button style={{
        width: 36, height: 36, borderRadius: 999,
        background: T.bg.elevated, border: `1px solid ${T.bg.borderSoft}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
      }}>
        <window.I.user size={16} color={T.text.secondary} />
      </button>
    </div>
  );
}

function HeroTripCard({ trip, daysLeft, mobile, onOpen }) {
  const T = window.TOKENS;
  const I = window.I;
  const accent = T.cities[trip.cities[0].colorIdx].hex;
  return (
    <div onClick={onOpen} style={{
      margin: mobile ? '0 16px 8px' : '0 28px 18px',
      background: T.bg.surface, borderRadius: T.radius.xl, overflow: 'hidden',
      border: `1px solid ${T.bg.borderSoft}`, cursor: 'pointer',
    }}>
      <window.UI.Cover label={trip.coverLabel} h={mobile ? 130 : 180} colorHex={accent} rounded={0} />
      <div style={{ padding: mobile ? '14px 16px 16px' : '18px 22px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: 999, background: T.accent.green }} />
          <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.accent.green, letterSpacing: 1.2 }}>
            {daysLeft > 0 ? 'PRÓXIMO' : daysLeft === 0 ? 'EMPIEZA HOY' : 'EN CURSO'}
          </span>
          <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary, letterSpacing: 1.2, marginLeft: 'auto' }}>
            {trip.cities.length} CIUDADES
          </span>
        </div>
        <div style={{
          fontFamily: T.font.family, fontSize: mobile ? 22 : 26, fontWeight: 700,
          color: T.text.primary, letterSpacing: -0.6, lineHeight: 1.1,
        }}>{trip.name}</div>
        <div style={{
          marginTop: 4, fontFamily: T.font.family, fontSize: 13, color: T.text.secondary,
        }}>{window.UI.fmtRange(trip.start, trip.end)} · {window.UI.daysBetween(trip.start, trip.end)} días</div>

        <div style={{
          marginTop: 14, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          paddingTop: 14, borderTop: `1px solid ${T.bg.borderSoft}`,
        }}>
          <div>
            <div style={{
              fontFamily: T.font.family, fontSize: 28, fontWeight: 700,
              color: T.text.primary, letterSpacing: -1, lineHeight: 1,
            }}>USD {trip.totalUSD.toLocaleString()}</div>
            <div style={{ marginTop: 4, fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary, letterSpacing: 0.8 }}>
              GASTO TOTAL ESTIMADO
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 999,
            background: T.accent.blue, color: '#fff',
            fontFamily: T.font.family, fontSize: 13, fontWeight: 600,
          }}>
            Ver viaje <I.arrowR size={14} />
          </div>
        </div>

        {/* countdown bar */}
        <div style={{
          marginTop: 14, padding: '10px 12px', borderRadius: 12,
          background: T.bg.elevated, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <I.clock size={14} color={T.text.secondary} />
          <span style={{ fontFamily: T.font.family, fontSize: 12, color: T.text.secondary, fontWeight: 500 }}>
            Faltan
          </span>
          <span style={{ fontFamily: T.font.mono, fontSize: 13, color: T.text.primary, fontWeight: 700, letterSpacing: -0.2 }}>
            {Math.max(0, daysLeft)} días · 4h 23min
          </span>
        </div>
      </div>
    </div>
  );
}

function StatsGrid({ mobile }) {
  const T = window.TOKENS;
  const S = window.MOCK_STATS;
  const items = [
    { v: S.tripsYear, l: 'Viajes este año' },
    { v: S.citiesVisited, l: 'Ciudades' },
    { v: S.daysTraveling, l: 'Días viajando' },
    { v: `$${(S.totalSpentUSD/1000).toFixed(1)}k`, l: 'Gastado USD' },
  ];
  return (
    <div style={{
      padding: mobile ? '0 16px' : '0 28px', marginBottom: mobile ? 18 : 28,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <h3 style={{
          margin: 0, fontFamily: T.font.family, fontSize: 13, fontWeight: 600,
          color: T.text.secondary, letterSpacing: 0.2, textTransform: 'uppercase',
        }}>Resumen 2026</h3>
        <button style={{
          background: 'none', border: 'none', color: T.accent.blue,
          fontFamily: T.font.family, fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>Ver detalle →</button>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
      }}>
        {items.map((s,i) => <window.UI.StatCard key={i} value={s.v} label={s.l} compact />)}
      </div>
    </div>
  );
}

function TripsListSection({ mobile }) {
  const T = window.TOKENS;
  const I = window.I;
  const [filter, setFilter] = useStateD('Todos');
  const list = window.MOCK_TRIPS_LIST;
  const filtered = list.filter(t => {
    if (filter === 'Todos') return true;
    if (filter === 'Futuros') return t.status === 'planned';
    if (filter === 'Pasados') return t.status === 'past';
    return true;
  });

  return (
    <div style={{ padding: mobile ? '0 16px 100px' : '0 28px 40px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <h3 style={{
          margin: 0, fontFamily: T.font.family, fontSize: 13, fontWeight: 600,
          color: T.text.secondary, letterSpacing: 0.2, textTransform: 'uppercase',
        }}>Mis viajes</h3>
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto' }}>
        {['Todos', 'Futuros', 'En curso', 'Pasados'].map(f => (
          <window.UI.Pill key={f} active={filter === f} onClick={() => setFilter(f)} small>
            {f}
          </window.UI.Pill>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((t, i) => {
          const colorHex = T.cities[i % 8].hex;
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: T.bg.surface, borderRadius: T.radius.lg,
              padding: 10, border: `1px solid ${T.bg.borderSoft}`, cursor: 'pointer',
            }}>
              <div style={{ width: 64, height: 64, flexShrink: 0 }}>
                <window.UI.Cover label="" h={64} colorHex={colorHex} rounded={10} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: T.font.family, fontSize: 15, fontWeight: 600,
                  color: T.text.primary, letterSpacing: -0.3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{t.name}</div>
                <div style={{
                  marginTop: 2, fontFamily: T.font.family, fontSize: 12,
                  color: T.text.secondary,
                }}>{window.UI.fmtRange(t.start, t.end)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: T.font.family, fontSize: 14, fontWeight: 700,
                  color: T.text.primary, letterSpacing: -0.3,
                }}>${t.totalUSD.toLocaleString()}</div>
                <div style={{
                  marginTop: 2, fontFamily: T.font.mono, fontSize: 9, color:
                    t.status === 'planned' ? T.accent.green : T.text.tertiary,
                  letterSpacing: 0.8, textTransform: 'uppercase',
                }}>{t.status === 'planned' ? 'Próximo' : 'Pasado'}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FAB({ onClick }) {
  const T = window.TOKENS;
  return (
    <button onClick={onClick} style={{
      position: 'absolute', right: 18, bottom: 96, zIndex: 30,
      width: 58, height: 58, borderRadius: 999, border: 'none', cursor: 'pointer',
      background: `linear-gradient(135deg, ${T.accent.purple}, #9647D4)`,
      boxShadow: '0 12px 28px rgba(191,90,242,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <window.I.sparkles size={26} color="#fff" />
    </button>
  );
}

function Dashboard({ mobile, greetingKey, onOpenTrip, onOpenAI }) {
  const trip = window.MOCK_TRIP;
  const daysLeft = Math.max(0, Math.round((new Date(trip.start) - new Date('2026-04-20')) / 86400000));
  return (
    <div style={{
      width: '100%', height: '100%', overflowY: 'auto', position: 'relative',
      background: window.TOKENS.bg.base,
      paddingTop: mobile ? 50 : 0,
    }}>
      <GreetingHeader greetingKey={greetingKey} mobile={mobile} />
      <HeroTripCard trip={trip} daysLeft={daysLeft} mobile={mobile} onOpen={onOpenTrip} />
      <div style={{ height: mobile ? 18 : 22 }} />
      <StatsGrid mobile={mobile} />
      <TripsListSection mobile={mobile} />
    </div>
  );
}

window.Dashboard = Dashboard;
window.FAB = FAB;
