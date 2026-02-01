import type { PoiDto, LocalizedData } from '../../dto/PoiDto';

/**
 * Narration Service
 * Handles audio playback and text-to-speech for POI descriptions
 */

export type NarrationStatus = 'idle' | 'playing' | 'paused' | 'loading';

export interface NarrationState {
  status: NarrationStatus;
  currentPoi: PoiDto | null;
  currentLanguage: string;
  currentTime: number;
  duration: number;
}

type StateChangeCallback = (state: NarrationState) => void;

export class NarrationService {
  private static instance: NarrationService;
  private audioElement: HTMLAudioElement | null = null;
  private synth: SpeechSynthesis | null = null;
  private currentPoi: PoiDto | null = null;
  private currentLanguage = 'en';
  private subscribers: StateChangeCallback[] = [];
  private playedPois: Set<string> = new Set();
  private isAutoPlay = true;
  private currentStatus: NarrationStatus = 'idle';
  private currentTime = 0;
  private duration = 0;

  private constructor() {
    this.audioElement = new Audio();
    this.synth = window.speechSynthesis;
    this.setupAudioListeners();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): NarrationService {
    if (!NarrationService.instance) {
      NarrationService.instance = new NarrationService();
    }
    return NarrationService.instance;
  }

  /**
   * Set current language
   */
  setLanguage(langCode: string): void {
    this.currentLanguage = langCode;
  }

  /**
   * Get current language
   */
  getLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Get localized data for current language
   */
  private getLocalizedData(poi: PoiDto): LocalizedData | null {
    return (
      poi.localizedData.find((data) => data.langCode === this.currentLanguage) ||
      poi.localizedData[0] ||
      null
    );
  }

  /**
   * Play narration for a POI
   */
  async playPoi(poi: PoiDto, autoPlay = true): Promise<void> {
    this.isAutoPlay = autoPlay;

    // Don't repeat same POI too quickly
    if (this.currentPoi?.id === poi.id && this.currentStatus === 'playing') {
      return;
    }

    this.currentPoi = poi;
    this.currentStatus = 'loading';
    this.notifySubscribers();

    const localizedData = this.getLocalizedData(poi);
    if (!localizedData) return;

    try {
      // Try to play audio if available
      if (localizedData.descriptionAudio) {
        await this.playAudio(localizedData.descriptionAudio);
      } else {
        // Fallback to text-to-speech
        await this.playTextToSpeech(localizedData.descriptionText);
      }

      // Mark as played
      this.playedPois.add(poi.id);
    } catch (error) {
      console.error('Error playing narration:', error);
      this.currentStatus = 'idle';
      this.notifySubscribers();
    }
  }

  /**
   * Play audio file
   */
  private playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.audioElement) {
        reject(new Error('Audio element not available'));
        return;
      }

      this.audioElement.src = audioUrl;
      this.currentStatus = 'playing';
      this.notifySubscribers();

      const onEnded = () => {
        this.currentStatus = 'idle';
        this.notifySubscribers();
        cleanup();
        resolve();
      };

      const onError = () => {
        this.currentStatus = 'idle';
        this.notifySubscribers();
        cleanup();
        reject(new Error('Audio playback failed'));
      };

      const cleanup = () => {
        if (this.audioElement) {
          this.audioElement.removeEventListener('ended', onEnded);
          this.audioElement.removeEventListener('error', onError);
        }
      };

      this.audioElement.addEventListener('ended', onEnded, { once: true });
      this.audioElement.addEventListener('error', onError, { once: true });

      this.audioElement.play().catch((error) => {
        console.error('Audio play failed:', error);
        reject(error);
      });
    });
  }

  /**
   * Play text-to-speech
   */
  private playTextToSpeech(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth) {
        resolve();
        return;
      }

      // Cancel any ongoing speech
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.getLangCodeForTTS();
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => {
        this.currentStatus = 'playing';
        this.notifySubscribers();
      };

      utterance.onend = () => {
        this.currentStatus = 'idle';
        this.notifySubscribers();
        resolve();
      };

      utterance.onerror = () => {
        this.currentStatus = 'idle';
        this.notifySubscribers();
        resolve();
      };

      this.synth.speak(utterance);
    });
  }

  /**
   * Convert language code to TTS language code
   */
  private getLangCodeForTTS(): string {
    switch (this.currentLanguage) {
      case 'vi':
        return 'vi-VN';
      case 'en':
        return 'en-US';
      default:
        return 'en-US';
    }
  }

  /**
   * Pause narration
   */
  pause(): void {
    if (this.audioElement && this.audioElement.src) {
      this.audioElement.pause();
      this.currentStatus = 'paused';
      this.notifySubscribers();
    } else if (this.synth && this.synth.speaking) {
      this.synth.pause();
      this.currentStatus = 'paused';
      this.notifySubscribers();
    }
  }

  /**
   * Resume narration
   */
  resume(): void {
    if (this.audioElement && this.audioElement.paused && this.audioElement.src) {
      this.audioElement.play();
      this.currentStatus = 'playing';
      this.notifySubscribers();
    } else if (this.synth && this.synth.paused) {
      this.synth.resume();
      this.currentStatus = 'playing';
      this.notifySubscribers();
    }
  }

  /**
   * Stop narration
   */
  stop(): void {
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentStatus = 'idle';
    this.currentTime = 0;
    this.notifySubscribers();
  }

  /**
   * Get current state
   */
  getState(): NarrationState {
    return {
      status: this.currentStatus,
      currentPoi: this.currentPoi,
      currentLanguage: this.currentLanguage,
      currentTime: this.currentTime,
      duration: this.duration,
    };
  }

  /**
   * Check if POI has been played
   */
  hasBeenPlayed(poiId: string): boolean {
    return this.playedPois.has(poiId);
  }

  /**
   * Subscribe to narration state changes
   */
  subscribe(callback: StateChangeCallback): () => void {
    this.subscribers.push(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback);
    };
  }

  /**
   * Setup audio element event listeners
   */
  private setupAudioListeners(): void {
    if (!this.audioElement) return;

    this.audioElement.addEventListener('timeupdate', () => {
      this.currentTime = this.audioElement?.currentTime || 0;
      this.duration = this.audioElement?.duration || 0;
    });

    this.audioElement.addEventListener('loadedmetadata', () => {
      this.duration = this.audioElement?.duration || 0;
      this.notifySubscribers();
    });
  }

  /**
   * Notify all subscribers of state change
   */
  private notifySubscribers(): void {
    const state = this.getState();
    this.subscribers.forEach((callback) => {
      callback(state);
    });
  }
}
