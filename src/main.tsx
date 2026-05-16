import {StrictMode, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './contexts/LanguageContext';
import { KernelProvider } from './contexts/KernelContext';

function KioskShell() {
  useEffect(() => {
    // Disable right click for kiosk integrity
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    // Filter dangerous keyboard interrupts in production
    const handleKeys = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'u')) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeys);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeys);
    };
  }, []);

  return (
    <KernelProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </KernelProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KioskShell />
  </StrictMode>,
);
