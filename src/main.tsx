import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Unregister stale service workers in AI Studio dev preview so dev server never hangs
if ('serviceWorker' in navigator) {
  if (
    window.location.hostname.startsWith('ais-dev-') ||
    window.location.hostname === 'localhost'
  ) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
