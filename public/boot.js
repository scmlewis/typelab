// Apply the saved theme and motion choice before the first paint, so the page
// never flashes the wrong colours or an unwanted animation. This lives in a
// separate file so the production build can ship a strict script-src policy.
(() => {
  try {
    const raw = localStorage.getItem('typelab.settings');
    const stored = raw ? JSON.parse(raw) : null;
    const appearance = stored?.settings?.appearance ?? {};
    const theme = appearance.theme ?? 'system';
    const dark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.documentElement.dataset.theme = dark ? 'dark' : 'light';

    const motion = appearance.motion ?? 'system';
    const reduced =
      motion === 'reduce' ||
      (motion === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    document.documentElement.dataset.motion = reduced ? 'reduce' : 'full';

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#141816' : '#f4efe4');
  } catch {
    // The app will recover unreadable settings after it loads.
  }
})();
