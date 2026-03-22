import type { PoiDto } from '../entities/poi';
import { t } from '../shared/i18n';
import { Play, Pause, Navigation, Volume2, Footprints } from 'lucide-react';

interface BottomPanelProps {
  isTracking: boolean;
  onStart: () => void;
  onStop: () => void;
  playingPoi: PoiDto | null;
  /** Pre-computed display name (caller picks the right lang) */
  playingPoiName: string | null;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  hasLocation: boolean;
  language: string;
  favorites: string[];
  onToggleFavorite: (poiId: string) => void;
}

export default function BottomPanel({
  isTracking, onStart, onStop,
  playingPoi, playingPoiName,
  isSimulating, onToggleSimulation,
  hasLocation, language, favorites, onToggleFavorite,
}: BottomPanelProps) {
  const isFav = playingPoi ? favorites.includes(playingPoi.id) : false;
  const thumb = playingPoi?.thumbnail || playingPoi?.banner;

  return (
    <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-[1000] relative pb-safe">
      <div className="p-5">
        {playingPoi ? (
          <div className="mb-4 bg-emerald-50 rounded-2xl p-3 border border-emerald-100 flex items-center gap-3 relative">
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-emerald-100 flex-shrink-0">
              {thumb
                ? <img src={thumb} alt="" className="w-full h-full object-cover"/>
                : <div className="w-full h-full flex items-center justify-center text-emerald-500">
                    <Volume2 size={20}/>
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-0.5">
                {t(language,'now_playing')}
              </div>
              <div className="font-bold text-gray-900 text-sm truncate">
                {playingPoiName || playingPoi.id}
              </div>
            </div>
            {/* Favourite */}
            <button onClick={() => onToggleFavorite(playingPoi.id)}
              className="p-2 rounded-full bg-white shadow-sm flex-shrink-0">
              <span className="text-lg">{isFav ? '❤️' : '🤍'}</span>
            </button>
          </div>
        ) : (
          <div className="mb-4 text-center py-3">
            <Navigation className="inline-block text-gray-400 mr-2" size={20}/>
            <span className="text-gray-500 font-medium text-sm">
              {isTracking
                ? (t(language,'walk_hint'))
                : (t(language,'start_hint'))}
            </span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={isTracking ? onStop : onStart}
            className={`flex-1 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isTracking
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-gray-900 text-white hover:bg-gray-800 shadow-xl shadow-gray-900/20'
            }`}
          >
            {isTracking
              ? <><Pause size={22}/> {t(language,'btn.stop')}</>
              : <><Play size={22}/> {t(language,'btn.start')}</>
            }
          </button>

          {hasLocation && (
            <button
              onClick={onToggleSimulation}
              className={`px-5 rounded-2xl font-bold flex items-center justify-center transition-all active:scale-95 ${
                isSimulating
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
              title={t(language,'btn.simulate')}
            >
              <Footprints size={22} className={isSimulating ? 'animate-bounce' : ''}/>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}