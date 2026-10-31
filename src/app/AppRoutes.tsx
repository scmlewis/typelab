import { lazy } from 'react';
import { Route, Routes } from 'react-router';

import { AppLayout } from '@/app/AppLayout';
import { HomePage } from '@/app/pages/HomePage';
import { NotFoundPage } from '@/app/pages/NotFoundPage';

const AboutPage = lazy(() =>
  import('@/app/pages/AboutPage').then((module) => ({ default: module.AboutPage })),
);
const HistoryPage = lazy(() =>
  import('@/app/pages/HistoryPage').then((module) => ({ default: module.HistoryPage })),
);
const ResultDetailPage = lazy(() =>
  import('@/app/pages/ResultDetailPage').then((module) => ({ default: module.ResultDetailPage })),
);
const SettingsPage = lazy(() =>
  import('@/app/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })),
);
const SharedResultPage = lazy(() =>
  import('@/app/pages/SharedResultPage').then((module) => ({ default: module.SharedResultPage })),
);

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="results/:id" element={<ResultDetailPage />} />
        <Route path="shared" element={<SharedResultPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
