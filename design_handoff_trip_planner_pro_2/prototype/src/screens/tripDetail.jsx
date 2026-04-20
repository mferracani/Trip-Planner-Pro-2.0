// Trip Detail — Calendar/List/Map views — Trip Planner Pro 2

const { useState: useStateT, useMemo: useMemoT } = React;

function TripHeader({ trip, mobile, onBack }) {
  const T = window.TOKENS;
  const I = window.I;
  return (
    <div style={{
      padding: mobile ? '56px 16px 10px' : '22px 28px 16px',
      borderBottom: `1px solid ${T.bg.borderSoft}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={onBack} style={{
          display:'flex', alignItems:'center', gap:4, padding:'6px 10px 6px 4px',
          background: 'none', border: 'none', color: T.accent.blue,
          fontFamily: T.font.family, fontSize: 14, fontWeight: 500, cursor: 'pointer',
        }}>
          <I.chevronL size={16} /> Viajes
        </button>
        <button style={{
          width: 32, height: 32, borderRadius: 999, border: 'none',
          background: T.bg.elevated, color: T.text.secondary, cursor: 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}><I.dots size={16}/></button>
      </div>

      <div style={{
        fontFamily: T.font.family, fontSize: mobile ? 26 : 30, fontWeight: 700,
        color: T.text.primary, letterSpacing: -0.8, lineHeight: 1.1,
      }}>{trip.name}</div>
      <div style={{
        marginTop: 4, fontFamily: T.font.family, fontSize: 13, color: T.text.secondary,
      }}>{window.UI.fmtRange(trip.start, trip.end)} · {window.UI.daysBetween(trip.start, trip.end)} días</div>

      {/* stats row */}
      <div style={{
        display: 'flex', gap: 10, marginTop: 14, overflowX: 'auto',
        paddingBottom: 2, scrollbarWidth: 'none',
      }}>
        {[
          { v: `$${trip.totalUSD.toLocaleString()}`, l:'Total USD', c: T.text.primary },
          { v: trip.cities.length, l: 'Ciudades', c: T.cities[1].hex },
          { v: trip.items.filter(i=>i.type==='flight').length, l:'Vuelos', c: T.accent.blue },
          { v: trip.items.filter(i=>i.type==='hotel').length, l:'Hoteles', c: T.accent.orange },
          { v: trip.items.filter(i=>i.type==='transit').length, l:'Tránsitos', c: T.accent.purple },
        ].map((s,i) => (
          <div key={i} style={{
            flex: '0 0 auto', minWidth: 104, padding: '10px 12px', borderRadius: 12,
            background: T.bg.surface, border: `1px solid ${T.bg.borderSoft}`,
          }}>
            <div style={{ fontFamily: T.font.family, fontSize: 17, fontWeight: 700, color: s.c, letterSpacing: -0.4 }}>{s.v}</div>
            <div style={{ marginTop: 2, fontFamily: T.font.mono, fontSize: 9, color: T.text.tertiary, letterSpacing: 0.8, textTransform:'uppercase' }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════ CALENDAR VIEW ═════════
function CalendarGrid({ trip, mobile, density, onDayTap, onLongPress, today }) {
  const T = window.TOKENS;
  const UI = window.UI;

  // Build week rows (Mon-Sun) covering start to end
  const startISO = trip.start, endISO = trip.end;
  // Find Monday before start
  const startDate = new Date(startISO + 'T12:00:00');
  const dow = (startDate.getDay() + 6) % 7; // 0 = Monday
  const firstMonday = new Date(startDate); firstMonday.setDate(startDate.getDate() - dow);

  const endDate = new Date(endISO + 'T12:00:00');
  const dowEnd = (endDate.getDay() + 6) % 7;
  const lastSunday = new Date(endDate); lastSunday.setDate(endDate.getDate() + (6 - dowEnd));

  const allDays = [];
  for (let d = new Date(firstMonday); d <= lastSunday; d.setDate(d.getDate()+1)) {
    allDays.push(d.toISOString().slice(0,10));
  }
  // Chunk into weeks of 7
  const weeks = [];
  for (let i=0; i<allDays.length; i+=7) weeks.push(allDays.slice(i, i+7));

  // City lookup per day
  const cityForDay = {};
  trip.cities.forEach(c => c.days.forEach(d => { cityForDay[d] = c; }));

  // Items per day
  const itemsForDay = {};
  trip.items.forEach(it => {
    const d1 = it.dateLocal || it.checkIn;
    if (!itemsForDay[d1]) itemsForDay[d1] = [];
    itemsForDay[d1].push(it);
    if (it.type === 'flight' && it.arrDate && it.arrDate !== d1) {
      if (!itemsForDay[it.arrDate]) itemsForDay[it.arrDate] = [];
      itemsForDay[it.arrDate].push({ ...it, timeLocal: it.arrTime, _arrival: true });
    }
    // hotel span: mark check-in to check-out-1 nights
    if (it.type === 'hotel') {
      const nights = it.nights;
      for (let k=1; k<nights; k++) {
        const d = UI.addDays(it.checkIn, k);
        if (!itemsForDay[d]) itemsForDay[d] = [];
        itemsForDay[d].push({ ...it, _continued: true });
      }
    }
  });

  const cellH = mobile ? (density === 'compact' ? 78 : 92) : (density === 'compact' ? 104 : 124);
  const gap = mobile ? 6 : 8;

  const dayLabels = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'];

  return (
    <div style={{
      padding: mobile ? '12px' : '18px 24px',
    }}>
      {/* day labels */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap,
        marginBottom: 8,
      }}>
        {dayLabels.map((l,i) => (
          <div key={l} style={{
            textAlign: 'center', fontFamily: T.font.mono, fontSize: 9,
            color: (i === 5 || i === 6) ? T.text.secondary : T.text.tertiary,
            letterSpacing: 1.4, fontWeight: 500,
          }}>{l}</div>
        ))}
      </div>

      {/* weeks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap }}>
        {weeks.map((w, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap }}>
            {w.map((iso) => {
              const inRange = iso >= startISO && iso <= endISO;
              const dn = parseInt(iso.slice(8,10), 10);
              const city = cityForDay[iso];
              const items = (itemsForDay[iso] || []).filter(x => !x._continued).slice(0, 3);
              const isToday = iso === today;
              const cityColor = city ? T.cities[city.colorIdx].hex : null;

              let cellBg = T.bg.surface;
              let cellBorder = `1px solid ${T.bg.borderSoft}`;
              if (city) {
                cellBg = window.cityBg(cityColor, 0.14);
                cellBorder = `1px solid ${window.cityBg(cityColor, 0.30)}`;
              }
              if (isToday) cellBorder = `2px solid ${T.accent.blue}`;

              // Hotel continued strip
              const hasContinuedHotel = (itemsForDay[iso] || []).some(x => x._continued && x.type==='hotel');

              return (
                <button key={iso} onClick={() => inRange && onDayTap(iso)}
                  disabled={!inRange}
                  style={{
                    height: cellH,
                    opacity: inRange ? 1 : 0.28,
                    background: cellBg, border: cellBorder,
                    borderRadius: 10, padding: '5px 4px 4px 6px',
                    display: 'flex', flexDirection: 'column', alignItems: 'stretch',
                    cursor: inRange ? 'pointer' : 'default',
                    fontFamily: T.font.family, position: 'relative', textAlign: 'left',
                    transition: 'transform 140ms, background 220ms',
                  }}>
                  <div style={{
                    fontSize: mobile ? 13 : 15, fontWeight: 700,
                    color: isToday ? T.accent.blue : T.text.primary,
                    letterSpacing: -0.3, lineHeight: 1,
                  }}>{dn}</div>

                  {hasContinuedHotel && !items.some(i=>i.type==='hotel') && (
                    <div style={{
                      position: 'absolute', left: 0, right: 0, top: 22,
                      height: 3,
                      background: window.cityBg(T.accent.orange, 0.5),
                    }} />
                  )}

                  <div style={{
                    marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3,
                    minWidth: 0, overflow: 'hidden',
                  }}>
                    {items.map((it, idx) => <window.UI.ItemBadge key={idx} item={it} small={mobile} />)}
                  </div>

                  <div style={{ flex: 1 }} />

                  {city && (
                    <div style={{
                      fontFamily: T.font.mono, fontSize: mobile ? 9 : 10, fontWeight: 700,
                      color: cityColor, letterSpacing: 1, textTransform: 'uppercase',
                      marginTop: 2,
                    }}>{city.short}</div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* legend */}
      <div style={{
        marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap',
        padding: '14px 16px', borderRadius: 12,
        background: T.bg.surface, border: `1px solid ${T.bg.borderSoft}`,
      }}>
        {trip.cities.map(c => {
          const hex = T.cities[c.colorIdx].hex;
          return (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 999,
              background: window.cityBg(hex, 0.14),
              border: `1px solid ${window.cityBg(hex, 0.3)}`,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: 999, background: hex }} />
              <span style={{ fontFamily: T.font.family, fontSize: 12, fontWeight: 600, color: T.text.primary }}>{c.name}</span>
              <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary }}>{c.days.length}d</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═════════ LIST VIEW ═════════
function ListView({ trip, mobile, onOpenItem }) {
  const T = window.TOKENS;
  const UI = window.UI;
  const I = window.I;

  // Group items by day
  const days = {};
  for (let d = new Date(trip.start); d <= new Date(trip.end); d.setDate(d.getDate()+1)) {
    const iso = d.toISOString().slice(0,10);
    days[iso] = [];
  }
  trip.items.forEach(it => {
    const d1 = it.dateLocal || it.checkIn;
    if (days[d1]) days[d1].push(it);
  });

  return (
    <div style={{ padding: mobile ? '12px 16px 100px' : '18px 28px 40px' }}>
      {Object.entries(days).map(([iso, items]) => {
        const cityObj = trip.cities.find(c => c.days.includes(iso));
        const hex = cityObj ? T.cities[cityObj.colorIdx].hex : T.text.tertiary;
        return (
          <div key={iso} style={{ marginBottom: 18 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
              padding: '6px 0', position: 'sticky', top: 0,
              background: T.bg.base, zIndex: 5,
            }}>
              <div style={{
                width: 42, textAlign: 'center',
              }}>
                <div style={{ fontFamily: T.font.family, fontSize: 20, fontWeight: 700, color: T.text.primary, letterSpacing: -0.5, lineHeight: 1 }}>
                  {parseInt(iso.slice(8,10),10)}
                </div>
                <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.text.tertiary, letterSpacing: 1, marginTop: 2 }}>
                  {new Date(iso+'T12:00:00').toLocaleDateString('es-AR',{weekday:'short'}).slice(0,3).toUpperCase()}
                </div>
              </div>
              {cityObj && (
                <div style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: window.cityBg(hex, 0.14),
                  border: `1px solid ${window.cityBg(hex, 0.3)}`,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: 999, background: hex }} />
                  <span style={{ fontFamily: T.font.family, fontSize: 12, fontWeight: 600, color: T.text.primary }}>{cityObj.name}</span>
                </div>
              )}
              <div style={{ flex: 1, height: 1, background: T.bg.borderSoft }} />
            </div>
            {items.length === 0 ? (
              <div style={{
                padding: '14px 16px', marginLeft: 52, borderRadius: 12,
                background: T.bg.surface, border: `1px dashed ${T.bg.border}`,
                fontFamily: T.font.family, fontSize: 13, color: T.text.tertiary,
              }}>Sin eventos este día</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 52 }}>
                {items.map(it => <ItemRow key={it.id} item={it} onOpen={() => onOpenItem(it)} />)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ItemRow({ item, onOpen }) {
  const T = window.TOKENS;
  const I = window.I;
  let Icon, color, title, sub, time;
  if (item.type === 'flight') {
    Icon = I.plane; color = T.accent.blue;
    title = `${item.airline} ${item.code}`;
    sub = `${item.from} → ${item.to} · ${item.duration}`;
    time = item.timeLocal;
  } else if (item.type === 'hotel') {
    Icon = I.bed; color = T.accent.orange;
    title = item.name;
    sub = `${item.nights} noches · ${item.room}`;
    time = `Check-in`;
  } else {
    Icon = I.train; color = T.accent.purple;
    title = `${item.provider} ${item.code}`;
    sub = `${item.from} → ${item.to}`;
    time = item.timeLocal;
  }
  const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
  return (
    <button onClick={onOpen} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: 12, borderRadius: 12, border: `1px solid ${T.bg.borderSoft}`,
      background: T.bg.surface, width: '100%', textAlign: 'left', cursor: 'pointer',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: `rgba(${r},${g},${b},0.18)`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.font.family, fontSize: 14, fontWeight: 600, color: T.text.primary, letterSpacing: -0.2 }}>
          {title}
        </div>
        <div style={{ marginTop: 2, fontFamily: T.font.family, fontSize: 12, color: T.text.secondary }}>
          {sub}
        </div>
      </div>
      <div style={{
        fontFamily: T.font.mono, fontSize: 13, fontWeight: 700, color: T.text.primary, letterSpacing: -0.2,
      }}>{time}</div>
    </button>
  );
}

// ═════════ MAP VIEW ═════════
function MapView({ trip, mobile }) {
  const T = window.TOKENS;
  const cities = trip.cities;
  return (
    <div style={{
      padding: mobile ? '12px 16px 100px' : '18px 28px 40px',
    }}>
      <div style={{
        position: 'relative', height: mobile ? 380 : 460,
        borderRadius: 16, overflow: 'hidden',
        background: `radial-gradient(circle at 40% 30%, rgba(10,132,255,0.08), transparent 60%), ${T.bg.surface}`,
        border: `1px solid ${T.bg.borderSoft}`,
      }}>
        {/* fake coastline grid */}
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.25 }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke={T.bg.border} strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <path d="M 50 280 Q 180 200 320 240 T 600 200" stroke={T.text.tertiary} strokeWidth="1" fill="none" strokeDasharray="4 4" opacity="0.4"/>
        </svg>
        {/* pins (fake positions) */}
        {[
          { c: cities[0], left: '32%', top: '48%' },
          { c: cities[1], left: '42%', top: '42%' },
          { c: cities[2], left: '58%', top: '55%' },
        ].map((p, i) => {
          const hex = T.cities[p.c.colorIdx].hex;
          return (
            <React.Fragment key={p.c.id}>
              {i > 0 && (
                <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  <line
                    x1={`${32 + (i-1)*10 + (i===1?0:10)}%`} y1={`${48 - (i===1?6:-7)}%`}
                    x2={`${32 + i*10 + (i===2?6:0)}%`} y2={`${48 - (i===1?-6:-7)}%`}
                    stroke={hex} strokeWidth="2" strokeDasharray="3 3" opacity="0.6"/>
                </svg>
              )}
              <div style={{ position: 'absolute', left: p.left, top: p.top, transform: 'translate(-50%, -100%)' }}>
                <div style={{
                  padding: '6px 10px', borderRadius: 999,
                  background: T.bg.base, border: `2px solid ${hex}`,
                  fontFamily: T.font.family, fontSize: 12, fontWeight: 700, color: T.text.primary,
                  boxShadow: '0 6px 18px rgba(0,0,0,0.4)', whiteSpace:'nowrap',
                }}>
                  {p.c.name}
                </div>
                <div style={{
                  width: 10, height: 10, borderRadius: 999, background: hex,
                  margin: '4px auto 0', boxShadow: `0 0 0 4px ${window.cityBg(hex, 0.25)}`,
                }} />
              </div>
            </React.Fragment>
          );
        })}
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary, letterSpacing: 1,
        }}>MAPA · 3 ciudades · 1.240 km</div>
      </div>
      <div style={{
        marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        {cities.map((c, idx) => {
          const hex = T.cities[c.colorIdx].hex;
          return (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 12,
              background: T.bg.surface, border: `1px solid ${T.bg.borderSoft}`,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 999, background: window.cityBg(hex, 0.25),
                color: hex, display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily: T.font.mono, fontSize: 11, fontWeight: 700,
              }}>{idx+1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.font.family, fontSize: 14, fontWeight: 600, color: T.text.primary }}>{c.name}</div>
                <div style={{ fontFamily: T.font.family, fontSize: 11, color: T.text.secondary }}>{c.country} · {c.days.length} días</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TripDetail({ trip, mobile, view, onView, density, onDayTap, onOpenItem, onBack, today }) {
  const T = window.TOKENS;
  const I = window.I;
  return (
    <div style={{
      height: '100%', width: '100%', overflowY: 'auto', background: T.bg.base,
      position: 'relative',
    }}>
      <TripHeader trip={trip} mobile={mobile} onBack={onBack} />
      <div style={{ padding: mobile ? '14px 16px 0' : '16px 28px 0', display: 'flex', justifyContent: 'center' }}>
        <window.UI.Segmented
          options={[
            { value:'calendar', label:'Calendar', icon: <I.calendar size={14}/> },
            { value:'list',     label:'List',     icon: <I.list size={14}/> },
            { value:'map',      label:'Map',      icon: <I.map size={14}/> },
          ]}
          value={view}
          onChange={onView}
        />
      </div>
      {view === 'calendar' && <CalendarGrid trip={trip} mobile={mobile} density={density} onDayTap={onDayTap} today={today}/>}
      {view === 'list' && <ListView trip={trip} mobile={mobile} onOpenItem={onOpenItem}/>}
      {view === 'map' && <MapView trip={trip} mobile={mobile}/>}
    </div>
  );
}

window.TripDetail = TripDetail;
