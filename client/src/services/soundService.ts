// Sound service for playing notification sounds
export type SoundType = 'chime' | 'bell' | 'ascending' | 'welcome' | 'farewell' | 'celebration' | 'departure' | 'notification' | 'alert'

export interface SoundSettings {
  soundsEnabled: boolean
  eventSounds: {
    [key: string]: SoundType
  }
  eventEnabled: {
    [key: string]: boolean
  }
}

export class SoundService {
  private audioContext: AudioContext | null = null
  private isEnabled: boolean = true
  private settings: SoundSettings = {
    soundsEnabled: true,
    eventSounds: {
      // Default sound types for each event
      'dm': 'chime',
      'room_message': 'bell', 
      'room_created': 'ascending',
      'user_joined': 'welcome',
      'user_left': 'farewell',
      'room_joined': 'celebration',
      'room_left': 'departure',
      'system': 'notification',
      'error': 'alert'
    },
    eventEnabled: {
      // Default enabled state - only basic events enabled
      'dm': true,
      'room_message': true, 
      'room_created': true,
      'user_joined': false,
      'user_left': false,
      'room_joined': false,
      'room_left': false,
      'system': false,
      'error': true
    }
  }

  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      document.addEventListener('click', this.initAudioContext.bind(this), { once: true })
      
