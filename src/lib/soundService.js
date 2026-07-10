// Sound service for playing notification sounds
class SoundService {
  constructor() {
    this.audioContext = null;
    this.sounds = {};
    this.enabled = true;
    this.volume = 0.5;
    this.isBrowser = typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined';
  }

  // Initialize AudioContext (must be called after user interaction)
  init() {
    if (!this.isBrowser) return;
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }
  }

  // Enable/disable sounds
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  // Set volume (0.0 to 1.0)
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  // Play a notification sound using Web Audio API
  playNotification(type = 'default') {
    if (!this.enabled || !this.isBrowser) return;
    
    this.init();
    
    if (!this.audioContext || this.audioContext.state === 'suspended') {
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Different sound patterns based on type
      switch (type) {
        case 'alarm':
          // Urgent alarm sound - rapid beeps
          this.playAlarmPattern(oscillator, gainNode);
          break;
        case 'reminder':
          // Gentle reminder sound - soft chime
          this.playReminderPattern(oscillator, gainNode);
          break;
        case 'success':
          // Success sound - pleasant ascending tone
          this.playSuccessPattern(oscillator, gainNode);
          break;
        case 'error':
          // Error sound - descending tone
          this.playErrorPattern(oscillator, gainNode);
          break;
        default:
          // Default notification - simple beep
          this.playDefaultPattern(oscillator, gainNode);
      }
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  }

  playAlarmPattern(oscillator, gainNode) {
    const now = this.audioContext.currentTime;
    
    // Rapid beeps pattern
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.setValueAtTime(880, now + 0.1);
    oscillator.frequency.setValueAtTime(880, now + 0.2);
    oscillator.frequency.setValueAtTime(880, now + 0.3);
    
    gainNode.gain.setValueAtTime(this.volume * 0.3, now);
    gainNode.gain.setValueAtTime(0, now + 0.1);
    gainNode.gain.setValueAtTime(this.volume * 0.3, now + 0.1);
    gainNode.gain.setValueAtTime(0, now + 0.2);
    gainNode.gain.setValueAtTime(this.volume * 0.3, now + 0.2);
    gainNode.gain.setValueAtTime(0, now + 0.3);
    gainNode.gain.setValueAtTime(this.volume * 0.3, now + 0.3);
    gainNode.gain.setValueAtTime(0, now + 0.4);
    
    oscillator.start(now);
    oscillator.stop(now + 0.4);
  }

  playReminderPattern(oscillator, gainNode) {
    const now = this.audioContext.currentTime;
    
    // Gentle chime
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, now); // C5
    oscillator.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
    oscillator.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    oscillator.start(now);
    oscillator.stop(now + 0.4);
  }

  playSuccessPattern(oscillator, gainNode) {
    const now = this.audioContext.currentTime;
    
    // Pleasant ascending tone
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, now); // A4
    oscillator.frequency.exponentialRampToValueAtTime(554.37, now + 0.1); // C#5
    oscillator.frequency.exponentialRampToValueAtTime(659.25, now + 0.2); // E5
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }

  playErrorPattern(oscillator, gainNode) {
    const now = this.audioContext.currentTime;
    
    // Descending tone
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(440, now);
    oscillator.frequency.exponentialRampToValueAtTime(220, now + 0.2);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    oscillator.start(now);
    oscillator.stop(now + 0.25);
  }

  playDefaultPattern(oscillator, gainNode) {
    const now = this.audioContext.currentTime;
    
    // Simple beep
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, now);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }

  // Check if sound is enabled
  isEnabled() {
    return this.enabled;
  }

  // Get current volume
  getVolume() {
    return this.volume;
  }
}

// Export singleton instance
export const soundService = new SoundService();
