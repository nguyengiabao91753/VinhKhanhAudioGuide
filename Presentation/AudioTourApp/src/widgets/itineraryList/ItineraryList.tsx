import type { PoiDto } from '../../entities/poi';

interface ItineraryListProps {
  pois: PoiDto[];
  currentLanguage: string;
  onSelectPoi: (poi: PoiDto) => void;
}

export function ItineraryList({ pois, currentLanguage, onSelectPoi }: ItineraryListProps) {
  const labelText = currentLanguage === 'en' ? 'Itinerary' : 'Lộ trình';

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: '16px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <h3
        style={{
          margin: '0 0 16px 0',
          fontSize: 16,
          fontWeight: 600,
          paddingLeft: 4,
        }}
      >
        {labelText}
      </h3>

      <div>
        {pois.map((poi, idx) => {
          const localized =
            poi.localizedData.find((l) => l.langCode === currentLanguage) ||
            poi.localizedData[0];

          return (
            <div
              key={poi.id}
              onClick={() => onSelectPoi(poi)}
              style={{
                display: 'flex',
                gap: 12,
                padding: 12,
                marginBottom: 8,
                borderRadius: 8,
                backgroundColor: '#f9f9f9',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '1px solid transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.borderColor = '#ff6b35';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f9f9f9';
                e.currentTarget.style.borderColor = 'transparent';
              }}
            >
              {/* Stop Number */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#ff6b35',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {idx + 1}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                  {localized.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: '#999',
                    lineHeight: 1.3,
                  }}
                >
                  {localized.description.substring(0, 60)}...
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
