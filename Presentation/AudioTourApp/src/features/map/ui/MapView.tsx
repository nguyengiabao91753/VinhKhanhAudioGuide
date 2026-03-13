import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { PoiDto } from '../../../entities/poi';
import type { Location } from '../../location';
import styles from './MapView.module.css';

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

const activePoiIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapUpdater({ location }: { location: Location | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.setView([location.latitude, location.longitude], map.getZoom());
    }
  }, [location, map]);
  return null;
}

interface MapViewProps {
  pois: PoiDto[];
  userLocation: Location | null;
  activePoi: PoiDto | null;
  onMarkerClick: (poi: PoiDto) => void;
  currentLanguage: string;
}

export function MapView({
  pois,
  userLocation,
  activePoi,
  onMarkerClick,
  currentLanguage,
}: MapViewProps) {
  const defaultCenter = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : pois[0]
      ? [pois[0].position.lat, pois[0].position.lng]
      : [10.7578, 106.7042];

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={defaultCenter as [number, number]}
        zoom={16}
        className="w-full h-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && (
          <>
            <MapUpdater location={userLocation} />
            <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
              <Popup>{currentLanguage === 'vi' ? 'Bạn đang ở đây' : 'You are here'}</Popup>
            </Marker>
          </>
        )}

        {pois.map((poi) => {
          const isActive = activePoi?.id === poi.id;
          const localized = poi.localizedData?.find(l => l.langCode === currentLanguage) ?? poi.localizedData?.[0];
          return (
            <Marker
              key={poi.id}
              position={[poi.position.lat, poi.position.lng]}
              icon={isActive ? activePoiIcon : poiIcon}
              eventHandlers={{ click: () => onMarkerClick(poi) }}
            >
              <Popup>
                <div className="min-w-[140px]">
                  <div className="font-semibold">{localized?.name || 'POI'}</div>
                  <div className="text-xs text-gray-500">{localized?.description || localized?.descriptionText || ''}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
