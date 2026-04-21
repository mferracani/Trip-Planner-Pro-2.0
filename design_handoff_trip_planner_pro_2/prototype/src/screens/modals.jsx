// Modal Carga IA + Day Detail + Create Trip + Item Detail + Onboarding + Settings

const { useState: useStateM, useEffect: useEffectM } = React;

// ═════════ MODAL CARGA IA ═════════
function AIModal({ open, onClose, mobile }) {
  const T = window.TOKENS;
  const I = window.I;
  const [mode, setMode] = useStateM('chat'); // chat | file | manual
  const [chatInput, setChatInput] = useStateM('');
  const [parsing, setParsing] = useStateM(false);
  const [result, setResult] = useStateM(null);
  const [exampleIdx, setExampleIdx] = useStateM(0);

  const runParse = (forcedExample) => {
    setParsing(true); setResult(null);
    const ex = forcedExample != null ? window.PARSE_EXAMPLES[forcedExample] : window.PARSE_EXAMPLES[exampleIdx];
    if (forcedExample != null) { setExampleIdx(forcedExample); setChatInput(ex.input); }
    setTimeout(() => { setParsing(false); setResult(ex.result); }, 1800);
  };

  const reset = () => { setChatInput(''); setResult(null); setParsing(false); };

  useEffectM(() => { if (!open) { setMode('chat'); reset(); } }, [open]);

  return (
    <window.UI.Sheet open={open} onClose={onClose} maxHeight="92%">
      {/* Header */}
      <div style={{
        padding: '14px 16px 12px', borderBottom: `1px solid ${T.bg.borderSoft}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 999, border: 'none',
          background: T.bg.elevated, color: T.text.secondary,
          display: 'flex', alignItems:'center', justifyContent:'center', cursor: 'pointer',
        }}><I.close size={16}/></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.font.family, fontSize: 16, fontWeight: 700, color: T.text.primary, letterSpacing: -0.3 }}>Agregar al viaje</div>
          <div style={{ fontFamily: T.font.family, fontSize: 11, color: T.text.tertiary }}>Europa Primavera · 14 días</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:999, background: window.cityBg(T.accent.purple, 0.18), color: T.accent.purple }}>
          <I.sparkles size={12}/>
          <span style={{ fontFamily: T.font.mono, fontSize: 10, fontWeight: 600, letterSpacing: 0.4 }}>CLAUDE</span>
        </div>
      </div>

      {/* Segmented control */}
      <div style={{ padding: '14px 16px', display: 'flex', justifyContent:'center' }}>
        <window.UI.Segmented
          options={[
            { value:'chat',   label:'Chat',    icon: <I.chat size={13}/> },
            { value:'file',   label:'Archivo', icon: <I.doc size={13}/> },
            { value:'manual', label:'Manual',  icon: <I.pencil size={13}/> },
          ]}
          value={mode}
          onChange={(v) => { setMode(v); reset(); }}
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '0 16px 20px' }}>
        {mode === 'chat' && (
          <>
            {!result && (
              <>
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder='Ej: "Mi vuelo Iberia IB6844 sale el 15/03 a las 21:35 de Buenos Aires a Madrid..."'
                  style={{
                    width: '100%', minHeight: mobile ? 160 : 200,
                    background: T.bg.elevated, border: `1px solid ${T.bg.borderSoft}`,
                    borderRadius: 12, padding: 14, resize: 'none',
                    fontFamily: T.font.family, fontSize: 14, color: T.text.primary,
                    outline: 'none', lineHeight: 1.5, boxSizing: 'border-box',
                  }}
                />
                <div style={{ marginTop: 10, display:'flex', gap: 6, flexWrap:'wrap' }}>
                  <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary, letterSpacing: 1, padding: '5px 0' }}>EJEMPLOS</div>
                  {window.PARSE_EXAMPLES.map((ex, i) => (
                    <window.UI.Pill key={i} active={exampleIdx===i && chatInput===ex.input} onClick={() => { setExampleIdx(i); setChatInput(ex.input); }} small>
                      {ex.kind === 'flight' ? '✈ Vuelo' : ex.kind === 'hotel' ? '🏨 Hotel' : '🚆 Tren'}
                    </window.UI.Pill>
                  ))}
                </div>
              </>
            )}

            {parsing && (
              <div style={{
                padding: 24, textAlign: 'center',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 999, margin: '0 auto',
                  background: window.cityBg(T.accent.purple, 0.18), color: T.accent.purple,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'tpp-pulse 1.2s ease-in-out infinite',
                }}>
                  <I.sparkles size={28} stroke={2}/>
                </div>
                <div style={{ marginTop: 14, fontFamily: T.font.family, fontSize: 14, fontWeight: 600, color: T.text.primary }}>
                  Claude está entendiendo tu viaje…
                </div>
                <div style={{ marginTop: 4, fontFamily: T.font.mono, fontSize: 11, color: T.text.tertiary, letterSpacing: 0.4 }}>
                  analizando texto · extrayendo campos · validando schema
                </div>
                <div style={{ marginTop: 18, display: 'flex', justifyContent:'center', gap: 4 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: 999, background: T.accent.purple,
                      animation: `tpp-dot 1.2s ease-in-out ${i*0.15}s infinite`,
                    }}/>
                  ))}
                </div>
              </div>
            )}

            {result && <ParsePreview result={result} onConfirm={() => { onClose(); reset(); }} onEdit={() => setResult(null)} mobile={mobile}/>}
          </>
        )}

        {mode === 'file' && <FileMode mobile={mobile} onParse={() => runParse(1)} parsing={parsing} result={result} onConfirm={() => { onClose(); reset(); }} onEdit={() => setResult(null)}/>}

        {mode === 'manual' && <ManualMode mobile={mobile}/>}
      </div>

      {/* Footer CTA */}
      {mode === 'chat' && !parsing && !result && chatInput && (
        <div style={{ padding: '12px 16px 20px', borderTop: `1px solid ${T.bg.borderSoft}`, background: T.bg.surface }}>
          <button onClick={() => runParse()} style={{
            width: '100%', padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${T.accent.purple}, #9647D4)`, color: '#fff',
            fontFamily: T.font.family, fontSize: 15, fontWeight: 600, letterSpacing: -0.2,
            display: 'flex', alignItems:'center', justifyContent:'center', gap: 8,
            boxShadow: '0 10px 24px rgba(191,90,242,0.35)',
          }}>
            <I.sparkles size={18}/> Parsear con Claude
          </button>
        </div>
      )}
    </window.UI.Sheet>
  );
}

