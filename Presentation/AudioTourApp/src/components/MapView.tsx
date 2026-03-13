import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { POI } from '../types';
import { Heart } from 'lucide-react';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const poiIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const playedPoiIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const playingPoiIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapUpdater({ location }: { location: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.setView([location.lat, location.lng], map.getZoom());
    }
  }, [location, map]);
  return null;
}

interface MapViewProps {
  location: { lat: number; lng: number } | null;
  pois: POI[];
  playingPoi: POI | null;
  language: 'vi' | 'en';
  favorites: string[];
  onToggleFavorite: (poiId: string) => void;
  isOffline: boolean;
}

export default function MapView({
  location,
  pois,
  playingPoi,
  language,
  favorites,
  onToggleFavorite,
  isOffline
}: MapViewProps) {
  const defaultCenter = pois[0]
    ? { lat: pois[0].lat, lng: pois[0].lng }
    : { lat: 21.0285, lng: 105.8542 };

  return (
    <div className={`w-full h-full ${isOffline ? 'grayscale-[80%] contrast-125' : ''}`}>
      <MapContainer
        center={[defaultCenter.lat, defaultCenter.lng]}
        zoom={18}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {location && (
          <>
            <MapUpdater location={location} />
            <Marker position={[location.lat, location.lng]} icon={userIcon}>
              <Popup>{language === 'vi' ? 'Bạn đang ở đây' : 'You are here'}</Popup>
            </Marker>
            <Circle
              center={[location.lat, location.lng]}
              radius={30}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }}
            />
          </>
        )}

        {pois.map(poi => {
          let icon = poiIcon;
          if (playingPoi?.id === poi.id) icon = playingPoiIcon;
          else if (poi.played) icon = playedPoiIcon;

          const isFav = favorites.includes(poi.id);

          return (
            <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={icon}>
              <Popup className="custom-popup">
                <div className="w-48">
                  {poi.imageUrl && (
                    <img src={poi.imageUrl} alt={poi.name[language]} className="w-full h-24 object-cover rounded-t-lg mb-2" />
                  )}
                  <div className="flex justify-between items-start px-1">
                    <div>
                      <div className="font-bold text-gray-900">{poi.name[language]}</div>
                      <div className="text-xs text-gray-500 mt-1">{poi.played ? 'Played' : 'Unplayed'}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleFavorite(poi.id); }}
                      className="p-1 -mr-1 -mt-1"
                    >
                      <Heart size={18} className={isFav ? 'text-red-500 fill-red-500' : 'text-gray-400'} />
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
