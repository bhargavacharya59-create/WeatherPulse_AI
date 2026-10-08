'use client';
import { useMemo, useState } from 'react';
import MapView from '@/components/map/MapView';
import RoleHeader from '@/components/RoleHeader';
import { ErrorBox, Skeleton, toast } from '@/components/ui';
import Icon from '@/components/ui/Icon';
import { useRequireRole } from '@/lib/auth';
import { pct, RISK, TYPE_LABEL } from '@/lib/format';
import { useApi } from '@/lib/useApi';

// Headings in Kannada; detailed guidance stays in English unless Gemini translation is configured.
const T = {
  en: {
    portal: 'Citizen alerts', demo: 'Synthetic scenario. Official warnings: IMD / KSNDMC.',
    high: 'HIGH RISK NEAR YOU', moderate: 'MODERATE RISK NEAR YOU', low: 'RISK NEARBY', safe: 'No risk forecast at your location',
    todo: 'What to do now', rain: 'Rain expected at your location', shelter: 'Nearest safe shelter', help: 'Disaster helpline',
    loc: 'Use my location', you: 'You', kmAway: 'km away', dir: 'Directions',
    noAnomaly: (ward) => `No anomaly zone reaches ${ward || 'your location'} in the next 10 days.`,
    conf: 'confidence', likely: 'likely', to: 'to',
    youAre: (dist, ward, risk) => `You are ${dist} km from the forecast centre${ward ? ` (${ward} ward)` : ''}, in the ${risk}-risk ring.`,
    floodWarn: 'Underpasses and low roads may flood.', yourArea: 'Your area',
    mmChart: 'mm per 6 hours (ensemble mean). Red = very heavy, orange = heavy.', prec: 'Official warnings from IMD and SDMA always take precedence.',
    eventTypes: { heavy_rainfall: 'Heavy rainfall', heatwave: 'Heatwave', cyclone: 'Cyclone', flood: 'Flood' }
  },
  kn: {
    portal: 'ನಾಗರಿಕ ಎಚ್ಚರಿಕೆಗಳು', demo: 'ಸಿಂಥೆಟಿಕ್ ಸನ್ನಿವೇಶ. ಅಧಿಕೃತ ಎಚ್ಚರಿಕೆಗಳು: IMD / KSNDMC.',
    high: 'ನಿಮ್ಮ ಬಳಿ ಹೆಚ್ಚಿನ ಅಪಾಯ', moderate: 'ನಿಮ್ಮ ಬಳಿ ಮಧ್ಯಮ ಅಪಾಯ', low: 'ಹತ್ತಿರದಲ್ಲಿ ಅಪಾಯ', safe: 'ನಿಮ್ಮ ಸ್ಥಳದಲ್ಲಿ ಅಪಾಯದ ಮುನ್ಸೂಚನೆ ಇಲ್ಲ',
    todo: 'ಈಗ ಏನು ಮಾಡಬೇಕು', rain: 'ನಿಮ್ಮ ಸ್ಥಳದಲ್ಲಿ ನಿರೀಕ್ಷಿತ ಮಳೆ', shelter: 'ಹತ್ತಿರದ ಸುರಕ್ಷಿತ ಆಶ್ರಯ', help: 'ವಿಪತ್ತು ಸಹಾಯವಾಣಿ',
    loc: 'ನನ್ನ ಸ್ಥಳ ಬಳಸಿ', you: 'ನೀವು', kmAway: 'ಕಿ.ಮೀ ದೂರ', dir: 'ನಿರ್ದೇಶನಗಳು',
    noAnomaly: (ward) => `ಮುಂದಿನ 10 ದಿನಗಳಲ್ಲಿ ಯಾವುದೇ ಅಪಾಯದ ವಲಯವು ${ward || 'ನಿಮ್ಮ ಸ್ಥಳವನ್ನು'} ತಲುಪುವುದಿಲ್ಲ.`,
    conf: 'ಖಚಿತತೆ', likely: 'ಸಾಧ್ಯತೆ', to: 'ವರೆಗೆ',
    youAre: (dist, ward, risk) => `ನೀವು ಮುನ್ಸೂಚನೆ ಕೇಂದ್ರದಿಂದ ${dist} ಕಿ.ಮೀ ದೂರದಲ್ಲಿದ್ದೀರಿ${ward ? ` (${ward} ವಾರ್ಡ್)` : ''}, ${risk} ಅಪಾಯದ ವಲಯದಲ್ಲಿದ್ದೀರಿ.`,
    floodWarn: 'ಕೆಳಸೇತುವೆಗಳು ಮತ್ತು ತಗ್ಗು ರಸ್ತೆಗಳಲ್ಲಿ ನೀರು ತುಂಬಬಹುದು.', yourArea: 'ನಿಮ್ಮ ಪ್ರದೇಶ',
    mmChart: '6 ಗಂಟೆಗಳಿಗೆ ಮಿ.ಮೀ (ಸರಾಸರಿ). ಕೆಂಪು = ಅತಿ ಭಾರಿ, ಕಿತ್ತಳೆ = ಭಾರಿ.', prec: 'IMD ಮತ್ತು SDMA ಯ ಅಧಿಕೃತ ಎಚ್ಚರಿಕೆಗಳಿಗೆ ಯಾವಾಗಲೂ ಆದ್ಯತೆ ಇರುತ್ತದೆ.',
    eventTypes: { heavy_rainfall: 'ಭಾರಿ ಮಳೆ', heatwave: 'ಉಷ್ಣ ಗಾಳಿ', cyclone: 'ಚಂಡಮಾರುತ', flood: 'ಪ್ರವಾಹ' }
  },
  hi: {
    portal: 'नागरिक अलर्ट', demo: 'सिंथेटिक परिदृश्य। आधिकारिक चेतावनियाँ: IMD / KSNDMC.',
    high: 'आपके पास उच्च जोखिम', moderate: 'आपके पास मध्यम जोखिम', low: 'पास में जोखिम', safe: 'आपके स्थान पर कोई जोखिम का पूर्वानुमान नहीं है',
    todo: 'अब क्या करें', rain: 'आपके स्थान पर बारिश की संभावना', shelter: 'निकटतम सुरक्षित आश्रय', help: 'आपदा हेल्पलाइन',
    loc: 'मेरे स्थान का उपयोग करें', you: 'आप', kmAway: 'किमी दूर', dir: 'दिशा-निर्देश',
    noAnomaly: (ward) => `अगले 10 दिनों में कोई भी जोखिम क्षेत्र ${ward || 'आपके स्थान'} तक नहीं पहुंचेगा।`,
    conf: 'आत्मविश्वास', likely: 'संभावना', to: 'तक',
    youAre: (dist, ward, risk) => `आप पूर्वानुमान केंद्र से ${dist} किमी दूर हैं${ward ? ` (${ward} वार्ड)` : ''}, ${risk} जोखिम क्षेत्र में।`,
    floodWarn: 'अंडरपास और निचली सड़कों पर पानी भर सकता है।', yourArea: 'आपका क्षेत्र',
    mmChart: 'मिमी प्रति 6 घंटे (औसत)। लाल = बहुत भारी, नारंगी = भारी।', prec: 'IMD और SDMA की आधिकारिक चेतावनियों को हमेशा प्राथमिकता दी जाती है।',
    eventTypes: { heavy_rainfall: 'भारी बारिश', heatwave: 'लू', cyclone: 'चक्रवात', flood: 'बाढ़' }
  },
};

