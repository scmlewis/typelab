import { BrowserRouter } from 'react-router';

import { AppRoutes } from '@/app/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
