import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthProvider';

export const LoginForm = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    setLoading(true);
    const isValid = await login({ username, password });
    setLoading(false);

    if (isValid) {
      navigate('/dashboard', { replace: true });
      return;
    }

    setError('Invalid credentials');
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 320, margin: '0 auto' }}>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="username" style={{ display: 'block', marginBottom: 4 }}>
          Username
        </label>
        <input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="admin"
          required
          autoComplete="username"
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label htmlFor="password" style={{ display: 'block', marginBottom: 4 }}>
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          style={{ width: '100%', padding: 8, boxSizing: 'border-box' }}
        />
      </div>

      {error && (
        <div style={{ color: 'red', marginBottom: 12 }} role="alert">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: 10,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Logging in…' : 'Login'}
      </button>
    </form>
  );
};
