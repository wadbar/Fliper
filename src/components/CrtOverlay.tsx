import React from 'react';
import { useSystemSettings } from '../hooks/useSystemSettings';

export const CrtOverlay: React.FC = () => {
  const { settings } = useSystemSettings();
  
  if (!settings.crtEnabled) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden mix-blend-overlay">
      {/* Scanlines */}
      <div 
        className="absolute inset-0 opacity-30" 
        style={{
          backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 4px, 3px 100%'
        }}
      />
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
};
