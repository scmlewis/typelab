import { BrowserRouter } from 'react-router';

import { AppRoutes } from '@/app/AppRoutes';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import { useMotion } from '@/features/settings/motion';
import { useSettings } from '@/features/settings/settingsContext';
import { useTheme } from '@/features/settings/theme';

function ThemedRoutes() {
  const { settings } = useSettings();
  useTheme(settings.appearance.theme);
  useMotion(settings.appearance.motion);

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