function ParsePreview({ result, onConfirm, onEdit, mobile }) {
  const T = window.TOKENS;
  const I = window.I;
  return (
    <div style={{ padding: '8px 0 20px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999,
          background: window.cityBg(T.accent.green, 0.2), color: T.accent.green,
          display:'flex', alignItems:'center', justifyContent:'center',
        }}><I.check size={16} stroke={2.5}/></div>
        <div style={{ fontFamily: T.font.family, fontSize: 14, fontWeight: 600, color: T.text.primary }}>
          {result.items.length} item{result.items.length>1?'s':''} detectado{result.items.length>1?'s':''}
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary, letterSpacing: 0.4 }}>
          {result.tokens} tok · {result.latency}ms
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {result.items.map((it, i) => {
          const Icon = it.type === 'flight' ? I.plane : it.type === 'hotel' ? I.bed : I.train;
          const col = it.type === 'flight' ? T.accent.blue : it.type === 'hotel' ? T.accent.orange : T.accent.purple;
          return (
            <div key={i} style={{
              padding: 14, borderRadius: 14,
              background: T.bg.elevated, border: `1px solid ${T.bg.borderSoft}`,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: window.cityBg(col, 0.18), color: col,
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}><Icon size={18}/></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.font.family, fontSize: 14, fontWeight: 700, color: T.text.primary, letterSpacing: -0.2 }}>
                    {it.type === 'flight' ? `${it.airline} ${it.code}` :
                     it.type === 'hotel' ? it.name : `${it.provider} ${it.code}`}
                  </div>
                  <div style={{ fontFamily: T.font.family, fontSize: 12, color: T.text.secondary, marginTop: 2 }}>
                    {it.type === 'flight' ? `${it.from} → ${it.to} · ${it.date} · ${it.time}` :
                     it.type === 'hotel' ? `${it.city} · ${it.checkIn} → ${it.checkOut}` :
                     `${it.from} → ${it.to} · ${it.date} · ${it.time}`}
                  </div>
                </div>
                <window.UI.ConfidenceBadge score={it.confidence}/>
              </div>
              <div style={{
                padding: '8px 10px', borderRadius: 8, background: T.bg.base,
                fontFamily: T.font.family, fontSize: 13, fontWeight: 700, color: T.text.primary,
                display:'flex', alignItems:'center', justifyContent:'space-between',
              }}>
                <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary, letterSpacing: 1 }}>PRECIO</span>
                <span style={{ letterSpacing: -0.3 }}>{it.price}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
        <button onClick={onEdit} style={{
          flex: 1, padding: '12px', borderRadius: 12, border: `1px solid ${T.bg.border}`,
          background: T.bg.elevated, color: T.text.secondary, cursor: 'pointer',
          fontFamily: T.font.family, fontSize: 13, fontWeight: 600,
        }}>Editar input</button>
        <button onClick={onConfirm} style={{
          flex: 2, padding: '12px', borderRadius: 12, border: 'none',
          background: T.accent.blue, color: '#fff', cursor: 'pointer',
          fontFamily: T.font.family, fontSize: 13, fontWeight: 600,
        }}>Confirmar y agregar al viaje</button>
      </div>
    </div>
  );
}

