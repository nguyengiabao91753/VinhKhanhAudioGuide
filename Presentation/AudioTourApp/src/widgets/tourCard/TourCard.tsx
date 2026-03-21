import type { TourDto } from '../../entities/tour';

interface TourCardProps {
  tour: TourDto;
  onClick: (tourId: string) => void;
}

export function TourCard({ tour, onClick }: TourCardProps) {
  const description =
    tour.description?.trim() ||
    tour.localizedData?.[0]?.description ||
    tour.localizedData?.[0]?.descriptionText ||
    '';
  const durationText = tour.duration > 0 ? `${tour.duration} phút` : 'N/A';
  const distanceText = tour.distance > 0 ? `${tour.distance} km` : 'N/A';
  return (
    <div
      onClick={() => onClick(tour.id)}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Card Image */}
      <div style={{ position: 'relative', height: 160, overflow: 'hidden' }}>
        <img
          src={tour.thumbnail}
          alt={tour.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>

      {/* Card Content */}
      <div style={{ padding: 12 }}>
        <h3 style={{ margin: '8px 0 4px 0', fontSize: 16, fontWeight: 600 }}>
          {tour.name}
        </h3>
        <p
          style={{
            margin: '4px 0 12px 0',
            fontSize: 13,
            color: '#666',
            lineHeight: 1.4,
          }}
        >
          {description ? `${description.substring(0, 80)}...` : 'Chưa có mô tả.'}
        </p>

        {/* Tour Meta */}
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#999' }}>
          <span>⏱️ {durationText}</span>
          <span>📍 {distanceText}</span>
          <span>🎯 {tour.poiIds.length} điểm</span>
        </div>
      </div>
    </div>
  );
}
