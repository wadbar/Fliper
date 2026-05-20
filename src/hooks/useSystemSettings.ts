import { useState, useEffect } from 'react';
import { audioEngine } from '../services/audioEngine';

/**
 * V9 SYSTEM SETTINGS HOOK
 * Handles persistence of OS-level preferences.
 */
export function useSystemSettings() {
  const [settings, setSettings] = useState({
    volume: 0.5,
    brightness: 1,
    crtEnabled: true,
    performanceMode: false,
    language: 'en',
    theme: 'dark'
  });

  useEffect(() => {
    const saved = localStorage.getItem('fliper_os_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
        audioEngine.setVolume(parsed.volume ?? 0.5);
      } catch (e) {
        console.warn("Failed to load settings", e);
      }
    }
  }, []);

  const updateSetting = (key: keyof typeof settings, value: any) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('fliper_os_settings', JSON.stringify(next));
      
      if (key === 'volume') {
        audioEngine.setVolume(value);
      }
      
      return next;
    });
  };

  return { settings, updateSetting };
}
