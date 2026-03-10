import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const TourListPage = lazy(() => import('../pages/TourListPage'));
const TourDetailPage = lazy(() => import('../pages/TourDetailPage'));
const TourActivePage = lazy(() => import('../pages/TourActivePage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<TourListPage />} />
          <Route path="/tour/:tourId" element={<TourDetailPage />} />
          <Route path="/tour/:tourId/active" element={<TourActivePage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
