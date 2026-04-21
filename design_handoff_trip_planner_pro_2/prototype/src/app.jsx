// App shell — dual frame (iOS + desktop) + tweaks + navigation

const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "greeting": "soon",
  "tripStatus": "planned",
  "confidence": "high",
  "accent": "blue"
}/*EDITMODE-END*/;

function App() {
  const T = window.TOKENS;
  const UI = window.UI;

  // persist routing state
  const load = (k, d) => { try { const v = localStorage.getItem('tpp2.'+k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const save = (k, v) => { try { localStorage.setItem('tpp2.'+k, JSON.stringify(v)); } catch {} };

  const [screen, setScreen] = useStateA(load('screen', 'dashboard')); // onboarding | dashboard | trips | trip | settings | map
  const [view, setView] = useStateA(load('view', 'calendar'));
  const [aiOpen, setAIOpen] = useStateA(false);
  const [dayOpen, setDayOpen] = useStateA(null);
  const [itemOpen, setItemOpen] = useStateA(null);
  const [createOpen, setCreateOpen] = useStateA(false);
  const [onbStep, setOnbStep] = useStateA(0);

  const [tweaks, setTweaks] = useStateA(TWEAK_DEFAULTS);
  const [tweaksOpen, setTweaksOpen] = useStateA(false);

  useEffectA(() => save('screen', screen), [screen]);
  useEffectA(() => save('view', view), [view]);

  // tweaks host protocol
  useEffectA(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const updateTweak = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
  };

  // Trip with status override from tweak
  const trip = { ...window.MOCK_TRIP, status: tweaks.tripStatus };
  const today = tweaks.tripStatus === 'active' ? '2026-03-18' :
                tweaks.tripStatus === 'past' ? '2026-04-15' : '2026-04-20';

  const handleTab = (t) => {
    if (t === 'home') setScreen('dashboard');
    else if (t === 'trips') setScreen('trips');
    else if (t === 'add') setAIOpen(true);
    else if (t === 'map') { setScreen('trip'); setView('map'); }
    else if (t === 'settings') setScreen('settings');
  };

  // Render either mobile or desktop version
  const renderContent = (mobile) => {
    if (screen === 'onboarding') {
      return <window.Onboarding step={onbStep} mobile={mobile}
        onNext={() => setOnbStep(s => s+1)}
        onFinish={() => { setScreen('dashboard'); setOnbStep(0); }}/>;
    }
    if (screen === 'trip') {
      return <window.TripDetail trip={trip} mobile={mobile} view={view} onView={setView}
        density={tweaks.density} today={today}
        onDayTap={(iso) => setDayOpen(iso)}
        onOpenItem={(it) => setItemOpen(it)}
        onBack={() => setScreen('dashboard')}/>;
    }
    if (screen === 'trips') {
      return <TripsScreen mobile={mobile} onOpen={() => setScreen('trip')} onCreate={() => setCreateOpen(true)}/>;
    }
    if (screen === 'settings') {
      return <window.Settings mobile={mobile}/>;
    }
    return <window.Dashboard mobile={mobile} greetingKey={tweaks.greeting}
      onOpenTrip={() => setScreen('trip')} onOpenAI={() => setAIOpen(true)}/>;
  };

  // Sheets (shared content, rendered inside each frame)
  const renderSheets = (mobile) => (
    <>
      <window.AIModal open={aiOpen} onClose={() => setAIOpen(false)} mobile={mobile}/>
      <window.DayDetailSheet open={!!dayOpen} iso={dayOpen} onClose={() => setDayOpen(null)}
        onOpenAI={() => setAIOpen(true)}
        onOpenItem={(it) => { setDayOpen(null); setTimeout(() => setItemOpen(it), 260); }}/>
      <window.ItemDetailSheet open={!!itemOpen} item={itemOpen} onClose={() => setItemOpen(null)}/>
      <window.CreateTripSheet open={createOpen} onClose={() => setCreateOpen(false)}/>
    </>
  );

  return (
    <div style={{
      minHeight: '100vh', background: `radial-gradient(ellipse at top, #191919 0%, #0A0A0A 60%)`,
      padding: '40px 32px 60px', boxSizing: 'border-box',
      fontFamily: T.font.family,
    }}>
      <TopBar screen={screen} setScreen={setScreen} onOnboard={() => { setScreen('onboarding'); setOnbStep(0); }} onCreate={() => setCreateOpen(true)}/>

      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 40,
        alignItems: 'start', justifyContent: 'center', maxWidth: 1700, margin: '0 auto',
      }}>
        {/* Mobile frame */}
        <FrameLabel label="MOBILE · iOS · 390 × 844" sub="iPhone 15 Pro" accent={T.accent.blue}>
          <window.IOSDevice width={380} height={820} dark>
            <div style={{ position: 'relative', height: '100%', width: '100%', overflow: 'hidden', background: T.bg.base }}>
              {renderContent(true)}
              {screen !== 'onboarding' && (
                <window.UI.TabBar active={navActive(screen, view)} onTab={handleTab}/>
              )}
              {screen === 'dashboard' && <window.FAB onClick={() => setCreateOpen(true)}/>}
              {renderSheets(true)}
            </div>
          </window.IOSDevice>
        </FrameLabel>

        {/* Desktop frame */}
        <FrameLabel label="WEB · Next.js PWA · 1280 × 800" sub="PWA dark mode" accent={T.accent.purple}>
          <window.ChromeWindow
            width={Math.min(1180, Math.max(820, window.innerWidth - 560))}
            height={780}
            tabs={[{title:'Trip Planner Pro 2'},{title:'Claude'},{title:'+'}]}
            activeIndex={0}
            url="trip-planner-pro-2.vercel.app/trips/europa-2026">
            <div style={{ display:'flex', height:'100%', background: T.bg.base, position:'relative' }}>
              {screen !== 'onboarding' && <window.UI.Sidebar active={navActive(screen, view)} onTab={handleTab}/>}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {renderContent(false)}
                {renderSheets(false)}
              </div>
            </div>
          </window.ChromeWindow>
        </FrameLabel>
      </div>

      <Footer/>

      <TweaksPanel open={tweaksOpen} tweaks={tweaks} onChange={updateTweak} onClose={() => setTweaksOpen(false)}/>
    </div>
  );
}

function navActive(screen, view) {
  if (screen === 'dashboard') return 'home';
  if (screen === 'trips') return 'trips';
  if (screen === 'settings') return 'settings';
  if (screen === 'trip' && view === 'map') return 'map';
  return 'trips';
}

function TopBar({ screen, setScreen, onOnboard, onCreate }) {
  const T = window.TOKENS;
  return (
    <div style={{ maxWidth: 1700, margin: '0 auto 28px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: `linear-gradient(135deg, ${T.accent.blue}, ${T.accent.purple})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily: T.font.family, fontSize: 16, fontWeight: 800, color:'#fff',
        }}>T</div>
        <div>
          <div style={{ fontFamily: T.font.family, fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: -0.4 }}>Trip Planner Pro 2 · Design Exploration</div>
          <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.tertiary, letterSpacing: 1, marginTop: 2 }}>DESIGN BRIEF v1.0 · DARK MODE · SPANISH</div>
        </div>
      </div>
      <div style={{ flex: 1 }}/>
      <QuickNav screen={screen} setScreen={setScreen} onOnboard={onOnboard} onCreate={onCreate}/>
    </div>
  );
}

