import { useEffect, useState, useRef } from 'react';
import { AudioTierEngine, type AudioTierState } from '../features/audio/lib/AudioTierEngine';
import type { POI } from '../types';
import { Play, Pause, SkipForward, X, Volume2 } from 'lucide-react';

interface Props {
  playingPoi: POI | null;
  language: 'vi' | 'en';
  onStop: () => void;
}

export default function NarrationBanner({ playingPoi, language, onStop }: Props) {
  const [audioState, setAudioState] = useState<AudioTierState | null>(null);
  const engine = useRef(AudioTierEngine.getInstance());

  useEffect(() => {
    const unsub = engine.current.subscribe(setAudioState);
    return unsub;
  }, []);

  if (!playingPoi) return null;

  const isPlaying = audioState?.isPlaying ?? false;
  const isPaused = audioState?.isPaused ?? false;
  const progress = audioState?.progress ?? 0;
  const tier = audioState?.tier;

  const tierLabel = tier === 1 ? '📦 Cache' : tier === 2 ? '☁️ CDN' : tier === 3 ? '🔊 TTS' : '';

  return (
    <div className="bg-white border-t border-gray-100 shadow-2xl shadow-gray-900/15 z-[2000] relative overflow-hidden">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 h-0.5 bg-emerald-500 transition-all duration-300" style={{ width: `${progress * 100}%` }} />

      <div className="flex items-center gap-3 px-4 py-3">
        {/* POI image / ripple indicator */}
        <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-emerald-50">
          {playingPoi.imageUrl ? (
            <img src={playingPoi.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-emerald-400">
              <Volume2 size={20} />
            </div>
          )}
          {/* Ripple overlay when playing */}
          {isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-xl animate-ping bg-emerald-400 opacity-30" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isPlaying && (
              <span className="flex gap-0.5 items-end h-4 shrink-0">
                {[0, 0.3, 0.15, 0.45].map((delay, i) => (
                  <span
                    key={i}
                    className="w-0.5 bg-emerald-500 rounded-full animate-bounce"
                    style={{
                      height: `${8 + i * 3}px`,
                      animationDelay: `${delay}s`,
                      animationDuration: '0.6s',
                    }}
                  />
                ))}
              </span>
            )}
            <p className="font-semibold text-gray-900 text-sm truncate">
              {playingPoi.name[language]}
            </p>
          </div>
          <p className="text-xs text-gray-500 truncate">
            {isPaused
              ? (language === 'vi' ? 'Tạm dừng' : 'Paused')
              : isPlaying
              ? (language === 'vi' ? 'Đang phát thuyết minh...' : 'Playing narration...')
              : (language === 'vi' ? 'Đang tải...' : 'Loading...')}
            {tierLabel && <span className="ml-1 opacity-60">{tierLabel}</span>}
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => isPaused ? engine.current.resume() : engine.current.pause()}
            className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center active:scale-90 transition-transform"
          >
            {isPaused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            onClick={() => { engine.current.stop(); onStop(); }}
            className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center active:scale-90 transition-transform"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Description preview */}
      <div className="px-4 pb-3">
        <p className="text-xs text-gray-500 line-clamp-2">{playingPoi.description[language]}</p>
      </div>
    </div>
  );
}