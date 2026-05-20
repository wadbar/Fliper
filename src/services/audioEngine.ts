import { Howl } from 'howler';

/**
 * V9 INDUSTRIAL AUDIO ENGINE
 * Procedural & Asset-based UI feedback system.
 */
class AudioEngine {
  private sounds: Record<string, Howl> = {};
  private muted: boolean = false;
  private volume: number = 0.5;

  constructor() {
    // Standard UI Palette
    this.sounds = {
      boot: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'], volume: 0.4 }),
      click: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'], volume: 0.3 }),
      hover: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3'], volume: 0.1 }),
      error: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3'], volume: 0.3 }),
      success: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3'], volume: 0.4 }),
      launch: new Howl({ src: ['https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3'], volume: 0.5 }),
    };
  }

  play(effect: keyof typeof this.sounds) {
    if (this.muted) return;
    this.sounds[effect]?.play();
  }

  setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    Object.values(this.sounds).forEach(s => s.volume(this.volume));
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  getVolume() { return this.volume; }
  isMuted() { return this.muted; }
}

export const audioEngine = new AudioEngine();
