import type { PoiDto } from '../../entities/poi';
import { NarrationService } from '../../features/narration';

interface POIDetailModalProps {
  poi: PoiDto | null;
  language: string;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
}

export function POIDetailModal({
  poi,
  language,
  isOpen,
  onClose,
  onNext,
}: POIDetailModalProps) {
  if (!isOpen || !poi) return null;

  const localized =
    poi.localizedData.find((l) => l.langCode === language) ||
    poi.localizedData[0];

  const narration = NarrationService.getInstance();
  const isPlaying = narration.isPlaying();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'flex-end',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      {/* Modal Content */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 600,
          maxHeight: '80vh',
          backgroundColor: 'white',
          borderRadius: '24px 24px 0 0',
          overflow: 'auto',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.1)',
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'rgba(0,0,0,0.6)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            zIndex: 10,
          }}
        >
          ✕
        </button>

        {/* Banner */}
        <div style={{ position: 'relative', height: 240, overflow: 'hidden' }}>
          <img
            src={poi.banner}
            alt={localized.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {/* Badge */}
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              backgroundColor: '#ff6b35',
              color: 'white',
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {language === 'en' ? 'Now visiting' : 'Đã đến điểm dừng'}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 20px 20px' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: 24, fontWeight: 700 }}>
            {localized.name}
          </h2>

          <p style={{ margin: '0 0 20px 0', fontSize: 14, color: '#666', lineHeight: 1.6 }}>
            {localized.description}
          </p>

          {/* Audio Player */}
          {localized.descriptionAudio || true && (
            <div
              style={{
                backgroundColor: '#f5f5f5',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: '#ff6b35',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                🔊
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>
                  {language === 'en' ? 'Audio Guide' : 'Audio Giới thiệu'}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>01:24</div>
              </div>
              <button
                onClick={() => {
                  narration.playPoi(poi, true);
                }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: '#ff6b35',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
            </div>
          )}

          {/* CTA Button */}
          <button
            onClick={() => {
              onNext?.();
              onClose();
            }}
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 12,
              border: 'none',
              backgroundColor: '#ff6b35',
              color: 'white',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 12,
            }}
          >
            {language === 'en' ? 'Continue Tour' : 'Tiếp tục hành trình'}
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
}
