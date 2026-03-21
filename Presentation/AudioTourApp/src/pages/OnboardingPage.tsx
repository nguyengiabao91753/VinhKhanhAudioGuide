import { useState, useCallback } from 'react';
import { AudioTierEngine } from '../features/audio/lib/AudioTierEngine';

interface Props {
  onComplete: (language: 'vi' | 'en') => void;
}

type Step = 'lang' | 'permissions' | 'ready';

export default function OnboardingPage({ onComplete }: Props) {
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [step, setStep] = useState<Step>('lang');
  const [gpsGranted, setGpsGranted] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestPermissions = useCallback(async () => {
    setLoading(true);
    setGpsError('');

    // 1. GPS
    try {
      await new Promise<void>((res, rej) => {
        navigator.geolocation.getCurrentPosition(() => res(), rej, {
          enableHighAccuracy: true, timeout: 10_000,
        });
      });
      setGpsGranted(true);
    } catch {
      setGpsError(
        lang === 'vi'
          ? 'Không thể lấy vị trí GPS. Vui lòng cho phép trong cài đặt trình duyệt.'
          : 'GPS permission denied. Please allow location in browser settings.'
      );
      setLoading(false);
      return;
    }

    // 2. AudioContext unlock — MUST be in user gesture
    try {
      await AudioTierEngine.getInstance().unlock();
    } catch {
      // audio unlock failure is non-fatal; TTS still works
    }

    // 3. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    setLoading(false);
    setStep('ready');
  }, [lang]);

  const handleStart = useCallback(() => {
    onComplete(lang);
  }, [lang, onComplete]);

  // ── UI ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-emerald-900 to-teal-800 text-white px-6 overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-emerald-600 opacity-20 pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-teal-500 opacity-20 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
        {/* Logo / Icon */}
        <div className="w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-xl">
          <span className="text-5xl">🗺️</span>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {lang === 'vi' ? 'Smart Audio Tour' : 'Smart Audio Tour'}
          </h1>
          <p className="text-emerald-200 text-sm">
            {lang === 'vi'
              ? 'Khám phá Vĩnh Khánh Food Street với thuyết minh tự động'
              : 'Explore Vĩnh Khánh Food Street with auto narration'}
          </p>
        </div>

        {/* ── Step: Language ── */}
        {step === 'lang' && (
          <div className="w-full flex flex-col gap-4">
            <p className="text-center text-sm text-emerald-200 font-medium uppercase tracking-widest">
              {lang === 'vi' ? 'Chọn ngôn ngữ' : 'Select language'}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(['vi', 'en'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`py-5 rounded-2xl font-bold text-lg flex flex-col items-center gap-2 border-2 transition-all active:scale-95 ${
                    lang === l
                      ? 'bg-white text-emerald-900 border-white shadow-lg shadow-white/20'
                      : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                  }`}
                >
                  <span className="text-3xl">{l === 'vi' ? '🇻🇳' : '🇬🇧'}</span>
                  <span>{l === 'vi' ? 'Tiếng Việt' : 'English'}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('permissions')}
              className="w-full py-4 bg-white text-emerald-900 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-900/30 hover:bg-emerald-50 active:scale-95 transition-all"
            >
              {lang === 'vi' ? 'Tiếp theo →' : 'Continue →'}
            </button>
          </div>
        )}

        {/* ── Step: Permissions ── */}
        {step === 'permissions' && (
          <div className="w-full flex flex-col gap-5">
            <div className="bg-white/10 rounded-2xl p-5 flex flex-col gap-3">
              <PermRow
                icon="📍"
                title={lang === 'vi' ? 'Vị trí GPS' : 'GPS Location'}
                desc={lang === 'vi' ? 'Để phát thuyết minh đúng địa điểm' : 'To trigger narration at POIs'}
                granted={gpsGranted}
              />
              <PermRow
                icon="🔊"
                title={lang === 'vi' ? 'Âm thanh' : 'Audio'}
                desc={lang === 'vi' ? 'Để phát file audio & TTS' : 'For audio playback & TTS'}
                granted={gpsGranted} // audio is unlocked alongside GPS
              />
            </div>

            {gpsError && (
              <p className="text-red-300 text-sm text-center bg-red-900/30 rounded-xl p-3">
                {gpsError}
              </p>
            )}

            <button
              onClick={requestPermissions}
              disabled={loading}
              className="w-full py-4 bg-white text-emerald-900 rounded-2xl font-bold text-lg shadow-xl active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  {lang === 'vi' ? 'Đang xử lý...' : 'Processing...'}
                </>
              ) : (
                lang === 'vi' ? '🔓 Cho phép truy cập' : '🔓 Grant Permissions'
              )}
            </button>

            <button onClick={() => setStep('lang')} className="text-emerald-300 text-sm text-center">
              ← {lang === 'vi' ? 'Quay lại' : 'Back'}
            </button>
          </div>
        )}

        {/* ── Step: Ready ── */}
        {step === 'ready' && (
          <div className="w-full flex flex-col items-center gap-6">
            <div className="text-6xl animate-bounce">✅</div>
            <p className="text-lg font-semibold text-center">
              {lang === 'vi' ? 'Tất cả sẵn sàng!' : "You're all set!"}
            </p>
            <p className="text-sm text-emerald-200 text-center">
              {lang === 'vi'
                ? 'Di chuyển gần một điểm tham quan và âm thanh sẽ tự động phát.'
                : 'Walk near a POI and narration will play automatically.'}
            </p>
            <button
              onClick={handleStart}
              className="w-full py-5 bg-white text-emerald-900 rounded-2xl font-bold text-xl shadow-2xl shadow-emerald-900/40 hover:bg-emerald-50 active:scale-95 transition-all"
            >
              🎧 {lang === 'vi' ? 'Bắt đầu khám phá' : 'Start Exploring'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function PermRow({
  icon, title, desc, granted,
}: {
  icon: string; title: string; desc: string; granted: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl w-8 text-center">{icon}</span>
      <div className="flex-1">
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-emerald-300">{desc}</p>
      </div>
      {granted ? (
        <span className="text-emerald-400 text-xl">✓</span>
      ) : (
        <span className="text-white/30 text-xl">○</span>
      )}
    </div>
  );
}