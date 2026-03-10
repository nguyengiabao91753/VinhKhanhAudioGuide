import type { TourDto } from '../../entities/tour';

interface TourInfoPanelProps {
  tour: TourDto;
  language: string;
}

export function TourInfoPanel({ tour, language }: TourInfoPanelProps) {
  const localized =
    tour.localizedData.find((l) => l.langCode === language) ||
    tour.localizedData[0];

  const durationText =
    language === 'en' ? `${tour.duration} min` : `${tour.duration} phút`;
  const distanceText =
    language === 'en' ? `${tour.distance} km` : `${tour.distance} km`;
  const stopsText = language === 'en' ? 'stops' : 'địa điểm';

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <h2 style={{ margin: '0 0 12px 0', fontSize: 24, fontWeight: 700 }}>
        {localized.name}
      </h2>

      <p style={{ margin: '0 0 16px 0', fontSize: 15, color: '#666', lineHeight: 1.5 }}>
        {localized.description}
      </p>

      {/* Tour Meta */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
          marginTop: 20,
        }}
      >
        <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>⏱️</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{durationText}</div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            {language === 'en' ? 'Duration' : 'Thời gian'}
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>📍</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{distanceText}</div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            {language === 'en' ? 'Distance' : 'Quãng đường'}
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: 12, backgroundColor: '#f5f5f5', borderRadius: 8 }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>🎯</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{tour.poiIds.length}</div>
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>{stopsText}</div>
        </div>
      </div>
    </div>
  );
}
