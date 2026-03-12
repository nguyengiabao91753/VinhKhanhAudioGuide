import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoutButton } from '@/features/auth/ui/LogoutButton';
import { poiApi } from '@/entities/poi';
import { tourApi } from '@/entities/tour';

interface DashboardStats {
  poiCount: number;
  tourCount: number;
  loading: boolean;
  error: string | null;
}

export const DashboardPage = () => {
  const [stats, setStats] = useState<DashboardStats>({
    poiCount: 0,
    tourCount: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        setStats((prev) => ({ ...prev, loading: true, error: null }));
        const [pois, tours] = await Promise.all([poiApi.getAll(), tourApi.getAll()]);
        setStats({
          poiCount: Array.isArray(pois) ? pois.length : 0,
          tourCount: Array.isArray(tours) ? tours.length : 0,
          loading: false,
          error: null,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load dashboard stats';
        setStats((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));
      }
    }

    fetchStats();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Chào mừng trở lại, Admin!</h1>
          <p>Quản lý các điểm yêu thích và hành trình khám phá của bạn</p>
        </div>
        <LogoutButton />
      </header>

      {stats.error ? (
        <div style={{ color: '#d32f2f', padding: '1rem', backgroundColor: '#ffebee', borderRadius: 4, marginBottom: '2rem' }}>
          Lỗi: {stats.error}
        </div>
      ) : null}

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Thống kê hệ thống</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <StatCard
            label="Tổng Điểm Yêu Thích"
            value={stats.poiCount}
            icon="📍"
            loading={stats.loading}
          />
          <StatCard label="Tổng Hành Trình" value={stats.tourCount} icon="🗺️" loading={stats.loading} />
        </div>
      </section>

      <nav style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <Link
          to="/pois"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#1976d2',
            color: 'white',
            borderRadius: 4,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          Quản lý POIs
        </Link>
        <Link
          to="/tours"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#388e3c',
            color: 'white',
            borderRadius: 4,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          Quản lý Tours
        </Link>
      </nav>
    </div>
  );
};

function StatCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: number;
  icon: string;
  loading: boolean;
}) {
  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
      <p style={{ color: '#666', marginBottom: '0.5rem' }}>{label}</p>
      <h3 style={{ margin: 0, fontSize: '2rem' }}>{loading ? '...' : value}</h3>
    </div>
  );
}