function FileMode({ mobile, onParse, parsing, result, onConfirm, onEdit }) {
  const T = window.TOKENS;
  const I = window.I;
  const [attached, setAttached] = useStateM(false);
  if (parsing) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 999, margin: '0 auto',
          background: window.cityBg(T.accent.purple, 0.18), color: T.accent.purple,
          display:'flex', alignItems:'center', justifyContent:'center',
          animation:'tpp-pulse 1.2s ease-in-out infinite',
        }}><I.sparkles size={28}/></div>
        <div style={{ marginTop: 14, fontFamily: T.font.family, fontSize: 14, fontWeight: 600, color: T.text.primary }}>
          Gemini está leyendo tu PDF…
        </div>
        <div style={{ marginTop: 4, fontFamily: T.font.mono, fontSize: 11, color: T.text.tertiary, letterSpacing: 0.4 }}>
          OCR · extracción multimodal · validando
        </div>
      </div>
    );
  }
  if (result) return <ParsePreview result={result} onConfirm={onConfirm} onEdit={onEdit} mobile={mobile}/>;

  return (
    <>
      <div style={{
        border: `2px dashed ${T.bg.border}`, borderRadius: 14,
        padding: mobile ? '28px 18px' : '40px 24px', textAlign: 'center',
        background: T.bg.elevated,
      }}>
        {attached ? (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: 12, margin: '0 auto',
              background: window.cityBg(T.accent.orange, 0.18), color: T.accent.orange,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}><I.doc size={28}/></div>
            <div style={{ marginTop: 12, fontFamily: T.font.family, fontSize: 14, fontWeight: 600, color: T.text.primary }}>
              booking-h10-casa-mimosa.pdf
            </div>
            <div style={{ marginTop: 2, fontFamily: T.font.mono, fontSize: 11, color: T.text.tertiary }}>
              142 KB · 1 página
            </div>
          </>
        ) : (
          <>
            <div style={{
              width: 56, height: 56, borderRadius: 999, margin: '0 auto',
              background: T.bg.surface, color: T.text.secondary,
              display:'flex', alignItems:'center', justifyContent:'center',
              border: `1px solid ${T.bg.border}`,
            }}><I.upload size={24}/></div>
            <div style={{ marginTop: 12, fontFamily: T.font.family, fontSize: 14, fontWeight: 600, color: T.text.primary }}>
              Arrastrá tu booking o voucher acá
            </div>
            <div style={{ marginTop: 4, fontFamily: T.font.family, fontSize: 12, color: T.text.secondary }}>
              PDF, JPG, PNG · hasta 20 MB
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {[
          { icon: I.doc, label: 'Archivo' },
          { icon: I.camera, label: 'Foto' },
          { icon: I.paste, label: 'Pegar' },
        ].map(opt => (
          <button key={opt.label} onClick={() => setAttached(true)} style={{
            padding: '14px 10px', borderRadius: 12, border: `1px solid ${T.bg.borderSoft}`,
            background: T.bg.surface, color: T.text.secondary, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            fontFamily: T.font.family, fontSize: 12, fontWeight: 500,
          }}>
            <opt.icon size={18}/>
            {opt.label}
          </button>
        ))}
      </div>

      {attached && (
        <button onClick={onParse} style={{
          width: '100%', marginTop: 14, padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
          background: `linear-gradient(135deg, ${T.accent.purple}, #9647D4)`, color: '#fff',
          fontFamily: T.font.family, fontSize: 15, fontWeight: 600,
          display:'flex', alignItems:'center', justifyContent:'center', gap: 8,
          boxShadow: '0 10px 24px rgba(191,90,242,0.35)',
        }}>
          <I.sparkles size={18}/> Parsear con Gemini
        </button>
      )}
    </>
  );
}

