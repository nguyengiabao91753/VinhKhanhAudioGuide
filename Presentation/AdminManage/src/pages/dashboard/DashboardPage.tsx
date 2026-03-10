import { Link } from 'react-router-dom';
import { LogoutButton } from '@/features/auth/ui/LogoutButton';

export const DashboardPage = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Welcome to the Admin Dashboard. Use the links below to manage the system.</p>
        </div>
        <LogoutButton />
      </header>

      <nav style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <Link to="/pois">POIs</Link>
        <Link to="/tours">Tours</Link>
      </nav>

      <section style={{ marginTop: 32 }}>
        <p>Choose a section to start managing Points of Interest or Tours.</p>
      </section>
    </div>
  );
};
