import React, { Component, ErrorInfo, ReactNode, StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './contexts/LanguageContext';
import { KernelProvider } from './contexts/KernelContext';
import { ThemeProvider } from './contexts/ThemeContext';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorInfo: string | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorInfo: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[CORE FAULT] Uncaught React Error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-black text-white flex flex-col items-center justify-center font-mono p-8">
            <h1 className="text-red-500 font-bold text-4xl mb-4 uppercase tracking-widest">[ KERNEL PANIC ]</h1>
            <p className="text-zinc-400 mb-8 max-w-lg text-center">FliperOS UI crashed due to an unhandled exception. The daemon has logged the fault.</p>
            <div className="bg-red-900/20 border border-red-500/20 p-6 rounded w-full max-w-2xl text-left overflow-auto">
                <code className="text-red-400 text-sm whitespace-pre-wrap">{this.state.errorInfo}</code>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-8 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest border border-red-400 rounded transition-colors"
            >
               Force Reboot
            </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </LanguageProvider>
    </KernelProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GlobalErrorBoundary>
      <KioskShell />
    </GlobalErrorBoundary>
  </StrictMode>
);
