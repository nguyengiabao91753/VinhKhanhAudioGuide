import type { PoiDto } from '../../../entities/poi';
import { AudioTierEngine } from '../../audio/lib/AudioTierEngine';

export class NarrationService {
  private static instance: NarrationService | null = null;
  private engine = AudioTierEngine.getInstance();
  private played = new Set<string>();
  private language = 'vi';

  static getInstance(): NarrationService {
    if (!this.instance) this.instance = new NarrationService();
    return this.instance;
  }

  setLanguage(lang: string) {
    this.language = lang;
    this.engine.setLanguage(lang);
  }

  async playPoi(poi: PoiDto, force = false): Promise<void> {
    if (!poi) return;
    // BUG FIX: was missing `return` — skip already-played unless force
    if (!force && this.played.has(poi.id)) return;
    await this.engine.play(poi, force);
    this.played.add(poi.id);
  }

  hasPlayed(poiId: string) { return this.played.has(poiId); }
  pause() { this.engine.pause(); }
  resume() { this.engine.resume(); }
  stop() { this.engine.stop(); }
  isPlaying() { return this.engine.state.isPlaying; }
  isPaused() { return this.engine.state.isPaused; }

  subscribe(cb: Parameters<AudioTierEngine['subscribe']>[0]) {
    return this.engine.subscribe(cb);
  }

  reset() {
    this.played.clear();
    this.engine.stop();
  }
}