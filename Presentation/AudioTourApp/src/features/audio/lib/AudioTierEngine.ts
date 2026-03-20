import type { PoiDto } from '../../../entities/poi';

export type AudioTierState = {
  isPlaying: boolean;
  isPaused: boolean;
  progress: number; // 0-1
  currentPoiId: string | null;
  tier: 1 | 2 | 3 | null; // which tier is active
  error: string | null;
};

type Subscriber = (state: AudioTierState) => void;

const FADE_DURATION_MS = 400;

export class AudioTierEngine {
  private static instance: AudioTierEngine | null = null;

  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private audio: HTMLAudioElement;
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  private language = 'vi';
  private currentPoiId: string | null = null;
  private tier: 1 | 2 | 3 | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;
  private subscribers: Subscriber[] = [];

  private constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

    this.audio.addEventListener('ended', () => this.onAudioEnded());
    this.audio.addEventListener('error', () => this.onAudioError());
    this.audio.addEventListener('timeupdate', () => this.notify());
  }

  static getInstance(): AudioTierEngine {
    if (!this.instance) this.instance = new AudioTierEngine();
    return this.instance;
  }

  // FR-7.6: Must be called from user gesture (onboarding Start button)
  async unlock(): Promise<void> {
    if (this.ctx?.state === 'running') return;
    this.ctx = new AudioContext();
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);
    if (this.ctx.state === 'suspended') await this.ctx.resume();
  }

  setLanguage(lang: string) {
    this.language = lang;
  }

  // Tier 1.5: Pre-fetch audio into SW cache without playing
  async prefetch(poi: PoiDto): Promise<void> {
    const ld = poi.localizedData.find((l) => l.langCode === this.language) ?? poi.localizedData[0];
    if (!ld?.descriptionAudio) return;
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: 'PREFETCH', url: ld.descriptionAudio });
  }

  async play(poi: PoiDto, force = false): Promise<void> {
    if (!force && this.currentPoiId === poi.id && this.audio && !this.audio.paused) return;

    this.stop();

    const ld = poi.localizedData.find((l) => l.langCode === this.language) ?? poi.localizedData[0];
    if (!ld) return;

    this.currentPoiId = poi.id;
    this.notify();

    const audioUrl = ld.descriptionAudio;

    if (audioUrl) {
      // Tier 1 / Tier 2: try to play from URL (SW cache hits automatically)
      const success = await this.playAudioUrl(audioUrl);
      if (success) return;
    }

    // Tier 3: TTS fallback
    await this.playTTS(ld.descriptionText || ld.description || ld.name);
  }

  private async playAudioUrl(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.audio.src = url;
      this.tier = 1; // may be served from SW cache (tier 1) or CDN (tier 2)

      // Detect if served from SW cache via performance entries
      const onCanPlay = async () => {
        this.audio.removeEventListener('canplay', onCanPlay);
        await this.fadeIn();
        const played = this.audio.play();
        played
          .then(() => {
            this.startProgressTimer();
            this.notify();
            resolve(true);
          })
          .catch(() => resolve(false));
      };

      const onError = () => {
        this.audio.removeEventListener('canplay', onCanPlay);
        this.audio.removeEventListener('error', onError);
        resolve(false);
      };

      this.audio.addEventListener('canplay', onCanPlay, { once: true });
      this.audio.addEventListener('error', onError, { once: true });

      // Timeout: if no audio in 4s → fallback
      setTimeout(() => {
        this.audio.removeEventListener('canplay', onCanPlay);
        this.audio.removeEventListener('error', onError);
        resolve(false);
      }, 4000);
    });
  }

  private async playTTS(text?: string): Promise<void> {
    if (!text || !this.synth) return;
    this.tier = 3;
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.language === 'vi' ? 'vi-VN' : 'en-US';
    utterance.rate = 0.9;

    const voices = this.synth.getVoices();
    const preferred = voices.find((v) =>
      this.language === 'vi' ? v.lang.includes('vi') : v.lang.startsWith('en')
    );
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
      this.currentPoiId = null;
      this.tier = null;
      this.notify();
    };
    utterance.onerror = () => {
      this.currentPoiId = null;
      this.tier = null;
      this.notify();
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
    this.notify();
  }

  pause() {
    if (!this.audio.paused) {
      this.audio.pause();
    } else if (this.synth?.speaking) {
      this.synth.pause();
    }
    this.notify();
  }

  resume() {
    if (this.audio.paused && this.audio.src) {
      this.audio.play().catch(() => {});
    } else if (this.synth?.paused) {
      this.synth.resume();
    }
    this.notify();
  }

  stop() {
    this.clearProgressTimer();

    if (!this.audio.paused) {
      this.fadeOut().then(() => {
        this.audio.pause();
        this.audio.src = '';
      });
    } else {
      this.audio.src = '';
    }

    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }

    this.currentPoiId = null;
    this.tier = null;
    this.notify();
  }

  get state(): AudioTierState {
    const isPlaying =
      (!this.audio.paused && !!this.audio.src) ||
      (!!this.synth?.speaking && !this.synth?.paused);
    const isPaused =
      (this.audio.paused && !!this.audio.src && this.audio.currentTime > 0) ||
      (!!this.synth?.paused);
    const progress =
      this.audio.duration > 0 ? this.audio.currentTime / this.audio.duration : 0;

    return { isPlaying, isPaused, progress, currentPoiId: this.currentPoiId, tier: this.tier, error: null };
  }

  subscribe(cb: Subscriber): () => void {
    this.subscribers.push(cb);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== cb);
    };
  }

  private notify() {
    const st = this.state;
    this.subscribers.forEach((cb) => cb(st));
  }

  private onAudioEnded() {
    this.clearProgressTimer();
    this.currentPoiId = null;
    this.tier = null;
    this.notify();
  }

  private onAudioError() {
    this.clearProgressTimer();
    this.notify();
  }

  private startProgressTimer() {
    this.clearProgressTimer();
    this.progressTimer = setInterval(() => this.notify(), 500);
  }

  private clearProgressTimer() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  // Audio ducking: ramp gain 0→1 over FADE_DURATION_MS
  private async fadeIn(): Promise<void> {
    if (!this.gainNode || !this.ctx) return;
    this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
    this.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(1, this.ctx.currentTime + FADE_DURATION_MS / 1000);
  }

  private async fadeOut(): Promise<void> {
    if (!this.gainNode || !this.ctx) return;
    return new Promise((resolve) => {
      const endTime = this.ctx!.currentTime + FADE_DURATION_MS / 1000;
      this.gainNode!.gain.cancelScheduledValues(this.ctx!.currentTime);
      this.gainNode!.gain.setValueAtTime(this.gainNode!.gain.value, this.ctx!.currentTime);
      this.gainNode!.gain.linearRampToValueAtTime(0, endTime);
      setTimeout(resolve, FADE_DURATION_MS);
    });
  }
}