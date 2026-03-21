/**
 * SimulationSidebar
 * Shown when simulation mode is active.
 * - Speed slider (0.5 – 10 m/s)
 * - Waypoint list with delete
 * - Route mode toggle (click-map vs auto-POI)
 */
import { useRef } from 'react';
import { Trash2, Navigation, Footprints, RotateCcw, MapPin, ChevronRight } from 'lucide-react';

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  label?: string;
}

interface Props {
  language: 'vi' | 'en';
  speed: number;           // m/s
  onSpeedChange: (v: number) => void;
  waypoints: Waypoint[];
  onClearWaypoints: () => void;
  onRemoveWaypoint: (id: string) => void;
  /** true = user is clicking map to add waypoints */
  isPickingWaypoints: boolean;
  onTogglePicking: () => void;
  /** current sim position for display */
  currentLeg: number;      // index of waypoint being travelled toward
  totalDistance: number;   // metres
}

const SPEED_PRESETS = [
  { label: '1×',   ms: 1.4  },
  { label: '5×',   ms: 7    },
  { label: '20×',  ms: 28   },
  { label: '100×', ms: 140  },
];

function fmtDist(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(2)} km`;
}

export default function SimulationSidebar({
  language, speed, onSpeedChange,
  waypoints, onClearWaypoints, onRemoveWaypoint,
  isPickingWaypoints, onTogglePicking,
  currentLeg, totalDistance,
}: Props) {
  const vi = language === 'vi';
  const sliderRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0, width: 240,
      background: 'rgba(15,23,42,0.95)',
      backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column',
      zIndex: 1500, boxShadow: '-8px 0 32px rgba(0,0,0,.3)',
      borderLeft: '1px solid rgba(255,255,255,.06)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 14px 10px',
        borderBottom: '1px solid rgba(255,255,255,.08)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#1d4ed8',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Footprints size={15} color="#fff" />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>
            {vi ? 'Mô phỏng đi bộ' : 'Walk Simulation'}
          </p>
          <p style={{ margin: 0, fontSize: 10, color: '#64748b' }}>
            {vi ? 'Cấu hình đường đi' : 'Configure route'}
          </p>
        </div>
      </div>

      {/* Speed */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#64748b',
          textTransform: 'uppercase', letterSpacing: 1 }}>
          {vi ? 'Tốc độ' : 'Speed'}
        </p>
        {/* Preset chips */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {SPEED_PRESETS.map(p => (
            <button key={p.label}
              onClick={() => onSpeedChange(p.ms)}
              style={{
                flex: 1, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 700,
                background: Math.abs(speed - p.ms) < Math.max(0.5, p.ms * 0.1) ? '#1d4ed8' : 'rgba(255,255,255,.08)',
                color: Math.abs(speed - p.ms) < Math.max(0.5, p.ms * 0.1) ? '#fff' : '#94a3b8',
                transition: 'all .15s',
              }}>
              {p.label}
            </button>
          ))}
        </div>
        {/* Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input ref={sliderRef} type="range" min={0.5} max={200} step={0.5}
            value={speed}
            onChange={e => onSpeedChange(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: '#3b82f6' }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', minWidth: 50, textAlign: 'right' }}>
            {speed.toFixed(1)} m/s
          </span>
        </div>
        <p style={{ margin: '4px 0 0', fontSize: 10, color: '#475569', textAlign: 'center' }}>
          ≈ {(speed * 3.6).toFixed(1)} km/h
        </p>
      </div>

      {/* Waypoint picker toggle */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#64748b',
          textTransform: 'uppercase', letterSpacing: 1 }}>
          {vi ? 'Đường đi (Waypoints)' : 'Route (Waypoints)'}
        </p>
        <button onClick={onTogglePicking} style={{
          width: '100%', height: 36, borderRadius: 10, border: 'none',
          cursor: 'pointer', fontSize: 12, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          background: isPickingWaypoints
            ? 'linear-gradient(135deg,#1d4ed8,#7c3aed)'
            : 'rgba(255,255,255,.08)',
          color: isPickingWaypoints ? '#fff' : '#94a3b8',
          boxShadow: isPickingWaypoints ? '0 0 0 2px #60a5fa' : 'none',
          transition: 'all .15s',
        }}>
          <MapPin size={14} />
          {isPickingWaypoints
            ? (vi ? '✓ Đang chọn điểm...' : '✓ Picking points...')
            : (vi ? 'Click map để thêm điểm' : 'Click map to add points')}
        </button>
        {isPickingWaypoints && (
          <p style={{ margin: '6px 0 0', fontSize: 10, color: '#3b82f6', textAlign: 'center' }}>
            {vi ? 'Tap vào bản đồ để thêm waypoint' : 'Tap the map to add waypoints'}
          </p>
        )}
      </div>

      {/* Waypoint list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 0' }}>
        {waypoints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Navigation size={28} color="#334155" style={{ margin: '0 auto 8px' }} />
            <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>
              {vi ? 'Chưa có waypoint nào.\nThêm bằng cách click bản đồ.' : 'No waypoints yet.\nClick the map to add.'}
            </p>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ background: 'rgba(255,255,255,.05)', borderRadius: 10,
              padding: '8px 10px', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#60a5fa' }}>{waypoints.length}</p>
                <p style={{ margin: 0, fontSize: 9, color: '#475569', textTransform: 'uppercase' }}>
                  {vi ? 'Điểm' : 'Points'}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#34d399' }}>
                  {fmtDist(totalDistance)}
                </p>
                <p style={{ margin: 0, fontSize: 9, color: '#475569', textTransform: 'uppercase' }}>
                  {vi ? 'Tổng' : 'Total'}
                </p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>
                  {Math.min(currentLeg + 1, waypoints.length)}/{waypoints.length}
                </p>
                <p style={{ margin: 0, fontSize: 9, color: '#475569', textTransform: 'uppercase' }}>
                  {vi ? 'Chặng' : 'Leg'}
                </p>
              </div>
            </div>

            {/* Waypoint items */}
            {waypoints.map((wp, i) => {
              const isActive = i === currentLeg;
              const isPast = i < currentLeg;
              return (
                <div key={wp.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 8px', borderRadius: 8, marginBottom: 4,
                  background: isActive ? 'rgba(29,78,216,.25)' : 'rgba(255,255,255,.04)',
                  border: isActive ? '1px solid rgba(96,165,250,.4)' : '1px solid transparent',
                }}>
                  {/* Step dot */}
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    background: isActive ? '#1d4ed8' : isPast ? '#334155' : 'rgba(255,255,255,.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                    color: isActive ? '#fff' : isPast ? '#475569' : '#64748b',
                  }}>
                    {isPast ? '✓' : i + 1}
                  </div>
                  {/* Coords */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600,
                      color: isActive ? '#93c5fd' : isPast ? '#475569' : '#94a3b8',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {wp.label || `${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}`}
                    </p>
                    {isActive && (
                      <p style={{ margin: 0, fontSize: 9, color: '#3b82f6' }}>
                        {vi ? '▶ Đang đến...' : '▶ Heading here...'}
                      </p>
                    )}
                  </div>
                  <button onClick={() => onRemoveWaypoint(wp.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer',
                      color: '#475569', padding: 2, flexShrink: 0 }}>
                    <Trash2 size={13} />
                  </button>
                  {i < waypoints.length - 1 && (
                    <ChevronRight size={12} color="#334155" style={{ flexShrink: 0 }} />
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Footer actions */}
      {waypoints.length > 0 && (
        <div style={{ padding: '10px 14px 14px', borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <button onClick={onClearWaypoints} style={{
            width: '100%', height: 34, borderRadius: 8, border: 'none',
            background: 'rgba(239,68,68,.15)', color: '#f87171',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <RotateCcw size={13} />
            {vi ? 'Xóa tất cả waypoints' : 'Clear all waypoints'}
          </button>
        </div>
      )}
    </div>
  );
}