import { Link } from 'react-router-dom';
import { LogoutButton } from '@/features/auth/ui/LogoutButton';

export const PoisPage = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Points of Interest</h1>
          <p>This page is protected and requires admin login.</p>
        </div>
        <LogoutButton />
      </header>

      <nav style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/tours">Tours</Link>
      </nav>

      <section style={{ marginTop: 32 }}>
        <p>POI management UI will go here.</p>
      </section>
    </div>
  );
};
