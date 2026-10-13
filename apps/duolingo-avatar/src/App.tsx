import { useEffect } from 'react';
import { legacyMarkup } from './legacy/legacyMarkup';

export function App() {
  useEffect(() => {
    let mounted = true;
    const header = document.querySelector('.app-header');
    if (header && !header.querySelector('.app-home-link')) {
      const homeLink = document.createElement('a');
      homeLink.className = 'app-home-link';
      homeLink.href = '../';
      homeLink.setAttribute('aria-label', 'Back to WishFlow Tools');
      homeLink.textContent = 'WishFlow Tools';
      header.prepend(homeLink);
    }
    import('./legacy/avatarExplorer').catch((error) => {
      if (!mounted) return;
      console.error('Avatar editor failed to initialize:', error);
      document.getElementById('loadingOverlay')?.classList.add('hidden');
    });
    return () => {
      mounted = false;
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: legacyMarkup }} />;
}
