import type { PoiDto } from '../../entities/PoiDto';

type Subscriber = (state: { isPlaying:boolean; isPaused:boolean; currentPoi: PoiDto | null }) => void;

export class NarrationService {
  private static instance: NarrationService | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private synth: SpeechSynthesis | null = null;
  private currentPoi: PoiDto | null = null;
  private language: string = 'vi';
  private played: Set<string> = new Set();
  private subscribers: Subscriber[] = [];

  static getInstance() {
    if(!this.instance) this.instance = new NarrationService();
    return this.instance;
  }

  constructor() {
    this.audioElement = new Audio();
    this.synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
  }

  setLanguage(lang: string) { this.language = lang; }

  async playPoi(poi: PoiDto, force = false): Promise<void> {
    if (!poi) return;
    if (!force && this.currentPoi && this.currentPoi.id === poi.id && this.audioElement && !this.audioElement.paused) {
      return;
    }
    this.currentPoi = poi;

    // pick localized entry
    const ld = poi.localizedData.find(l => l.langCode === this.language) || poi.localizedData[0];
    if (!ld) return;

    // avoid duplicate play unless forced
    if (this.played.has(poi.id) && !force) {
      // already played
    }

    if (ld.descriptionAudio) {
      await this.playAudio(ld.descriptionAudio);
    } else {
      await this.playTTS(ld.descriptionText || ld.description || ld.name);
    }
    this.played.add(poi.id);
    this.notify();
  }

  pause() {
    if (this.audioElement && !this.audioElement.paused) {
      this.audioElement.pause();
      this.notify();
    } else if (this.synth) {
      this.synth.pause();
    }
  }

  resume() {
    if (this.audioElement && this.audioElement.paused) {
      this.audioElement.play();
      this.notify();
    } else if (this.synth) {
      this.synth.resume();
    }
  }

  isPlaying() {
    return !!(this.audioElement && !this.audioElement.paused);
  }
  isPaused() {
    return !!(this.audioElement && this.audioElement.paused);
  }

  private async playAudio(url: string) {
    if (!this.audioElement) return;
    this.audioElement.src = url;
    await this.audioElement.play().catch((e)=>{ console.warn('audio play err', e); });
  }

  private async playTTS(text?: string) {
    if (!text) return;
    if (!this.synth) return;
    this.synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = this.language;
    u.rate = 1;
    this.synth.speak(u);
  }

  subscribe(cb: Subscriber) {
    this.subscribers.push(cb);
    return () => { this.subscribers = this.subscribers.filter(x=>x!==cb); };
  }
  private notify() {
    const st = { isPlaying: this.isPlaying(), isPaused: this.isPaused(), currentPoi: this.currentPoi };
    this.subscribers.forEach(cb => cb(st));
  }
}
