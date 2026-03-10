import { Link } from 'react-router-dom';
import { LogoutButton } from '@/features/auth/ui/LogoutButton';

export const ToursPage = () => {
  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Tours</h1>
          <p>This page is protected and requires admin login.</p>
        </div>
        <LogoutButton />
      </header>

      <nav style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/pois">POIs</Link>
      </nav>

      <section style={{ marginTop: 32 }}>
        <p>Tour management UI will go here.</p>
      </section>
    </div>
  );
};
