import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './app/App';
import OnboardingPage, { type AppLanguage } from './pages/OnboardingPage';
import TourDetailPage from './pages/TourDetailPage';
import TourActivePage from './pages/TourActivePage';
import TourListPage from './pages/TourListPage';
import HomePage from './pages/HomePage';
import './index.css';
import './styles/global.css';

function Root() {
  const [lang, setLang] = useState<AppLanguage | null>(null);

  if (!lang) {
    return <OnboardingPage onComplete={setLang} />;
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/"          element={<App initialLanguage={lang} />} />
        <Route path="/home"      element={<HomePage />} />
        <Route path="/tours"     element={<TourListPage />} />
        <Route path="/tour/:id"  element={<TourDetailPage />} />
        <Route path="/tour/:id/active" element={<TourActivePage />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><Root /></StrictMode>
);