      // Load settings from localStorage
      this.loadSettings()
    }
  }

  private loadSettings() {
    const savedSettings = localStorage.getItem('clack-notification-settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        this.isEnabled = parsed.soundsEnabled !== false
        this.settings = {
          soundsEnabled: parsed.soundsEnabled !== false,
          eventSounds: { ...this.settings.eventSounds, ...parsed.eventSounds },
          eventEnabled: { ...this.settings.eventEnabled, ...parsed.eventEnabled }
        }
      } catch (error) {
        console.error('Failed to parse saved settings:', error)
      }
    }
  }

  private initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  // Play a notification sound for a specific event
  playNotification(eventType: string) {
    if (!this.isEnabled || !this.audioContext) return

    // Check if this event is enabled
    if (!this.settings.eventEnabled[eventType]) return

    // Get the sound type for this event
    const soundType = this.settings.eventSounds[eventType]
    if (!soundType) return

    this.playSound(soundType)
  }

  // Play a specific sound type
  playSound(soundType: SoundType) {
    if (!this.isEnabled || !this.audioContext || soundType === 'none') return

    const soundConfig = this.getSoundConfig(soundType)
    if (!soundConfig) return

    const { frequencies, duration, pattern } = soundConfig

    if (pattern === 'chord') {
      // Play multiple frequencies simultaneously
      frequencies.forEach((freq, index) => {
        const osc = this.audioContext!.createOscillator()
        const gain = this.audioContext!.createGain()
        
        gain.connect(this.audioContext!.destination)
        osc.connect(gain)
        
        osc.frequency.setValueAtTime(freq, this.audioContext!.currentTime)
        gain.gain.setValueAtTime(0.2, this.audioContext!.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + duration)
        
        osc.start(this.audioContext!.currentTime)
        osc.stop(this.audioContext!.currentTime + duration)
      })
    } else if (pattern === 'sequence') {
      // Play frequencies in sequence
      frequencies.forEach((freq, index) => {
        const osc = this.audioContext!.createOscillator()
        const gain = this.audioContext!.createGain()
        
        gain.connect(this.audioContext!.destination)
        osc.connect(gain)
        
        osc.frequency.setValueAtTime(freq, this.audioContext!.currentTime + index * 0.1)
        gain.gain.setValueAtTime(0.2, this.audioContext!.currentTime + index * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext!.currentTime + index * 0.1 + duration)
        
        osc.start(this.audioContext!.currentTime + index * 0.1)
        osc.stop(this.audioContext!.currentTime + index * 0.1 + duration)
      })
    } else {
      // Single frequency
      const osc = this.audioContext.createOscillator()
      const gain = this.audioContext.createGain()
      
      gain.connect(this.audioContext.destination)
      osc.connect(gain)
      
      osc.frequency.setValueAtTime(frequencies[0], this.audioContext.currentTime)
      gain.gain.setValueAtTime(0.3, this.audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration)
      
      osc.start(this.audioContext.currentTime)
      osc.stop(this.audioContext.currentTime + duration)
    }
  }

  private getSoundConfig(soundType: SoundType) {
    const configs = {
      chime: { frequencies: [800, 1000], duration: 0.2, pattern: 'chord' },
      bell: { frequencies: [600, 800], duration: 0.2, pattern: 'chord' },
      ascending: { frequencies: [400, 600, 800], duration: 0.2, pattern: 'sequence' },
      welcome: { frequencies: [500, 700], duration: 0.15, pattern: 'chord' },
      farewell: { frequencies: [300, 500], duration: 0.15, pattern: 'sequence' },
      celebration: { frequencies: [600, 800, 1000], duration: 0.2, pattern: 'chord' },
      departure: { frequencies: [400, 300], duration: 0.15, pattern: 'sequence' },
      notification: { frequencies: [440], duration: 0.1, pattern: 'single' },
      alert: { frequencies: [200, 150], duration: 0.3, pattern: 'sequence' }
    }
    
    return configs[soundType]
  }

  // Enable/disable sounds
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
    this.settings.soundsEnabled = enabled
    this.saveSettings()
  }

  isSoundEnabled(): boolean {
    return this.isEnabled
  }

  // Update event sound setting
  setEventSound(eventType: string, soundType: SoundType) {
    this.settings.eventSounds[eventType] = soundType
    this.saveSettings()
  }

  // Update event enabled state
  setEventEnabled(eventType: string, enabled: boolean) {
    this.settings.eventEnabled[eventType] = enabled
    this.saveSettings()
  }

  // Get enabled state for an event
  isEventEnabled(eventType: string): boolean {
    return this.settings.eventEnabled[eventType] || false
  }

  // Get current settings
  getSettings(): SoundSettings {
    return { ...this.settings }
  }

  // Get available sound types
  getAvailableSoundTypes(): { value: SoundType; label: string; description: string }[] {
    return [
      { value: 'chime', label: 'Chime', description: 'Bright, high-pitched chord' },
      { value: 'bell', label: 'Bell', description: 'Warm, medium-pitched chord' },
      { value: 'ascending', label: 'Ascending', description: 'Rising sequence of notes' },
      { value: 'welcome', label: 'Welcome', description: 'Friendly welcoming chord' },
      { value: 'farewell', label: 'Farewell', description: 'Gentle descending sequence' },
      { value: 'celebration', label: 'Celebration', description: 'Joyful, celebratory chord' },
      { value: 'departure', label: 'Departure', description: 'Melancholy descending tones' },
      { value: 'notification', label: 'Notification', description: 'Simple, clean tone' },
      { value: 'alert', label: 'Alert', description: 'Attention-grabbing low tones' }
    ]
  }

  // Get available event types
  getAvailableEventTypes(): { value: string; label: string; description: string }[] {
    return [
      { value: 'dm', label: 'Direct Messages', description: 'When you receive a direct message' },
      { value: 'room_message', label: 'Room Messages', description: 'When you receive a room message' },
      { value: 'room_created', label: 'Room Created', description: 'When someone creates a new room' },
      { value: 'user_joined', label: 'User Joined', description: 'When a new user joins the chat' },
      { value: 'user_left', label: 'User Left', description: 'When a user leaves the chat' },
      { value: 'room_joined', label: 'Room Joined', description: 'When you join a room' },
      { value: 'room_left', label: 'Room Left', description: 'When you leave a room' },
      { value: 'system', label: 'System Notifications', description: 'For system alerts and updates' },
      { value: 'error', label: 'Errors', description: 'For error messages and failures' }
    ]
  }

  private saveSettings() {
    localStorage.setItem('clack-notification-settings', JSON.stringify(this.settings))
  }
}

// Export singleton instance
export const soundService = new SoundService()
