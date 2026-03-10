import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTourById } from '../features/tour';
import { fetchPois } from '../shared/lib';
import { useLocation as useUserLocation } from '../features/location';
import { GeofenceService } from '../features/geofence';
import { NarrationService } from '../features/narration';
import { LanguageSelector } from '../features/languageSelection';
import { MapView } from '../features/map';
import { ItineraryList } from '../widgets/itineraryList';
import { POIDetailModal } from '../widgets/poiDetailModal';
import type { TourDto } from '../entities/tour';
import type { PoiDto } from '../entities/poi';

export default function TourActivePage() {
    const { tourId } = useParams<{ tourId: string }>();
    const navigate = useNavigate();
    // const locationState = useLocation();
    const userLocation = useUserLocation();

    const [tour, setTour] = useState<TourDto | null>(null);
    const [pois, setPois] = useState<PoiDto[]>([]);
    const [tourPois, setTourPois] = useState<PoiDto[]>([]);
    const [activePoi, setActivePoi] = useState<PoiDto | null>(null);
    const [selectedPoi, setSelectedPoi] = useState<PoiDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [language, setLanguage] = useState('vi');
    const isMobile = window.innerWidth < 768;

    // Get pois from location state if available
    // const initialPois = (locationState.state as { pois?: PoiDto[] })?.pois;

    useEffect(() => {
        Promise.all([fetchTourById(tourId || ''), fetchPois()]).then(
            ([tourData, poisData]) => {
                if (tourData) {
                    setTour(tourData);
                    const tPois = tourData.poiIds
                        .map((id) => poisData.find((p) => p.id === id))
                        .filter((p): p is PoiDto => p !== undefined);
                    setTourPois(tPois);
                }
                setPois(poisData);
                setLoading(false);
            }
        );
    }, [tourId]);

    // Setup geofence
    useEffect(() => {
        const geofence = GeofenceService.getInstance();
        geofence.setPois(tourPois);

        const unsub = geofence.subscribe(({ activePoi: a }) => {
            if (a) {
                setActivePoi(a);
                const narration = NarrationService.getInstance();
                narration.playPoi(a, false);
            }
        });

        return () => unsub();
    }, [tourPois]);

    // Setup language for narration
    useEffect(() => {
        const ns = NarrationService.getInstance();
        ns.setLanguage(language);
    }, [language]);

    const handleMarkerClick = (poi: PoiDto) => {
        setActivePoi(poi);
        setSelectedPoi(poi);
        NarrationService.getInstance().playPoi(poi, true).catch(() => { });
    };

    const handleNext = () => {
        // Move to next POI in the tour
        const currentIdx = tourPois.findIndex((p) => p.id === selectedPoi?.id);
        if (currentIdx >= 0 && currentIdx < tourPois.length - 1) {
            const nextPoi = tourPois[currentIdx + 1];
            setSelectedPoi(nextPoi);
        }
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                {language === 'en' ? 'Loading tour...' : 'Đang tải tour...'}
            </div>
        );
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header
                style={{
                    backgroundColor: 'white',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    zIndex: 50,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                        onClick={() => navigate(`/tour/${tourId}`)}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: 24,
                            cursor: 'pointer',
                            padding: 0,
                        }}
                    >
                        ←
                    </button>
                    <div>
                        <h2
                            style={{
                                margin: 0,
                                fontSize: 16,
                                fontWeight: 600,
                            }}
                        >
                            {tour?.name || 'Tour'}
                        </h2>
                        <div
                            style={{
                                fontSize: 12,
                                color: '#ff6b35',
                                fontWeight: 600,
                            }}
                        >
                            {language === 'en' ? `${tourPois.length - 1}/3 stops visited` : `Đã đến ${Math.min(tourPois.length, 1)}/3 điểm`}
                        </div>
                    </div>
                </div>
                <LanguageSelector value={language} onChange={setLanguage} />
            </header>

            {/* Map + Itinerary Container */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Map */}
                <div style={{ flex: 1 }}>
                    <MapView
                        pois={tourPois}
                        userLocation={userLocation}
                        activePoi={activePoi}
                        onMarkerClick={handleMarkerClick}
                        currentLanguage={language}
                    />
                </div>

                {/* Itinerary Sidebar (Mobile: Hidden, Desktop: Show) */}
                <div
                    style={{
                        display: isMobile ? "block" : "none",
                        backgroundColor: "white",
                        borderTop: "1px solid #eee",
                        maxHeight: 250,
                        overflow: "auto",
                    }}
                >
                    <div style={{ padding: 12 }}>
                        <ItineraryList
                            pois={tourPois}
                            currentLanguage={language}
                            onSelectPoi={handleMarkerClick}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Itinerary Bottom Sheet */}

            <div
                style={{
                    display: isMobile ? "block" : "none",
                    backgroundColor: "white",
                    borderTop: "1px solid #eee",
                    maxHeight: 250,
                    overflow: "auto",
                }}
            >
                <div style={{ padding: 12 }}>
                    <ItineraryList
                        pois={tourPois}
                        currentLanguage={language}
                        onSelectPoi={handleMarkerClick}
                    />
                </div>
            </div>

            {/* POI Detail Modal */}
            <POIDetailModal
                poi={selectedPoi}
                language={language}
                isOpen={!!selectedPoi}
                onClose={() => setSelectedPoi(null)}
                onNext={handleNext}
            />
        </div>
    );
}
