import { Route, Routes } from 'react-router';

import { AppLayout } from '@/app/AppLayout';
import { HistoryPage } from '@/app/pages/HistoryPage';
import { HomePage } from '@/app/pages/HomePage';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { ResultDetailPage } from '@/app/pages/ResultDetailPage';
import { SettingsPage } from '@/app/pages/SettingsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="results/:id" element={<ResultDetailPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