export default function CitizenApp() {
  const { allowed } = useRequireRole('citizen', 'official');
  const [loc, setLoc] = useState(null);
  const [lang, setLang] = useState('en');
  const t = T[lang];
  const q = loc ? `?lat=${loc.lat}&lon=${loc.lon}` : '';
  const { data: d, error, reload } = useApi(allowed ? `/citizen/status${q}` : null);
  const r = d?.risk;

  const useMine = () => {
    if (!navigator.geolocation) return toast('Location is not available on this device');
    navigator.geolocation.getCurrentPosition((p) => setLoc({ lat: p.coords.latitude.toFixed(4), lon: p.coords.longitude.toFixed(4) }), () => toast('Location permission denied; showing demo location'));
  };

  const bars = useMemo(() => {
    if (!d?.weather) return [];
    const w = d.weather;
    const start = r ? Math.max(0, r.event.window.start_lead_h - 24) : 0;
    const out = [];
    for (let i = 0; i < w.lead_h.length && out.length < 10; i++) {
      if (w.lead_h[i] < start) continue;
      out.push({ label: w.valid_local[i].replace(' IST', '').split(', ')[1], day: w.valid_local[i].split(',')[0], v: w.variables.precip.mean[i] });
    }
    return out;
  }, [d, r]);
  const maxV = Math.max(10, ...bars.map((b) => b.v));
  const zoneFc = r && { type: 'FeatureCollection', features: ['low', 'moderate', 'high'].map((k) => ({ type: 'Feature', properties: { ring: k, event_id: r.event.id, severity: r.event.severity }, geometry: { type: 'Polygon', coordinates: [r.zone.rings[k]] } })) };
  const ring = r?.ring;

  return (
    <div className="app-mobile">
      <div className="app-col">
        <RoleHeader portal={t.portal} right={
          <select className="select sm" style={{ fontFamily: 'var(--sans), "Noto Sans Kannada"' }} value={lang} onChange={(e) => setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="kn">ಕನ್ನಡ</option>
            <option value="hi">हिंदी</option>
          </select>
        } />
        <div className="m-body" style={{ fontFamily: lang === 'kn' ? 'var(--sans), "Noto Sans Kannada"' : undefined }}>
          <div className="banner small"><span className="tag">DEMO</span>{t.demo}</div>
          <ErrorBox error={error} onRetry={reload} />
          {!d ? <><Skeleton h={150} /><Skeleton h={220} /></> : !r ? (
            <div className="m-card col gap-8" style={{ background: 'var(--good-tint)', borderColor: '#bfe0cb' }}>
              <div className="row gap-8 strong" style={{ color: 'var(--good)' }}><Icon name="check" />{t.safe}</div>
              <div className="small">{t.noAnomaly(d.ward?.ward_name)}</div>
            </div>
          ) : (
            <>
              <section className="col gap-8" style={{ background: ring === 'low' ? RISK.low.fill : RISK[ring].fill, color: ring === 'low' ? '#14202b' : '#fff', borderRadius: 16, padding: 18 }} role="alert">
                <div className="row between tiny" style={{ fontWeight: 700, letterSpacing: '0.04em' }}><span>{t[ring]}</span><span style={{ opacity: 0.9, fontWeight: 500 }}>{pct(r.event.probability)} {t.conf}</span></div>
                <div style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.25 }}>{t.eventTypes[r.event.type] || TYPE_LABEL[r.event.type]} {t.likely} {r.event.window.start_local.replace(' IST', '')} {t.to} {r.event.window.end_local.replace(' IST', '')}</div>
                <div className="small" style={{ lineHeight: 1.5, opacity: 0.95 }}>
                  {t.youAre(r.distance_km, d.ward?.ward_name, RISK[ring].label.toLowerCase())} {r.event.type === 'heavy_rainfall' ? t.floodWarn : ''}
                </div>
              </section>

              <MapView zones={zoneFc} height={260} fit="data" fitKey={`${d.lat}`} interactive={false} title={d.home_label || d.ward?.ward_name || t.yourArea}
                markers={[{ lon: d.lon, lat: d.lat, label: t.you }, ...(d.shelter ? [{ lon: d.shelter.lon, lat: d.shelter.lat, label: t.shelter, tone: 'shelter' }] : [])]} />

              <section className="m-card col gap-10">
                <h2 style={{ fontSize: 16 }}>{t.todo}</h2>
                {r.guidance.map((g, i) => (
                  <div key={g} className="row-top small" style={{ gap: 10, lineHeight: 1.45 }}>
                    <span style={{ minWidth: 22, height: 22, borderRadius: 11, background: 'var(--navy)', color: '#fff', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{i + 1}</span>{g}
                  </div>
                ))}
              </section>

              {(r.event.type === 'heavy_rainfall' || r.event.type === 'cyclone') && (
                <section className="m-card col gap-8">
                  <h2 style={{ fontSize: 16 }}>{t.rain}</h2>
                  <div className="row" style={{ alignItems: 'flex-end', gap: 5, height: 110 }} role="img" aria-label="Rain by 6-hour period">
                    {bars.map((b, i) => (
                      <div key={i} className="col" style={{ flex: 1, alignItems: 'center', gap: 4 }} title={`${b.day} ${b.label}: ${b.v.toFixed(0)} mm`}>
                        <span className="tiny num muted">{b.v >= 5 ? Math.round(b.v) : ''}</span>
                        <div style={{ width: '100%', height: Math.max(3, (b.v / maxV) * 72), borderRadius: 4, background: b.v > 40 ? RISK.high.fill : b.v > 15 ? RISK.moderate.fill : '#9ec5f4' }} />
                        <span className="tiny muted" style={{ fontSize: 10 }}>{b.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="tiny muted">{t.mmChart}</div>
                </section>
              )}

              <div className="grid g2" style={{ gap: 10 }}>
                {d.shelter && (
                  <a className="m-card col gap-4" style={{ color: 'var(--ink)', padding: 14 }} href={`https://www.openstreetmap.org/directions?to=${d.shelter.lat}%2C${d.shelter.lon}`} target="_blank" rel="noreferrer">
                    <span className="tiny muted">{t.shelter}</span>
                    <span className="small strong">{d.shelter.name}</span>
                    <span className="tiny muted">{d.shelter.distance_km} km · directions</span>
                  </a>
                )}
                <a className="col gap-4" href="tel:1070" style={{ background: 'var(--navy)', color: '#fff', borderRadius: 14, padding: 14 }}>
                  <span className="tiny" style={{ color: '#c9d2da' }}>{t.help}</span>
                  <span className="num" style={{ fontSize: 24, fontWeight: 600 }}>1070</span>
                  <span className="tiny" style={{ color: '#c9d2da' }}>Emergency 112</span>
                </a>
              </div>
            </>
          )}
          <button className="btn block" onClick={useMine}><Icon name="pin" size={16} />{t.loc}</button>
          <p className="tiny muted" style={{ textAlign: 'center' }}>Your location is used only to check risk while this page is open. Demo location: {d ? `${d.lat}, ${d.lon}` : '…'}</p>
        </div>
      </div>
    </div>
  );
}
