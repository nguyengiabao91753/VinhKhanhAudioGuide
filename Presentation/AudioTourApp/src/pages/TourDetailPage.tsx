import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTourById } from '../features/tour';
import { fetchPois } from '../shared/lib';
import { LanguageSelector } from '../features/languageSelection';
import { TourInfoPanel } from '../widgets/tourInfoPanel';
import type { TourDto } from '../entities/tour';
import type { PoiDto } from '../entities/poi';

export default function TourDetailPage() {
  const { tourId } = useParams<{ tourId: string }>();
  const navigate = useNavigate();
  const [tour, setTour] = useState<TourDto | null>(null);
  const [pois, setPois] = useState<PoiDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('vi');

  useEffect(() => {
    Promise.all([fetchTourById(tourId || ''), fetchPois()]).then(
      ([tourData, poisData]) => {
        if (tourData) {
          setTour(tourData);
        }
        setPois(poisData);
        setLoading(false);
      }
    );
  }, [tourId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        {language === 'en' ? 'Loading...' : 'Đang tải...'}
      </div>
    );
  }

  if (!tour) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        {language === 'en' ? 'Tour not found' : 'Không tìm thấy tour'}
      </div>
    );
  }

  // Get tour POIs in order
  const tourPois = tour.poiIds
    .map((id) => pois.find((p) => p.id === id))
    .filter((p): p is PoiDto => p !== undefined);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: 'white',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <button
          onClick={() => navigate('/')}
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
        <h1
          style={{
            margin: 0,
            flex: 1,
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          {language === 'en' ? 'Tour Details' : 'Chi tiết tour'}
        </h1>
        <LanguageSelector value={language} onChange={setLanguage} />
      </header>

      {/* Banner */}
      <div style={{ position: 'relative', height: 300, overflow: 'hidden' }}>
        <img
          src={tour.banner}
          alt={tour.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Content */}
      <main style={{ padding: '20px', maxWidth: 600, margin: '0 auto' }}>
        <TourInfoPanel tour={tour} language={language} />

        {/* CTA Button */}
        <button
          onClick={() => {
            navigate(`/tour/${tour.id}/active`, { state: { pois: tourPois } });
          }}
          style={{
            width: '100%',
            padding: '16px 20px',
            marginTop: 20,
            borderRadius: 12,
            border: 'none',
            backgroundColor: '#ff6b35',
            color: 'white',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {language === 'en' ? '▶ Start Tour' : '▶ Bắt đầu Trải nghiệm'}
        </button>
      </main>
    </div>
  );
}