function ManualMode({ mobile }) {
  const T = window.TOKENS;
  const [kind, setKind] = useStateM('flight');
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[{v:'flight',l:'Vuelo'},{v:'hotel',l:'Hotel'},{v:'transit',l:'Transporte'}].map(o => (
          <window.UI.Pill key={o.v} active={kind===o.v} onClick={() => setKind(o.v)} small>{o.l}</window.UI.Pill>
        ))}
      </div>
      {kind === 'flight' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field label="Aerolínea" value="Iberia"/>
          <Field label="Número de vuelo" value="IB6844"/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
            <Field label="Desde (IATA)" value="EZE"/>
            <Field label="Hasta (IATA)" value="MAD"/>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
            <Field label="Fecha salida" value="15/03/2026"/>
            <Field label="Hora local" value="21:35"/>
          </div>
          <Field label="Precio" value="742 EUR"/>
        </div>
      )}
      {kind === 'hotel' && (
        <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
          <Field label="Nombre del hotel" value="NH Collection Paseo del Prado"/>
          <Field label="Ciudad" value="Madrid"/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
            <Field label="Check-in" value="16/03/2026"/>
            <Field label="Check-out" value="20/03/2026"/>
          </div>
          <Field label="Precio total" value="612 EUR"/>
        </div>
      )}
      {kind === 'transit' && (
        <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
          <Field label="Tipo" value="Tren"/>
          <Field label="Compañía" value="Renfe AVE"/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <Field label="Desde" value="Madrid Atocha"/>
            <Field label="Hasta" value="Barcelona Sants"/>
          </div>
          <Field label="Fecha y hora" value="23/03 · 18:30"/>
        </div>
      )}
      <button style={{
        width: '100%', marginTop: 14, padding: '14px', borderRadius: 12, border: 'none',
        background: T.accent.blue, color: '#fff', cursor: 'pointer',
        fontFamily: T.font.family, fontSize: 15, fontWeight: 600,
      }}>Guardar</button>
    </div>
  );
}

function Field({ label, value }) {
  const T = window.TOKENS;
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary, letterSpacing: 1, marginBottom: 5, textTransform:'uppercase' }}>{label}</div>
      <div style={{
        padding: '11px 12px', borderRadius: 10,
        background: T.bg.elevated, border: `1px solid ${T.bg.borderSoft}`,
        fontFamily: T.font.family, fontSize: 14, color: T.text.primary,
      }}>{value}</div>
    </label>
  );
}

