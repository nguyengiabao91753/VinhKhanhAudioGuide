import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTours } from '../features/tour';
import { LanguageSelector } from '../features/languageSelection';
import { TourCard } from '../widgets/tourCard';
import type { TourDto } from '../entities/tour';

export default function TourListPage() {
  const [tours, setTours] = useState<TourDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState('vi');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTours().then((data) => {
      setTours(data);
      setLoading(false);
    });
  }, []);

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
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
          {language === 'en' ? 'Tours' : 'Khám phá Vịnh Khánh'}
        </h1>
        <LanguageSelector value={language} onChange={setLanguage} />
      </header>

      {/* Main Content */}
      <main style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            {language === 'en' ? 'Loading tours...' : 'Đang tải tour...'}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16,
              maxWidth: 1200,
              margin: '0 auto',
            }}
          >
            {tours.map((tour) => (
              <TourCard
                key={tour.id}
                tour={tour}
                onClick={(tourId) => {
                  navigate(`/tour/${tourId}`);
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
