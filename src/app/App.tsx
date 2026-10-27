import { BrowserRouter } from 'react-router';

import { AppRoutes } from '@/app/AppRoutes';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import { useSettings } from '@/features/settings/settingsContext';
import { useTheme } from '@/features/settings/theme';

function ThemedRoutes() {
  const { settings } = useSettings();
  useTheme(settings.appearance.theme);

  return <AppRoutes />;
}

export function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <ThemedRoutes />
      </SettingsProvider>
    </BrowserRouter>
  );
}
