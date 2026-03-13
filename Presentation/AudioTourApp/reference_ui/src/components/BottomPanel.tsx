import { POI } from '../types';
import { Play, Pause, Navigation, Volume2, Footprints, Heart } from 'lucide-react';

interface BottomPanelProps {
  isTracking: boolean;
  onStart: () => void;
  onStop: () => void;
  playingPoi: POI | null;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  hasLocation: boolean;
  language: 'vi' | 'en';
  favorites: string[];
  onToggleFavorite: (poiId: string) => void;
}

export default function BottomPanel({ 
  isTracking, 
  onStart, 
  onStop, 
  playingPoi,
  isSimulating,
  onToggleSimulation,
  hasLocation,
  language,
  favorites,
  onToggleFavorite
}: BottomPanelProps) {
  return (
    <div className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-[1000] relative pb-safe">
      <div className="p-6">
        {/* Now Playing Section */}
        {playingPoi ? (
          <div className="mb-6 bg-emerald-50 rounded-2xl p-4 border border-emerald-100 relative">
            <button 
              onClick={() => onToggleFavorite(playingPoi.id)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm"
            >
              <Heart size={20} className={favorites.includes(playingPoi.id) ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
            </button>
            <div className="flex items-center gap-3 mb-2 pr-10">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 animate-pulse shrink-0">
                <Volume2 size={20} />
              </div>
              <div>
                <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                  {language === 'vi' ? 'Đang phát' : 'Now Playing'}
                </div>
                <div className="font-bold text-gray-900">{playingPoi.name[language]}</div>
              </div>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{playingPoi.description[language]}</p>
          </div>
        ) : (
          <div className="mb-6 text-center py-4">
            <div className="text-gray-400 mb-1">
              <Navigation className="inline-block mr-2" size={20} />
            </div>
            <p className="text-gray-500 font-medium">
              {isTracking 
                ? (language === 'vi' ? 'Đang khám phá... Hãy đi gần một địa điểm để nghe thuyết minh.' : 'Exploring... Walk near a POI to hear its story.') 
                : (language === 'vi' ? 'Bắt đầu theo dõi để khám phá các địa điểm gần bạn.' : 'Start tracking to discover nearby POIs.')}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          <button
            onClick={isTracking ? onStop : onStart}
            className={`flex-1 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
              isTracking 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-gray-900 text-white hover:bg-gray-800 shadow-xl shadow-gray-900/20'
            }`}
          >
            {isTracking ? (
              <>
                <Pause size={24} /> {language === 'vi' ? 'Dừng' : 'Stop Tracking'}
              </>
            ) : (
              <>
                <Play size={24} /> {language === 'vi' ? 'Bắt đầu' : 'Start Exploring'}
              </>
            )}
          </button>

          {hasLocation && (
            <button
              onClick={onToggleSimulation}
              className={`px-6 rounded-2xl font-bold flex items-center justify-center transition-all active:scale-95 ${
                isSimulating
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
              title={language === 'vi' ? 'Mô phỏng đi bộ' : 'Simulate walking'}
            >
              <Footprints size={24} className={isSimulating ? 'animate-bounce' : ''} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
