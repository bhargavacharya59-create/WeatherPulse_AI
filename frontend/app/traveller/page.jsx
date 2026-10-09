'use client';
import { useEffect, useState } from 'react';
import MapView, { LEGEND } from '@/components/map/MapView';
import RoleHeader from '@/components/RoleHeader';
import { ErrorBox, Skeleton, toast } from '@/components/ui';
import Icon from '@/components/ui/Icon';
import { useRequireRole } from '@/lib/auth';
import { KIND_LABEL, RISK, TYPE_LABEL } from '@/lib/format';
import { useApi } from '@/lib/useApi';

const T = {
  en: {
    driverMode: 'Driver mode', speak: 'Speak', demo: 'Simulated vehicle and synthetic forecast.',
    clear: 'ROUTE CLEAR', noRisk: 'No risk zone on your route', weCheck: 'We check your heading and speed against every forecast risk zone. You will be alerted here if that changes.',
    veh: 'Your vehicle', near: 'Nearest forecast risk zone', kmAway: 'km away', speed: 'Speed', heading: 'heading', forecastValid: 'forecast valid',
    inside: 'YOU ARE INSIDE A RISK ZONE', heading_in: 'YOU ARE HEADING INTO A RISK ZONE',
    ahead: 'risk zone ahead in about', min: 'min', kmh: 'km/h',
    slowDown: 'Slow down and stop at a safe, raised place. Do not drive through flowing water.',
    nearZone: 'near', zoneCenter: 'zone centre', saferSkirts: 'The safer route skirts the outer ring and adds about',
    takeSafer: 'Take safer route', keepRoute: 'Keep current route', saferSelected: 'Rerouting via the safer route. Fleet control has been informed.', keepSelected: 'Keeping current route. Drive slowly; alerts will continue.', event: 'Event', moves: 'Zone moves', until: 'Until',
    // Audio messages
    audioInside: (sev, type) => `Warning. You are inside a ${sev} risk ${type} zone. Stop at a safe, raised place.`,
    audioAhead: (type, eta, extra) => `Warning. ${type} risk zone ahead in about ${eta} minutes. A safer route adds ${extra} minutes.`
  },
  kn: {
    driverMode: 'ಚಾಲಕ ಮೋಡ್', speak: 'ಮಾತನಾಡು', demo: 'ಸಿಮ್ಯುಲೇಟೆಡ್ ವಾಹನ ಮತ್ತು ಸಿಂಥೆಟಿಕ್ ಮುನ್ಸೂಚನೆ.',
    clear: 'ಮಾರ್ಗ ಸ್ಪಷ್ಟವಾಗಿದೆ', noRisk: 'ನಿಮ್ಮ ಮಾರ್ಗದಲ್ಲಿ ಯಾವುದೇ ಅಪಾಯದ ವಲಯವಿಲ್ಲ', weCheck: 'ನಾವು ನಿಮ್ಮ ದಿಕ್ಕು ಮತ್ತು ವೇಗವನ್ನು ಮುನ್ಸೂಚನೆಯ ಅಪಾಯ ವಲಯಗಳೊಂದಿಗೆ ಪರಿಶೀಲಿಸುತ್ತೇವೆ. ಬದಲಾವಣೆಗಳಾದರೆ ಇಲ್ಲಿ ಎಚ್ಚರಿಕೆ ನೀಡಲಾಗುತ್ತದೆ.',
    veh: 'ನಿಮ್ಮ ವಾಹನ', near: 'ಹತ್ತಿರದ ಮುನ್ಸೂಚನೆ ಅಪಾಯ ವಲಯ', kmAway: 'ಕಿ.ಮೀ ದೂರ', speed: 'ವೇಗ', heading: 'ದಿಕ್ಕು', forecastValid: 'ಮುನ್ಸೂಚನೆ ಮಾನ್ಯತೆ',
    inside: 'ನೀವು ಅಪಾಯದ ವಲಯದಲ್ಲಿದ್ದೀರಿ', heading_in: 'ನೀವು ಅಪಾಯದ ವಲಯದ ಕಡೆಗೆ ಹೋಗುತ್ತಿದ್ದೀರಿ',
    ahead: 'ಮುಂದೆ ಅಪಾಯದ ವಲಯ', min: 'ನಿಮಿಷ', kmh: 'ಕಿ.ಮೀ/ಗಂಟೆ',
    slowDown: 'ನಿಧಾನವಾಗಿ ಚಲಿಸಿ ಮತ್ತು ಸುರಕ್ಷಿತ, ಎತ್ತರದ ಸ್ಥಳದಲ್ಲಿ ನಿಲ್ಲಿಸಿ. ಹರಿಯುವ ನೀರಿನಲ್ಲಿ ಚಾಲನೆ ಮಾಡಬೇಡಿ.',
    nearZone: 'ಹತ್ತಿರ', zoneCenter: 'ವಲಯದ ಕೇಂದ್ರ', saferSkirts: 'ಸುರಕ್ಷಿತ ಮಾರ್ಗವು ಹೊರಗಿನ ರಿಂಗ್ ಸುತ್ತಲೂ ಹೋಗುತ್ತದೆ ಮತ್ತು ಹೆಚ್ಚು ಸಮಯ ತೆಗೆದುಕೊಳ್ಳುತ್ತದೆ',
    takeSafer: 'ಸುರಕ್ಷಿತ ಮಾರ್ಗವನ್ನು ಆರಿಸಿ', keepRoute: 'ಪ್ರಸ್ತುತ ಮಾರ್ಗವನ್ನು ಮುಂದುವರಿಸಿ', saferSelected: 'ಸುರಕ್ಷಿತ ಮಾರ್ಗದ ಮೂಲಕ ಮರುಹೊಂದಿಸಲಾಗುತ್ತಿದೆ. ಫ್ಲೀಟ್ ಕಂಟ್ರೋಲ್‌ಗೆ ಮಾಹಿತಿ ನೀಡಲಾಗಿದೆ.', keepSelected: 'ಪ್ರಸ್ತುತ ಮಾರ್ಗವನ್ನು ಮುಂದುವರಿಸಲಾಗುತ್ತಿದೆ. ನಿಧಾನವಾಗಿ ಚಾಲನೆ ಮಾಡಿ; ಎಚ್ಚರಿಕೆಗಳು ಮುಂದುವರಿಯುತ್ತವೆ.', event: 'ಘಟನೆ', moves: 'ವಲಯ ಚಲಿಸುತ್ತದೆ', until: 'ತನಕ',
    audioInside: (sev, type) => {
      const s = sev === 'High' ? 'ಹೆಚ್ಚಿನ' : sev === 'Moderate' ? 'ಮಧ್ಯಮ' : 'ಕಡಿಮೆ';
      const t = type === 'Extreme rainfall' ? 'ಭಾರಿ ಮಳೆ' : type === 'Cyclonic storm' ? 'ಚಂಡಮಾರುತ' : type === 'Heatwave' ? 'ಶಾಖದ ಅಲೆ' : type === 'Cold wave' ? 'ಶೀತ ಅಲೆ' : type;
      return `ಎಚ್ಚರಿಕೆ. ನೀವು ${s} ಅಪಾಯದ ${t} ವಲಯದಲ್ಲಿದ್ದೀರಿ. ಸುರಕ್ಷಿತ, ಎತ್ತರದ ಸ್ಥಳದಲ್ಲಿ ನಿಲ್ಲಿಸಿ.`;
    },
    audioAhead: (type, eta, extra) => {
      const t = type === 'Extreme rainfall' ? 'ಭಾರಿ ಮಳೆ' : type === 'Cyclonic storm' ? 'ಚಂಡಮಾರುತ' : type === 'Heatwave' ? 'ಶಾಖದ ಅಲೆ' : type === 'Cold wave' ? 'ಶೀತ ಅಲೆ' : type;
      return `ಎಚ್ಚರಿಕೆ. ಮುಂದಿನ ${eta} ನಿಮಿಷಗಳಲ್ಲಿ ${t} ಅಪಾಯದ ವಲಯವಿದೆ. ಸುರಕ್ಷಿತ ಮಾರ್ಗವು ${extra} ನಿಮಿಷಗಳನ್ನು ಸೇರಿಸುತ್ತದೆ.`;
    }
  },
  hi: {
    driverMode: 'ड्राइवर मोड', speak: 'बोलें', demo: 'सिम्युलेटेड वाहन और सिंथेटिक पूर्वानुमान।',
    clear: 'मार्ग साफ़ है', noRisk: 'आपके मार्ग पर कोई जोखिम क्षेत्र नहीं है', weCheck: 'हम आपके दिशा और गति की जाँच हर पूर्वानुमानित जोखिम क्षेत्र के खिलाफ करते हैं। बदलाव होने पर आपको यहाँ सचेत किया जाएगा।',
    veh: 'आपका वाहन', near: 'निकटतम पूर्वानुमान जोखिम क्षेत्र', kmAway: 'किमी दूर', speed: 'गति', heading: 'दिशा', forecastValid: 'पूर्वानुमान मान्य',
    inside: 'आप जोखिम क्षेत्र के अंदर हैं', heading_in: 'आप जोखिम क्षेत्र की ओर जा रहे हैं',
    ahead: 'आगे जोखिम क्षेत्र', min: 'मिनट', kmh: 'किमी/घंटा',
    slowDown: 'धीमे हो जाएं और सुरक्षित, ऊंचे स्थान पर रुकें। बहते पानी में गाड़ी न चलाएं।',
    nearZone: 'के पास', zoneCenter: 'क्षेत्र केंद्र', saferSkirts: 'सुरक्षित मार्ग बाहरी रिंग से होकर जाता है और अधिक समय लेता है',
    takeSafer: 'सुरक्षित मार्ग अपनाएं', keepRoute: 'वर्तमान मार्ग पर रहें', saferSelected: 'सुरक्षित मार्ग से जा रहे हैं। फ्लीट कंट्रोल को सूचित कर दिया गया है।', keepSelected: 'वर्तमान मार्ग पर रह रहे हैं। धीरे चलाएं; अलर्ट जारी रहेंगे।', event: 'घटना', moves: 'क्षेत्र चलता है', until: 'तक',
    // Audio messages
    audioInside: (sev, type) => {
      const s = sev === 'High' ? 'उच्च' : sev === 'Moderate' ? 'मध्यम' : 'कम';
      const t = type === 'Extreme rainfall' ? 'भारी बारिश' : type === 'Cyclonic storm' ? 'चक्रवाती तूफान' : type === 'Heatwave' ? 'लू' : type === 'Cold wave' ? 'शीतलहर' : type;
      return `चेतावनी। आप एक ${s} जोखिम ${t} क्षेत्र के अंदर हैं। एक सुरक्षित, ऊंचे स्थान पर रुकें।`;
    },
    audioAhead: (type, eta, extra) => {
      const t = type === 'Extreme rainfall' ? 'भारी बारिश' : type === 'Cyclonic storm' ? 'चक्रवाती तूफान' : type === 'Heatwave' ? 'लू' : type === 'Cold wave' ? 'शीतलहर' : type;
      return `चेतावनी। लगभग ${eta} मिनट में ${t} जोखिम क्षेत्र आने वाला है। एक सुरक्षित मार्ग में ${extra} मिनट और लगते हैं।`;
    }
  },
};