function QuickNav({ screen, setScreen, onOnboard, onCreate }) {
  const T = window.TOKENS;
  const items = [
    { id:'onboarding', label:'Onboarding', action: onOnboard },
    { id:'dashboard', label:'Dashboard', action: () => setScreen('dashboard') },
    { id:'trip', label:'Trip Detail', action: () => setScreen('trip') },
    { id:'create', label:'Crear viaje', action: onCreate },
    { id:'settings', label:'Ajustes', action: () => setScreen('settings') },
  ];
  return (
    <div style={{ display:'flex', gap: 4, padding: 4, borderRadius: 999, background: T.bg.surface, border: `1px solid ${T.bg.borderSoft}` }}>
      {items.map(i => {
        const active = (i.id === screen) || (i.id === 'dashboard' && screen === 'dashboard');
        return (
          <button key={i.id} onClick={i.action} style={{
            padding: '7px 12px', borderRadius: 999, border: 'none',
            background: active ? T.bg.elevated : 'transparent',
            color: active ? '#fff' : T.text.secondary,
            fontFamily: T.font.family, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            letterSpacing: -0.1,
          }}>{i.label}</button>
        );
      })}
    </div>
  );
}

function FrameLabel({ label, sub, accent, children }) {
  const T = window.TOKENS;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{
        display:'flex', alignItems:'center', gap: 8, marginBottom: 18,
        padding: '6px 12px', borderRadius: 999,
        background: T.bg.surface, border: `1px solid ${T.bg.borderSoft}`,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: 999, background: accent }}/>
        <span style={{ fontFamily: T.font.mono, fontSize: 10, color: '#fff', letterSpacing: 1.4 }}>{label}</span>
        <span style={{ fontFamily: T.font.family, fontSize: 11, color: T.text.tertiary }}>· {sub}</span>
      </div>
      {children}
    </div>
  );
}

