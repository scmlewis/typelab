import { BrowserRouter } from 'react-router';

import { AppRoutes } from '@/app/AppRoutes';
import { SettingsProvider } from '@/features/settings/SettingsProvider';

export function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <AppRoutes />
      </SettingsProvider>
    </BrowserRouter>
  );
}