export default function TravellerApp() {
  const { allowed } = useRequireRole('traveller', 'official');
  const { data: d, error, reload } = useApi(allowed ? '/traveller/status' : null);
  const [choice, setChoice] = useState(null);
  const [lang, setLang] = useState('en');
  const t = T[lang];
  const v = d?.vehicle;
  const ev = d?.event;

  const speak = () => {
    if (!d?.vehicle || d.clear || typeof window === 'undefined') return;
    const msg = v.status === 'inside'
      ? t.audioInside(ev.severity, TYPE_LABEL[ev.type])
      : t.audioAhead(TYPE_LABEL[ev.type], v.eta_min, d.routes.extra_min);
    
    // Use Cloud TTS to guarantee regional voices work on ANY laptop for the demo
    const audio = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(msg)}&tl=${lang}&client=tw-ob`);
    audio.play().catch((e) => {
      // Fallback to local synthesis if audio is blocked
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(msg);
      utterance.lang = lang === 'hi' ? 'hi-IN' : lang === 'kn' ? 'kn-IN' : 'en-IN';
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(vo => vo.lang === utterance.lang || vo.lang.startsWith(lang));
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    });
  };
  useEffect(() => { if (d?.vehicle && !d.clear) { const t = setTimeout(speak, 800); return () => clearTimeout(t); } return undefined; }, [d?.vehicle?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const zoneFc = d?.zone && { type: 'FeatureCollection', features: ['low', 'moderate', 'high'].map((k) => ({ type: 'Feature', properties: { ring: k, event_id: ev.id, severity: ev.severity }, geometry: { type: 'Polygon', coordinates: [d.zone.rings[k]] } })) };
  const inside = v?.status === 'inside';

  return (
    <div className="app-mobile app-dark">
      <div className="app-col">
        <RoleHeader dark portal={v ? `${t.driverMode} · ${v.id}` : t.driverMode} right={
          <div className="row gap-4">
            <button className="btn sm" style={{ background: '#1e2e3d', color: '#fff', borderColor: '#33485c' }} onClick={speak} aria-label="Read alert aloud"><Icon name="bell" size={14} />{t.speak}</button>
            <select className="select sm" style={{ background: '#1e2e3d', color: '#fff', borderColor: '#33485c', height: 32, fontFamily: 'var(--sans), "Noto Sans Kannada"' }} value={lang} onChange={(e) => setLang(e.target.value)}>
              <option value="en">English</option>
              <option value="kn">ಕನ್ನಡ</option>
              <option value="hi">हिंदी</option>
            </select>
          </div>
        } />
        <div className="m-body">
          <div className="banner small" style={{ background: '#3a2f12', color: '#f5d98c' }}><span className="tag">DEMO</span>{t.demo}</div>
          <ErrorBox error={error} onRetry={reload} />
          {!d ? <><Skeleton h={130} style={{ opacity: 0.2 }} /><Skeleton h={360} style={{ opacity: 0.2 }} /></> : d.clear || !v ? (
            <div className="col gap-12" style={{ fontFamily: lang === 'kn' ? 'var(--sans), "Noto Sans Kannada"' : undefined }}>
              <section className="col gap-6" style={{ background: '#15392a', border: '1px solid #2c6b4c', borderRadius: 16, padding: 18 }}>
                <div className="tiny" style={{ fontWeight: 700, letterSpacing: '0.05em', color: '#7fd1a1' }}>{t.clear}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{t.noRisk}</div>
                <div className="small" style={{ color: '#c9d2da' }}>{t.weCheck}</div>
              </section>
              {v && <div className="m-card" style={{ background: '#1e2e3d', borderColor: '#33485c', color: '#fff' }}>
                <div className="small" style={{ color: '#9fb0c0' }}>{t.veh}</div>
                <div className="strong">{v.id} · {KIND_LABEL[v.kind]} · {v.operator}</div>
                <div className="small" style={{ color: '#9fb0c0', marginTop: 4 }}>{t.speed} {Math.round(v.speed_kmh)} {t.kmh} · {t.heading} {Math.round(v.heading_deg)}°</div>
              </div>}
              {d.nearest && <div className="m-card" style={{ background: '#1e2e3d', borderColor: '#33485c', color: '#fff' }}>
                <div className="small" style={{ color: '#9fb0c0' }}>{t.near}</div>
                <div className="strong">{TYPE_LABEL[d.nearest.event.type]} · {d.nearest.event.place}</div>
                <div className="small" style={{ color: '#9fb0c0', marginTop: 4 }}>{d.nearest.distance_km} {t.kmAway} · {d.nearest.event.window.start_local}</div>
              </div>}
            </div>
          ) : (
            <div style={{ display: 'contents', fontFamily: lang === 'kn' ? 'var(--sans), "Noto Sans Kannada"' : undefined }}>
              <section role="alert" className="col gap-6" style={{ background: inside ? RISK.high.fill : RISK.moderate.fill, color: inside ? '#fff' : '#14202b', borderRadius: 16, padding: 18 }}>
                <div className="tiny" style={{ fontWeight: 700, letterSpacing: '0.05em' }}>{inside ? t.inside : t.heading_in}</div>
                <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
                  {inside ? `${RISK[v.ring].label}-risk ${TYPE_LABEL[ev.type].toLowerCase()} zone` : `${RISK[v.ring].label}-risk ${t.ahead} ${v.eta_min} ${t.min}`}
                </div>
                <div className="small" style={{ lineHeight: 1.45 }}>
                  {inside ? t.slowDown : `${TYPE_LABEL[ev.type]} ${t.nearZone} ${ev.place.split(',')[0]}; ${t.zoneCenter} ${v.distance_km} ${t.kmAway}. ${t.saferSkirts} ${d.routes.extra_min} ${t.min}.`}
                </div>
              </section>

              <MapView zones={zoneFc} routes={d.routes} height={360} fit="data" fitKey={v.id}
                markers={[{ lon: v.lon, lat: v.lat, label: `${KIND_LABEL[v.kind]} ${v.id.split('-').pop()}`, tone: 'vehicle' }]}
                title="Route check" legend={[LEGEND.current, LEGEND.safer]} compact>
              </MapView>

              {choice ? (
                <div className="m-card row gap-8" style={{ background: choice === 'safer' ? '#15392a' : '#1e2e3d', borderColor: choice === 'safer' ? '#2c6b4c' : '#33485c', color: '#fff' }}>
                  <Icon name={choice === 'safer' ? 'check' : 'info'} />
                  <div className="small">{choice === 'safer' ? t.saferSelected : t.keepSelected}</div>
                </div>
              ) : (
                <>
                  <button className="btn lg block" style={{ height: 56, background: '#4cb782', color: '#0e2a1c', border: 0, fontWeight: 700, fontSize: 17 }} onClick={() => { setChoice('safer'); toast('Safer route selected'); }}>
                    <Icon name="route" size={18} />{t.takeSafer}
                  </button>
                  <button className="btn lg block" style={{ background: 'transparent', color: '#fff', borderColor: '#3c5064' }} onClick={() => setChoice('keep')}>{t.keepRoute}</button>
                </>
              )}

              <div className="grid g3" style={{ gap: 8 }}>
                {[[t.event, TYPE_LABEL[ev.type]], [t.moves, `${ev.motion.direction} ${Math.round(ev.motion.speed_kmh)} ${t.kmh}`], [t.until, ev.window.end_local.split(', ')[1]?.replace(' IST', '') || '']].map(([k, val]) => (
                  <div key={k} style={{ background: '#1e2e3d', borderRadius: 10, padding: 10 }}>
                    <div className="tiny" style={{ color: '#9fb0c0' }}>{k}</div><div className="small strong">{val}</div>
                  </div>
                ))}
              </div>
              <ul className="small" style={{ color: '#c9d2da', margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>{d.guidance.map((g) => <li key={g}>{g}</li>)}</ul>
              <p className="tiny" style={{ color: '#9fb0c0' }}>{t.speed} {Math.round(v.speed_kmh)} {t.kmh} · {t.heading} {Math.round(v.heading_deg)}° · {v.operator} · {t.forecastValid} {d.valid_local}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