function TripsScreen({ mobile, onOpen, onCreate }) {
  const T = window.TOKENS;
  return (
    <div style={{ width: '100%', height: '100%', overflowY:'auto', background: T.bg.base, padding: mobile ? '56px 16px 100px' : '28px 28px 40px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontFamily: T.font.family, fontSize: mobile?28:32, fontWeight: 700, color: T.text.primary, letterSpacing: -1 }}>Mis viajes</h1>
        <button onClick={onCreate} style={{
          padding:'8px 14px', borderRadius: 999, border: 'none',
          background: T.accent.blue, color: '#fff', cursor:'pointer',
          display:'flex', alignItems:'center', gap: 6,
          fontFamily: T.font.family, fontSize: 13, fontWeight: 600,
        }}><window.I.plusSm size={14}/> Nuevo</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
        {window.MOCK_TRIPS_LIST.map((t, i) => {
          const col = T.cities[i % 8].hex;
          return (
            <button key={t.id} onClick={onOpen} style={{
              textAlign:'left', padding: 0, border:`1px solid ${T.bg.borderSoft}`, borderRadius: 16, overflow:'hidden',
              background: T.bg.surface, cursor: 'pointer',
            }}>
              <window.UI.Cover label={t.cover} h={100} colorHex={col} rounded={0}/>
              <div style={{ padding: 14 }}>
                <div style={{ fontFamily: T.font.family, fontSize: 15, fontWeight: 700, color: T.text.primary, letterSpacing: -0.3 }}>{t.name}</div>
                <div style={{ marginTop: 3, fontFamily: T.font.family, fontSize: 12, color: T.text.secondary }}>{window.UI.fmtRange(t.start, t.end)}</div>
                <div style={{ marginTop: 10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div style={{
                    fontFamily: T.font.mono, fontSize: 9, letterSpacing: 1, textTransform:'uppercase',
                    color: t.status==='planned' ? T.accent.green : T.text.tertiary,
                  }}>{t.status==='planned'?'Próximo':'Pasado'}</div>
                  <div style={{ fontFamily: T.font.family, fontSize: 14, fontWeight: 700, color: T.text.primary }}>${t.totalUSD.toLocaleString()}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Footer() {
  const T = window.TOKENS;
  return (
    <div style={{ maxWidth: 1100, margin: '40px auto 0', textAlign: 'center' }}>
      <div style={{ fontFamily: T.font.mono, fontSize: 10, color: T.text.quaternary, letterSpacing: 1.4 }}>
        TOGGLE <span style={{ color: T.accent.purple }}>TWEAKS</span> EN LA TOOLBAR PARA EDITAR ESTADO, DENSIDAD, SALUDO Y MÁS
      </div>
    </div>
  );
}

// ═════════ TWEAKS PANEL ═════════
function TweaksPanel({ open, tweaks, onChange, onClose }) {
  const T = window.TOKENS;
  const I = window.I;
  if (!open) return null;
  const Group = ({ label, value, options, field }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: T.font.mono, fontSize: 9, color: T.text.tertiary, letterSpacing: 1.2, marginBottom: 6, textTransform:'uppercase' }}>{label}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap: 5 }}>
        {options.map(o => (
          <button key={o.value} onClick={() => onChange(field, o.value)} style={{
            padding: '5px 10px', borderRadius: 999, border: 'none',
            background: value === o.value ? '#fff' : T.bg.elevated,
            color: value === o.value ? '#000' : T.text.secondary,
            fontFamily: T.font.family, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>{o.label}</button>
        ))}
      </div>
    </div>
  );
  return (
    <div style={{
      position: 'fixed', right: 20, bottom: 20, zIndex: 100,
      width: 300, background: T.bg.surface, borderRadius: 18, padding: 16,
      border: `1px solid ${T.bg.border}`,
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      backdropFilter: 'blur(18px)',
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 7, background: `linear-gradient(135deg, ${T.accent.blue}, ${T.accent.purple})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <I.pencil size={12} color="#fff"/>
          </div>
          <div style={{ fontFamily: T.font.family, fontSize: 13, fontWeight: 700, color: T.text.primary, letterSpacing: -0.2 }}>Tweaks</div>
        </div>
        <button onClick={onClose} style={{ width:24, height:24, borderRadius:999, border:'none', background: T.bg.elevated, color: T.text.secondary, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <I.close size={12}/>
        </button>
      </div>
      <Group label="Estado del viaje" value={tweaks.tripStatus} field="tripStatus" options={[
        { value:'planned', label:'Planeado' },
        { value:'active', label:'En curso' },
        { value:'past', label:'Pasado' },
      ]}/>
      <Group label="Saludo contextual" value={tweaks.greeting} field="greeting" options={[
        { value:'idle', label:'Idle' },
        { value:'soon', label:'Próximo' },
        { value:'during', label:'Durante' },
        { value:'lastday', label:'Último día' },
        { value:'return', label:'Regreso' },
      ]}/>
      <Group label="Densidad del calendar" value={tweaks.density} field="density" options={[
        { value:'comfortable', label:'Cómodo' },
        { value:'compact', label:'Compacto' },
      ]}/>
    </div>
  );
}

window.App = App;
