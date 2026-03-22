/**
 * OnboardingPage v3
 * - Combobox with search for language selection
 * - 3 steps: language → permissions → ready
 * - All UI text in selected language
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { AudioTierEngine } from '../features/audio/lib/AudioTierEngine';

export type AppLanguage = 'vi' | 'en' | 'fr' | 'de' | 'es' | 'ja' | 'ko' | 'zh' | 'it' | 'pt' | 'ru' | 'th' | 'ar' | 'zh-TW';

interface Props { onComplete: (language: AppLanguage) => void; }
type Step = 'lang' | 'permissions' | 'ready';

export const LANGUAGES: { code: AppLanguage; flag: string; native: string; english: string }[] = [
  { code: 'vi',    flag: '🇻🇳', native: 'Tiếng Việt',   english: 'Vietnamese'   },
  { code: 'en',    flag: '🇬🇧', native: 'English',       english: 'English'      },
  { code: 'fr',    flag: '🇫🇷', native: 'Français',      english: 'French'       },
  { code: 'de',    flag: '🇩🇪', native: 'Deutsch',       english: 'German'       },
  { code: 'es',    flag: '🇪🇸', native: 'Español',       english: 'Spanish'      },
  { code: 'it',    flag: '🇮🇹', native: 'Italiano',      english: 'Italian'      },
  { code: 'pt',    flag: '🇵🇹', native: 'Português',     english: 'Portuguese'   },
  { code: 'ru',    flag: '🇷🇺', native: 'Русский',       english: 'Russian'      },
  { code: 'zh',    flag: '🇨🇳', native: '中文 (简体)',    english: 'Chinese (S)'  },
  { code: 'zh-TW', flag: '🇹🇼', native: '中文 (繁體)',    english: 'Chinese (T)'  },
  { code: 'ja',    flag: '🇯🇵', native: '日本語',         english: 'Japanese'     },
  { code: 'ko',    flag: '🇰🇷', native: '한국어',         english: 'Korean'       },
  { code: 'th',    flag: '🇹🇭', native: 'ภาษาไทย',       english: 'Thai'         },
  { code: 'ar',    flag: '🇸🇦', native: 'العربية',       english: 'Arabic'       },
];

const UI: Record<string, { title: string; chooseLang: string; nextBtn: string; permTitle: string; permDesc: string; allowBtn: string; readyTitle: string; readyDesc: string; startBtn: string; gpsErr: string; search: string }> = {
  vi:  { title:'Vĩnh Khánh Audio Tour', chooseLang:'Chọn ngôn ngữ thuyết minh', nextBtn:'Tiếp tục →', permTitle:'Cấp quyền GPS', permDesc:'Cần GPS để hướng dẫn bạn đến các điểm tham quan', allowBtn:'Cấp quyền', readyTitle:'Sẵn sàng!', readyDesc:'Bật Bắt đầu, đi bộ quanh khu vực để khám phá', startBtn:'Bắt đầu khám phá →', gpsErr:'Không thể lấy GPS. Cho phép trong cài đặt.', search:'Tìm ngôn ngữ...' },
  en:  { title:'Vĩnh Khánh Audio Tour', chooseLang:'Choose your language', nextBtn:'Continue →', permTitle:'Grant GPS Access', permDesc:'GPS is required to guide you to nearby attractions', allowBtn:'Allow', readyTitle:'All set!', readyDesc:'Tap Start and walk around the area to discover', startBtn:'Start exploring →', gpsErr:'GPS denied. Allow in browser settings.', search:'Search language...' },
  fr:  { title:'Vĩnh Khánh Audio Tour', chooseLang:'Choisissez votre langue', nextBtn:'Continuer →', permTitle:'Accès GPS', permDesc:'Le GPS est requis pour vous guider', allowBtn:'Autoriser', readyTitle:'Prêt!', readyDesc:'Explorez le quartier', startBtn:'Commencer →', gpsErr:'GPS refusé.', search:'Rechercher...' },
  default: { title:'Vĩnh Khánh Audio Tour', chooseLang:'Choose your language', nextBtn:'Continue →', permTitle:'Grant GPS Access', permDesc:'GPS is required to guide you', allowBtn:'Allow', readyTitle:'All set!', readyDesc:'Start walking to discover', startBtn:'Start →', gpsErr:'GPS denied.', search:'Search language...' },
};
const getUI = (lang: string) => UI[lang] ?? UI.default;

// ── Language Combobox ──────────────────────────────────────────────────────
function LanguageCombobox({ value, onChange, search: searchPlaceholder }: {
  value: AppLanguage;
  onChange: (v: AppLanguage) => void;
  search: string;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef  = useRef<HTMLDivElement>(null);

  const filtered = LANGUAGES.filter(l =>
    query === '' ||
    l.native.toLowerCase().includes(query.toLowerCase()) ||
    l.english.toLowerCase().includes(query.toLowerCase()) ||
    l.code.toLowerCase().includes(query.toLowerCase())
  );

  const selected = LANGUAGES.find(l => l.code === value)!;

  useEffect(() => {
    // Scroll selected into view on open
    const el = listRef.current?.querySelector(`[data-code="${value}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          style={{
            width: '100%', padding: '10px 12px 10px 36px',
            borderRadius: 12, border: '1.5px solid rgba(255,255,255,.15)',
            background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 14,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Selected display */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', borderRadius: 12,
        background: 'rgba(16,185,129,.2)', border: '1.5px solid #10b981',
      }}>
        <span style={{ fontSize: 22 }}>{selected.flag}</span>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#fff' }}>{selected.native}</p>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,.6)' }}>{selected.english}</p>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 16, color: '#10b981' }}>✓</span>
      </div>

      {/* Scrollable list */}
      <div
        ref={listRef}
        style={{
          maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4,
          borderRadius: 12, padding: 4,
          scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,.2) transparent',
        }}
      >
        {filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', padding: '12px 0', fontSize: 13 }}>
            No match
          </p>
        )}
        {filtered.map(l => {
          const isActive = l.code === value;
          return (
            <button
              key={l.code}
              data-code={l.code}
              onClick={() => { onChange(l.code); setQuery(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left',
                background: isActive ? 'rgba(16,185,129,.25)' : 'rgba(255,255,255,.05)',
                transition: 'background .1s',
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{l.flag}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: isActive ? '#6ee7b7' : '#f1f5f9' }}>
                  {l.native}
                </p>
                <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,.45)' }}>{l.english}</p>
              </div>
              {isActive && <span style={{ color: '#10b981', fontSize: 16 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function OnboardingPage({ onComplete }: Props) {
  const [lang, setLang] = useState<AppLanguage>('vi');
  const [step, setStep] = useState<Step>('lang');
  const [gpsError, setGpsError] = useState('');
  const [loading, setLoading] = useState(false);
  const ui = getUI(lang);

  const requestPermissions = useCallback(async () => {
    setLoading(true); setGpsError('');
    try {
      await new Promise<void>((res, rej) =>
        navigator.geolocation.getCurrentPosition(() => res(), rej, {
          enableHighAccuracy: true, timeout: 10_000,
        })
      );
    } catch {
      setGpsError(ui.gpsErr); setLoading(false); return;
    }
    try { await AudioTierEngine.getInstance().unlock(); } catch {}
    setLoading(false); setStep('ready');
  }, [ui.gpsErr]);

  const steps: Step[] = ['lang', 'permissions', 'ready'];
  const stepIdx = steps.indexOf(step);

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(160deg,#0f172a 0%,#134e4a 55%,#1e3a5f 100%)',
      color: '#fff', fontFamily: 'system-ui,sans-serif', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', padding: '36px 24px 12px', flexShrink: 0 }}>
        <div style={{ fontSize: 44, marginBottom: 6 }}>🗺️</div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>{ui.title}</h1>
        <p style={{ margin: '3px 0 0', fontSize: 12, opacity: 0.5 }}>Vĩnh Khánh Food Street · Saigon</p>
      </div>

      {/* Step bar */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0 16px', flexShrink: 0 }}>
        {steps.map((s, i) => (
          <div key={s} style={{
            width: 28, height: 3, borderRadius: 99,
            background: i <= stepIdx ? '#10b981' : 'rgba(255,255,255,.15)',
            transition: 'background .3s',
          }}/>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px', minHeight: 0 }}>

        {step === 'lang' && (
          <>
            <p style={{ textAlign: 'center', fontSize: 13, opacity: 0.65, marginBottom: 14 }}>{ui.chooseLang}</p>
            <LanguageCombobox value={lang} onChange={setLang} search={ui.search} />
          </>
        )}

        {step === 'permissions' && (
          <div style={{ textAlign: 'center', paddingTop: 16 }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>📍</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>{ui.permTitle}</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, opacity: 0.65, lineHeight: 1.6 }}>{ui.permDesc}</p>
            {gpsError && (
              <div style={{
                background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#fca5a5',
              }}>{gpsError}</div>
            )}
            <button onClick={requestPermissions} disabled={loading} style={{
              width: '100%', padding: '15px', borderRadius: 14, border: 'none',
              background: loading ? 'rgba(255,255,255,.1)' : 'linear-gradient(135deg,#10b981,#059669)',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
            }}>
              {loading ? '⏳...' : ui.allowBtn}
            </button>
          </div>
        )}

        {step === 'ready' && (
          <div style={{ textAlign: 'center', paddingTop: 16 }}>
            <div style={{ fontSize: 52, marginBottom: 10 }}>✅</div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>{ui.readyTitle}</h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, opacity: 0.65, lineHeight: 1.6 }}>{ui.readyDesc}</p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(16,185,129,.12)', borderRadius: 12,
              padding: '8px 16px', marginBottom: 24,
            }}>
              <span style={{ fontSize: 20 }}>{LANGUAGES.find(l => l.code === lang)?.flag}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{LANGUAGES.find(l => l.code === lang)?.native}</span>
            </div>
            <br/>
            <button onClick={() => onComplete(lang)} style={{
              width: '100%', padding: '17px', borderRadius: 16, border: 'none',
              background: 'linear-gradient(135deg,#10b981,#059669)',
              color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(16,185,129,.35)',
            }}>
              {ui.startBtn}
            </button>
          </div>
        )}
      </div>

      {/* Bottom button */}
      {step === 'lang' && (
        <div style={{ padding: '16px 20px 32px', flexShrink: 0 }}>
          <button onClick={() => setStep('permissions')} style={{
            width: '100%', padding: '15px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg,#10b981,#059669)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>
            {ui.nextBtn}
          </button>
        </div>
      )}
    </div>
  );
}