// ═════════ DAY DETAIL ═════════
function DayDetailSheet({ open, iso, onClose, onOpenAI, onOpenItem }) {
  const T = window.TOKENS;
  const I = window.I;
  const trip = window.MOCK_TRIP;
  const city = trip.cities.find(c => c.days.includes(iso));
  const items = trip.items.filter(it => {
    const d = it.dateLocal || it.checkIn;
    return d === iso;
  });
  const hex = city ? T.cities[city.colorIdx].hex : T.text.tertiary;
  return (
    <window.UI.Sheet open={open} onClose={onClose} maxHeight="80%">
      <div style={{ padding: '14px 18px 10px' }}>
        <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary, letterSpacing: 1.4, textTransform:'uppercase' }}>
          {iso ? new Date(iso+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long'}).toUpperCase() : ''}
        </div>
        <div style={{ marginTop: 2, fontFamily: T.font.family, fontSize: 26, fontWeight: 700, color: T.text.primary, letterSpacing:-0.8 }}>
          {iso ? new Date(iso+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric', month:'long', year:'numeric'}) : ''}
        </div>
        {city && (
          <div style={{
            marginTop: 10, display:'inline-flex', alignItems:'center', gap: 6,
            padding:'5px 12px', borderRadius: 999,
            background: window.cityBg(hex, 0.14),
            border: `1px solid ${window.cityBg(hex, 0.3)}`,
          }}>
            <div style={{ width: 6, height: 6, borderRadius:999, background: hex }}/>
            <span style={{ fontFamily: T.font.family, fontSize: 13, fontWeight: 600, color: T.text.primary }}>{city.name}</span>
          </div>
        )}
      </div>
      <div style={{ padding: '6px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.length === 0 ? (
          <div style={{
            padding: '22px 16px', textAlign: 'center',
            background: T.bg.elevated, borderRadius: 14,
            border: `1px dashed ${T.bg.border}`,
          }}>
            <div style={{ fontFamily: T.font.family, fontSize: 14, fontWeight: 600, color: T.text.secondary }}>Sin eventos este día</div>
            <div style={{ marginTop: 4, fontFamily: T.font.family, fontSize: 12, color: T.text.tertiary }}>Cargá un vuelo, hotel o actividad</div>
          </div>
        ) : items.map(it => {
          const Icon = it.type === 'flight' ? I.plane : it.type === 'hotel' ? I.bed : I.train;
          const col = it.type === 'flight' ? T.accent.blue : it.type === 'hotel' ? T.accent.orange : T.accent.purple;
          return (
            <button key={it.id} onClick={() => onOpenItem(it)} style={{
              display:'flex', alignItems:'center', gap: 12,
              padding: 12, borderRadius: 12, border: `1px solid ${T.bg.borderSoft}`,
              background: T.bg.elevated, cursor:'pointer', textAlign:'left',
            }}>
              <div style={{ width: 36, height: 36, borderRadius:10, background: window.cityBg(col, 0.18), color: col, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={18}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.font.family, fontSize: 14, fontWeight: 600, color: T.text.primary }}>
                  {it.type === 'flight' ? `${it.airline} ${it.code}` : it.type === 'hotel' ? it.name : `${it.provider} ${it.code}`}
                </div>
                <div style={{ fontFamily: T.font.family, fontSize: 12, color: T.text.secondary, marginTop: 2 }}>
                  {it.type === 'flight' ? `${it.from} → ${it.to}` : it.type === 'hotel' ? `${it.nights} noches` : `${it.from} → ${it.to}`}
                </div>
              </div>
              <div style={{ fontFamily: T.font.mono, fontSize: 13, fontWeight: 700, color: T.text.primary }}>{it.timeLocal || 'Check-in'}</div>
            </button>
          );
        })}
        <button onClick={() => { onClose(); setTimeout(onOpenAI, 260); }} style={{
          marginTop: 6, padding: '12px', borderRadius: 12, border: 'none',
          background: `linear-gradient(135deg, ${T.accent.purple}, #9647D4)`, color: '#fff',
          fontFamily: T.font.family, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap: 8,
          boxShadow: '0 8px 20px rgba(191,90,242,0.3)',
        }}>
          <I.sparkles size={16}/> Agregar al día
        </button>
      </div>
    </window.UI.Sheet>
  );
}

// ═════════ CREATE TRIP ═════════
function CreateTripSheet({ open, onClose }) {
  const T = window.TOKENS;
  const I = window.I;
  const [selectedCover, setSelectedCover] = useStateM(0);
  return (
    <window.UI.Sheet open={open} onClose={onClose} maxHeight="85%">
      <div style={{ padding: '14px 18px 12px', borderBottom: `1px solid ${T.bg.borderSoft}`, display:'flex', alignItems:'center', gap: 10 }}>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 999, border: 'none',
          background: T.bg.elevated, color: T.text.secondary, cursor: 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}><I.close size={16}/></button>
        <div style={{ fontFamily: T.font.family, fontSize: 16, fontWeight: 700, color: T.text.primary, letterSpacing:-0.3 }}>Nuevo viaje</div>
      </div>
      <div style={{ padding: 18, display:'flex', flexDirection:'column', gap: 14 }}>
        <Field label="Nombre del viaje" value="Europa Primavera"/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
          <Field label="Inicio" value="15 mar 2026"/>
          <Field label="Fin" value="28 mar 2026"/>
        </div>
        <Field label="Primera ciudad" value="Madrid, España"/>
        <div>
          <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary, letterSpacing: 1, marginBottom: 8, textTransform:'uppercase' }}>Cover sugerido · Unsplash</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 8 }}>
            {[0,1,4].map((ci, idx) => (
              <button key={idx} onClick={() => setSelectedCover(idx)} style={{
                padding: 0, border: selectedCover===idx ? `2px solid ${T.accent.blue}` : `2px solid transparent`,
                borderRadius: 12, background: 'none', cursor: 'pointer', overflow: 'hidden',
              }}>
                <window.UI.Cover label={['madrid','barcelona','roma'][idx]} h={86} colorHex={T.cities[ci].hex} rounded={10}/>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 6, fontFamily: T.font.mono, fontSize: 9, color: T.text.quaternary, letterSpacing: 0.4 }}>
            Foto vía Unsplash · atribución automática
          </div>
        </div>
        <button onClick={onClose} style={{
          padding: '14px', borderRadius: 14, border: 'none',
          background: T.accent.blue, color: '#fff', cursor: 'pointer',
          fontFamily: T.font.family, fontSize: 15, fontWeight: 600,
        }}>Crear viaje</button>
      </div>
    </window.UI.Sheet>
  );
}

