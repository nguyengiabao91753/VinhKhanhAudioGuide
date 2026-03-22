import { X, Heart, Map as MapIcon, Download, CheckCircle, Trash2 } from 'lucide-react';
import type { PoiDto } from '../entities/poi';
import { t } from '../shared/i18n';
import type { Tour } from '../types';

interface MenuOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'tours' | 'favorites' | 'offline';
  setActiveTab: (tab: 'tours' | 'favorites' | 'offline') => void;
  language: string;
  tours: Tour[];
  selectedTour: Tour | null;
  onSelectTour: (tour: Tour | null) => void;
  pois: PoiDto[];
  favorites: string[];
  onToggleFavorite: (poiId: string) => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  hasDownloadedData: boolean;
  onDownloadData: () => void;
  onClearData: () => void;
}

export default function MenuOverlay({
  isOpen, onClose, activeTab, setActiveTab, language,
  tours, selectedTour, onSelectTour,
  pois, favorites, onToggleFavorite,
  isOffline, onToggleOffline, hasDownloadedData, onDownloadData, onClearData
}: MenuOverlayProps) {
  if (!isOpen) return null;

  const favoritePois = pois.filter(p => favorites.includes(p.id));

  return (
    <div className="fixed inset-0 z-[2000] bg-white flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900">
          {t(language,'menu.title')}
        </h2>
        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-600 hover:bg-gray-200">
          <X size={24} />
        </button>
      </div>

      <div className="flex p-2 gap-2 bg-gray-50">
        <button
          onClick={() => setActiveTab('tours')}
          className={`flex-1 py-2 rounded-xl font-medium text-sm flex items-center justify-center gap-2 ${activeTab === 'tours' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
        >
          <MapIcon size={16} /> {t(language,'menu.tours')}
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 py-2 rounded-xl font-medium text-sm flex items-center justify-center gap-2 ${activeTab === 'favorites' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
        >
          <Heart size={16} /> {t(language,'menu.favorites')}
        </button>
        <button
          onClick={() => setActiveTab('offline')}
          className={`flex-1 py-2 rounded-xl font-medium text-sm flex items-center justify-center gap-2 ${activeTab === 'offline' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
        >
          <Download size={16} /> {t(language,'menu.offline')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {activeTab === 'tours' && (
          <div className="space-y-4">
            {selectedTour && (
              <button
                onClick={() => onSelectTour(null)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-medium hover:bg-gray-100 transition-colors"
              >
                {t(language,'menu.clear_tour')}
              </button>
            )}
            {tours.map(tour => (
              <div
                key={tour.id}
                onClick={() => { onSelectTour(tour); onClose(); }}
                className={`bg-white rounded-3xl overflow-hidden shadow-sm border-2 cursor-pointer transition-all ${selectedTour?.id === tour.id ? 'border-blue-500' : 'border-transparent'}`}
              >
                {tour.imageUrl && (
                  <img src={tour.imageUrl} alt={tour.name[language as 'vi'|'en']} className="w-full h-40 object-cover" />
                )}
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-1">{tour.name[language as 'vi'|'en']}</h3>
                  <p className="text-gray-500 text-sm line-clamp-2 mb-3">{tour.description[language as 'vi'|'en']}</p>
                  <div className="text-xs font-semibold text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-full">
                    {tour.poiIds.length} {t(language,'menu.locations')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="space-y-4">
            {favoritePois.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Heart size={48} className="mx-auto mb-3 opacity-20" />
                <p>{t(language,'menu.no_favorites')}</p>
              </div>
            ) : (
              favoritePois.map(poi => (
                <div key={poi.id} className="bg-white rounded-2xl p-4 shadow-sm flex gap-4 items-center">
                  {(poi.banner || poi.thumbnail) && (
                    <img src={(poi.banner || poi.thumbnail)!} alt={poi.localizedData?.find(l=>l.langCode===language)?.name||''} className="w-16 h-16 rounded-xl object-cover" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{poi.localizedData?.find(l=>l.langCode===language)?.name||poi.localizedData?.[0]?.name||''}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{poi.localizedData?.find(l=>l.langCode===language)?.description||poi.localizedData?.[0]?.description||''}</p>
                  </div>
                  <button
                    onClick={() => onToggleFavorite(poi.id)}
                    className="p-2 text-red-500 bg-red-50 rounded-full"
                  >
                    <Heart size={20} fill="currentColor" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'offline' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isOffline ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                  <Download size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    {t(language,'menu.offline_mode')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t(language,'menu.offline_desc')}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between py-4 border-t border-gray-100">
                <span className="font-medium text-gray-700">
                  {t(language,'menu.enable_offline')}
                </span>
                <button
                  onClick={onToggleOffline}
                  disabled={!hasDownloadedData && !isOffline}
                  className={`w-14 h-8 rounded-full transition-colors relative ${isOffline ? 'bg-orange-500' : 'bg-gray-200'} ${(!hasDownloadedData && !isOffline) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${isOffline ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {(!hasDownloadedData && !isOffline) && (
                <p className="text-xs text-orange-500 mt-2">
                  {t(language,'menu.download_note')}
                </p>
              )}
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">
                {t(language,'menu.data_mgmt')}
              </h3>

              {hasDownloadedData ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 p-3 rounded-xl">
                    <CheckCircle size={20} />
                    <span className="text-sm font-medium">
                      {t(language,'menu.data_downloaded')}
                    </span>
                  </div>
                  <button
                    onClick={onClearData}
                    className="w-full py-3 flex items-center justify-center gap-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl font-medium transition-colors"
                  >
                    <Trash2 size={18} />
                    {t(language,'menu.clear_data')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={onDownloadData}
                  className="w-full py-4 flex items-center justify-center gap-2 text-white bg-gray-900 hover:bg-gray-800 rounded-xl font-bold transition-colors"
                >
                  <Download size={20} />
                  {t(language,'menu.download_area')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}