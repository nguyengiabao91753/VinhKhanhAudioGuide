/**
 * NarrationEngine v2
 *
 * playNarration: Web Speech API TTS — supports all BCP-47 language codes.
 * Progress emitter: polls SpeechSynthesisUtterance.elapsedTime to drive banner bar.
 * speakApproach: lightweight notification (no progress) for "approaching POI" alerts.
 */

// BCP-47 locale map — expand as needed
const LANG_LOCALE: Record<string, string> = {
  vi: 'vi-VN',
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
  es: 'es-ES',
  it: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  pt: 'pt-PT',
  ru: 'ru-RU',
  th: 'th-TH',
  ar: 'ar-SA',
  nl: 'nl-NL',
  pl: 'pl-PL',
  tr: 'tr-TR',
};

function getLocale(lang: string): string {
  return LANG_LOCALE[lang] ?? `${lang}-${lang.toUpperCase()}`;
}

function getBestVoice(lang: string): SpeechSynthesisVoice | null {
  const locale = getLocale(lang);
  const voices = window.speechSynthesis.getVoices();
  // Exact locale match first, then prefix match
  return (
    voices.find(v => v.lang === locale) ??
    voices.find(v => v.lang.startsWith(lang)) ??
    null
  );
}

let progressTimer: ReturnType<typeof setInterval> | null = null;
type ProgressCb = (p: number) => void;
let progressSubscriber: ProgressCb | null = null;

export function subscribeProgress(cb: ProgressCb): () => void {
  progressSubscriber = cb;
  return () => { progressSubscriber = null; };
}

function clearProgress() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
  progressSubscriber?.(0);
}

function startProgress(utterance: SpeechSynthesisUtterance) {
  clearProgress();
  let elapsed = 0;
  const start = Date.now();
  // SpeechSynthesis doesn't expose duration reliably — estimate via charRate
  const estimatedMs = Math.max(2000, utterance.text.length * 70); // ~70ms/char

  progressTimer = setInterval(() => {
    elapsed = Date.now() - start;
    const p = Math.min(elapsed / estimatedMs, 0.99);
    progressSubscriber?.(p);
  }, 200);
}

export function playNarration(text: string, lang: string, onEnd: () => void): void {
  if (!('speechSynthesis' in window)) { onEnd(); return; }

  window.speechSynthesis.cancel();
  clearProgress();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang  = getLocale(lang);
  utter.rate  = 0.92;
  utter.pitch = 1;

  // Voices load async — try immediately, retry after voices load
  const trySetVoice = () => {
    const v = getBestVoice(lang);
    if (v) utter.voice = v;
  };
  trySetVoice();
  if (!utter.voice) {
    window.speechSynthesis.onvoiceschanged = () => { trySetVoice(); window.speechSynthesis.onvoiceschanged = null; };
  }

  utter.onstart = () => startProgress(utter);
  utter.onend   = () => { clearProgress(); progressSubscriber?.(1); onEnd(); };
  utter.onerror = () => { clearProgress(); onEnd(); };

  window.speechSynthesis.speak(utter);
}

export function stopNarration(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  clearProgress();
}

/**
 * Speak an approach notification using Web Speech (no progress tracking).
 * Used for "Bạn đang đến gần [POI]..." alerts.
 */
export function speakNotification(text: string, lang: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang  = getLocale(lang);
  utter.rate  = 1.05;
  utter.pitch = 1;
  const v = getBestVoice(lang);
  if (v) utter.voice = v;
  window.speechSynthesis.speak(utter);
}