// ═════════ ITEM DETAIL (boarding pass) ═════════
function ItemDetailSheet({ open, item, onClose }) {
  const T = window.TOKENS;
  const I = window.I;
  if (!item) return <window.UI.Sheet open={false} onClose={onClose}></window.UI.Sheet>;
  const isFlight = item.type === 'flight';
  const isTransit = item.type === 'transit';
  const col = isFlight ? T.accent.blue : item.type==='hotel' ? T.accent.orange : T.accent.purple;
  const Icon = isFlight ? I.plane : item.type==='hotel' ? I.bed : I.train;

  return (
    <window.UI.Sheet open={open} onClose={onClose} maxHeight="88%">
      <div style={{ padding: '14px 18px 10px', display:'flex', alignItems:'center', gap: 10 }}>
        <button onClick={onClose} style={{
          width: 32, height: 32, borderRadius: 999, border: 'none',
          background: T.bg.elevated, color: T.text.secondary, cursor: 'pointer',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}><I.close size={16}/></button>
        <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
          <Icon size={16} color={col}/>
          <span style={{ fontFamily: T.font.family, fontSize: 14, fontWeight: 700, color: T.text.primary, letterSpacing: -0.2 }}>
            {isFlight ? `${item.airline} ${item.code}` : item.type==='hotel' ? item.chain : item.provider}
          </span>
        </div>
      </div>

      {(isFlight || isTransit) ? (
        <div style={{ padding: '6px 18px 24px' }}>
          {/* boarding-pass card */}
          <div style={{
            background: T.bg.elevated, borderRadius: 18,
            border: `1px solid ${T.bg.borderSoft}`, padding: 18,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 18 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: window.cityBg(col, 0.2), color: col, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Icon size={16}/>
                </div>
                <div style={{ fontFamily: T.font.family, fontSize: 14, fontWeight: 700, color: T.text.primary }}>
                  {isFlight ? `${item.airline} ${item.code}` : `${item.provider} ${item.code}`}
                </div>
              </div>
              <div style={{
                padding:'3px 10px', borderRadius: 999,
                background: window.cityBg(col, 0.16), color: col,
                fontFamily: T.font.mono, fontSize: 10, fontWeight: 600, letterSpacing: 0.6,
              }}>
                {isFlight ? (item.cabin || '').toUpperCase() : 'STANDARD'}
              </div>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 20 }}>
              <div style={{ fontFamily: T.font.family, fontSize: 34, fontWeight: 800, color: T.text.primary, letterSpacing:-1 }}>
                {isFlight ? item.from : (item.fromShort || item.from.slice(0,3).toUpperCase())}
              </div>
              <div style={{ flex: 1, display:'flex', alignItems:'center', gap: 6, color: T.text.tertiary }}>
                <div style={{ flex: 1, height: 1, background: T.bg.border, borderTop: `1px dashed ${T.bg.border}` }}/>
                <Icon size={16}/>
                <div style={{ flex: 1, height: 1, background: T.bg.border, borderTop: `1px dashed ${T.bg.border}` }}/>
              </div>
              <div style={{ fontFamily: T.font.family, fontSize: 34, fontWeight: 800, color: T.text.primary, letterSpacing:-1 }}>
                {isFlight ? item.to : (item.toShort || item.to.slice(0,3).toUpperCase())}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14, marginBottom: 14 }}>
              <TimeBlock label="SALIDA" time={item.timeLocal} date={item.dateLocal} tz={item.tzFrom || 'GMT-3'} city="Buenos Aires"/>
              <TimeBlock label="LLEGADA" time={item.arrTime} date={item.arrDate} tz={item.tzTo || 'GMT+2'} city="Madrid"/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 12, paddingTop: 14, borderTop: `1px dashed ${T.bg.border}` }}>
              <MetaCell label="Duración" value={item.duration}/>
              <MetaCell label="Asiento" value={item.seat}/>
              <MetaCell label="Código" value={item.code6}/>
            </div>
          </div>

          <div style={{
            marginTop: 12, display:'flex', alignItems:'center', justifyContent:'space-between',
            padding: '12px 14px', borderRadius: 12, background: T.bg.surface, border: `1px solid ${T.bg.borderSoft}`,
          }}>
            <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary, letterSpacing: 1 }}>PRECIO</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: T.font.family, fontSize: 18, fontWeight: 700, color: T.text.primary, letterSpacing: -0.4 }}>EUR {item.price}</div>
              <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary }}>≈ USD {item.priceUSD} · fx actual</div>
            </div>
          </div>
        </div>
      ) : (
        // Hotel
        <div style={{ padding: '6px 18px 24px' }}>
          <div style={{
            background: T.bg.elevated, borderRadius: 18, padding: 18,
            border: `1px solid ${T.bg.borderSoft}`,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: window.cityBg(col, 0.2), color: col, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon size={18}/>
              </div>
              <div>
                <div style={{ fontFamily: T.font.family, fontSize: 18, fontWeight: 700, color: T.text.primary, letterSpacing: -0.4 }}>{item.name}</div>
                <div style={{ fontFamily: T.font.family, fontSize: 12, color: T.text.secondary }}>{item.chain}</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14, padding: '14px 0', borderTop: `1px dashed ${T.bg.border}`, borderBottom: `1px dashed ${T.bg.border}` }}>
              <TimeBlock label="CHECK-IN" time="15:00" date={item.checkIn} tz="" city={item.nights + ' noches'}/>
              <TimeBlock label="CHECK-OUT" time="12:00" date={item.checkOut} tz="" city=""/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12, paddingTop: 14 }}>
              <MetaCell label="Habitación" value={item.room}/>
              <MetaCell label="Código" value={item.code6}/>
            </div>
          </div>
          <div style={{
            marginTop: 12, display:'flex', alignItems:'center', justifyContent:'space-between',
            padding: '12px 14px', borderRadius: 12, background: T.bg.surface, border: `1px solid ${T.bg.borderSoft}`,
          }}>
            <span style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary, letterSpacing: 1 }}>PRECIO</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: T.font.family, fontSize: 18, fontWeight: 700, color: T.text.primary }}>EUR {item.price}</div>
              <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary }}>≈ USD {item.priceUSD}</div>
            </div>
          </div>
        </div>
      )}
    </window.UI.Sheet>
  );
}

