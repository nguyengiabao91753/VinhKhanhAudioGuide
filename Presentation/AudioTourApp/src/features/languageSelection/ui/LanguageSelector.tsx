/**
 * LanguageSelector — compact native <select> for map HUD
 * No cycling, just a proper dropdown.
 */
import { LANGUAGES } from '../../../pages/OnboardingPage';
import type { AppLanguage } from '../../../pages/OnboardingPage';

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function LanguageSelector({ value, onChange }: Props) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Flag overlay */}
      <span style={{
        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
        fontSize: 16, pointerEvents: 'none', zIndex: 1,
      }}>
        {LANGUAGES.find(l => l.code === value)?.flag ?? '🌐'}
      </span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label="Language"
        style={{
          appearance: 'none',
          paddingLeft: 32, paddingRight: 28, paddingTop: 7, paddingBottom: 7,
          borderRadius: 12, border: 'none',
          background: 'rgba(255,255,255,.9)',
          backdropFilter: 'blur(8px)',
          fontSize: 13, fontWeight: 700,
          color: '#111827', cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,.12)',
          minWidth: 80,
        }}
      >
        {LANGUAGES.map(l => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.native}
          </option>
        ))}
      </select>
      {/* Dropdown caret */}
      <span style={{
        position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
        fontSize: 10, color: '#6b7280', pointerEvents: 'none',
      }}>▼</span>
    </div>
  );
}