function TimeBlock({ label, time, date, tz, city }) {
  const T = window.TOKENS;
  return (
    <div>
      <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.text.tertiary, letterSpacing: 1.2, marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: T.font.mono, fontSize: 26, fontWeight: 700, color: T.text.primary, letterSpacing: -0.6, lineHeight: 1 }}>{time}</div>
      <div style={{ marginTop: 6, fontFamily: T.font.family, fontSize: 12, color: T.text.secondary }}>{window.UI.fmtDate(date, {day:'2-digit', month:'short', year:'numeric'})}</div>
      {(city || tz) && <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary, marginTop: 2 }}>{city} {tz && `· ${tz}`}</div>}
    </div>
  );
}
function MetaCell({ label, value }) {
  const T = window.TOKENS;
  return (
    <div>
      <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.text.tertiary, letterSpacing: 1, marginBottom: 3 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: T.font.family, fontSize: 13, fontWeight: 600, color: T.text.primary }}>{value}</div>
    </div>
  );
}

// ═════════ ONBOARDING ═════════
function Onboarding({ step, onNext, onFinish, mobile }) {
  const T = window.TOKENS;
  const I = window.I;
  return (
    <div style={{
      width: '100%', height: '100%', background: T.bg.base,
      display: 'flex', flexDirection: 'column', padding: mobile ? '56px 24px 40px' : '60px 40px 40px',
    }}>
      {step === 0 && (
        <>
          <div style={{ flex: 1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', textAlign:'center' }}>
            <div style={{
              width: 68, height: 68, borderRadius: 18,
              background: `linear-gradient(135deg, ${T.accent.blue}, ${T.accent.purple})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontFamily: T.font.family, fontSize: 28, fontWeight: 800, color: '#fff',
              boxShadow: '0 14px 30px rgba(10,132,255,0.3)', marginBottom: 24,
            }}>T</div>
            <div style={{ fontFamily: T.font.family, fontSize: mobile ? 30 : 34, fontWeight: 800, color: T.text.primary, letterSpacing: -1.2, lineHeight: 1.1 }}>
              Trip Planner Pro 2
            </div>
            <div style={{ marginTop: 10, fontFamily: T.font.family, fontSize: 15, color: T.text.secondary, maxWidth: 300, lineHeight: 1.5 }}>
              Organizá tus viajes sin tipear. Pegá el email, subí el PDF, la IA arma el resto.
            </div>
            {/* mini calendar mock */}
            <div style={{
              marginTop: 28, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4,
              padding: 10, background: T.bg.surface, borderRadius: 14,
              border: `1px solid ${T.bg.borderSoft}`, width: mobile ? 260 : 300,
            }}>
              {Array.from({length: 21}).map((_, i) => {
                const ci = i < 7 ? 0 : i < 14 ? 1 : 2;
                const filled = i >= 2 && i <= 18;
                const hex = T.cities[ci].hex;
                return (
                  <div key={i} style={{
                    aspectRatio: '1', borderRadius: 6,
                    background: filled ? window.cityBg(hex, 0.18) : T.bg.elevated,
                    border: filled ? `1px solid ${window.cityBg(hex, 0.3)}` : `1px solid ${T.bg.borderSoft}`,
                  }}/>
                );
              })}
            </div>
          </div>
          <button onClick={onNext} style={{
            padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: T.accent.blue, color: '#fff',
            fontFamily: T.font.family, fontSize: 15, fontWeight: 600,
          }}>Empezar</button>
        </>
      )}
      {step === 1 && (
        <>
          <div style={{ flex: 1, display:'flex', flexDirection:'column', gap: 14, justifyContent:'center' }}>
            <div style={{ fontFamily: T.font.family, fontSize: 26, fontWeight: 700, color: T.text.primary, letterSpacing:-0.8, marginBottom: 8 }}>
              Cómo funciona
            </div>
            {[
              { icon: I.chat, col: T.accent.blue, title: 'Pegá el email', sub: 'De Iberia, Booking, Renfe. Cualquier formato.' },
              { icon: I.doc,  col: T.accent.orange, title: 'O subí el PDF', sub: 'Voucher de hotel o boarding pass escaneado.' },
              { icon: I.sparkles, col: T.accent.purple, title: 'La IA arma tu viaje', sub: 'Claude + Gemini extraen todo con confidence score.' },
            ].map((c, i) => (
              <div key={i} style={{
                display:'flex', gap: 14, padding: 16, borderRadius: 14,
                background: T.bg.surface, border: `1px solid ${T.bg.borderSoft}`,
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: window.cityBg(c.col, 0.18), color: c.col, display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>
                  <c.icon size={20}/>
                </div>
                <div>
                  <div style={{ fontFamily: T.font.family, fontSize: 15, fontWeight: 600, color: T.text.primary, letterSpacing:-0.2 }}>{c.title}</div>
                  <div style={{ marginTop: 2, fontFamily: T.font.family, fontSize: 13, color: T.text.secondary }}>{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onNext} style={{
            padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: T.accent.blue, color: '#fff',
            fontFamily: T.font.family, fontSize: 15, fontWeight: 600,
          }}>Siguiente</button>
        </>
      )}
      {step === 2 && (
        <>
          <div style={{ flex: 1, display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', textAlign:'center' }}>
            <div style={{ fontFamily: T.font.family, fontSize: 26, fontWeight: 700, color: T.text.primary, letterSpacing:-0.8 }}>
              Iniciá sesión
            </div>
            <div style={{ marginTop: 10, fontFamily: T.font.family, fontSize: 14, color: T.text.secondary, maxWidth: 280, lineHeight: 1.5 }}>
              Para sincronizar tus viajes entre tu iPhone y tu Mac.
            </div>
          </div>
          <button onClick={onFinish} style={{
            padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: '#fff', color: '#000',
            fontFamily: T.font.family, fontSize: 15, fontWeight: 600,
            display:'flex', alignItems:'center', justifyContent:'center', gap: 8,
            marginBottom: 12,
          }}>
            <I.apple size={18}/> Continuar con Apple
          </button>
          <div style={{ textAlign:'center', fontFamily: T.font.family, fontSize: 11, color: T.text.tertiary }}>
            Al continuar aceptás la política de privacidad.
          </div>
        </>
      )}
      <div style={{ marginTop: 14, display:'flex', justifyContent:'center', gap: 6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: step===i?18:6, height: 6, borderRadius: 999,
            background: step===i?T.accent.blue:T.bg.border, transition: 'all 220ms',
          }}/>
        ))}
      </div>
    </div>
  );
}

// ═════════ SETTINGS ═════════
function Settings({ mobile }) {
  const T = window.TOKENS;
  const I = window.I;
  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary, letterSpacing: 1.4, textTransform:'uppercase', marginBottom: 8, padding:'0 4px' }}>{title}</div>
      <div style={{ background: T.bg.surface, borderRadius: 14, border: `1px solid ${T.bg.borderSoft}`, overflow: 'hidden' }}>{children}</div>
    </div>
  );
  const Row = ({ label, value, last, accent }) => (
    <div style={{
      display:'flex', alignItems:'center', padding: '13px 14px',
      borderBottom: last?'none':`1px solid ${T.bg.borderSoft}`,
    }}>
      <div style={{ flex: 1, fontFamily: T.font.family, fontSize: 14, color: T.text.primary, letterSpacing:-0.2 }}>{label}</div>
      <div style={{ fontFamily: T.font.family, fontSize: 13, color: accent || T.text.secondary, marginRight: 6 }}>{value}</div>
      <I.chevronR size={14} color={T.text.tertiary}/>
    </div>
  );
  return (
    <div style={{ width: '100%', height: '100%', overflowY:'auto', background: T.bg.base, padding: mobile ? '56px 16px 100px' : '28px 28px 40px' }}>
      <h1 style={{ margin: 0, fontFamily: T.font.family, fontSize: mobile?28:32, fontWeight: 700, color: T.text.primary, letterSpacing:-1, marginBottom: 22 }}>Ajustes</h1>
      <Section title="Cuenta">
        <Row label="Mati Rose" value="matias@email.com"/>
        <Row label="Sincronización iCloud" value="Activa" accent={T.accent.green} last/>
      </Section>
      <Section title="Inteligencia artificial">
        <Row label="Provider default" value="Claude 4.5"/>
        <Row label="Provider multimodal" value="Gemini 2.5 Flash"/>
        <Row label="API Keys" value="3 activas"/>
        <Row label="Historial de parse jobs" value="42 exitosos" last/>
      </Section>
      <Section title="Preferencias">
        <Row label="Moneda de display" value="USD"/>
        <Row label="Idioma" value="Español"/>
        <Row label="Tema" value="Oscuro" last/>
      </Section>
      <Section title="Datos">
        <Row label="Exportar data" value="JSON"/>
        <Row label="Cerrar sesión" value="" accent={T.accent.red} last/>
      </Section>
      <div style={{ textAlign:'center', fontFamily: T.font.mono, fontSize: 10, color: T.text.quaternary, letterSpacing: 1, padding: 14 }}>
        TRIP PLANNER PRO · VERSION 2.0.0
      </div>
    </div>
  );
}

window.AIModal = AIModal;
window.DayDetailSheet = DayDetailSheet;
window.CreateTripSheet = CreateTripSheet;
window.ItemDetailSheet = ItemDetailSheet;
window.Onboarding = Onboarding;
window.Settings = Settings;
