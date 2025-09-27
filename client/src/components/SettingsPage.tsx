import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { soundService, SoundSettings, SoundType } from '../services/soundService'

export function SettingsPage() {
  const [settings, setSettings] = useState<SoundSettings>({
    soundsEnabled: true,
    eventSounds: {},
    eventEnabled: {}
  })

  // Load settings from sound service on mount
  useEffect(() => {
    const currentSettings = soundService.getSettings()
    setSettings(currentSettings)
  }, [])

  const handleMasterToggle = (enabled: boolean) => {
    soundService.setEnabled(enabled)
    setSettings(prev => ({ ...prev, soundsEnabled: enabled }))
  }

  const handleEventSoundChange = (eventType: string, soundType: SoundType) => {
    soundService.setEventSound(eventType, soundType)
    setSettings(prev => ({
      ...prev,
      eventSounds: { ...prev.eventSounds, [eventType]: soundType }
    }))
    
    // Auto-play the selected sound
    soundService.playSound(soundType)
  }

  const handleEventEnabledChange = (eventType: string, enabled: boolean) => {
    soundService.setEventEnabled(eventType, enabled)
    setSettings(prev => ({
      ...prev,
      eventEnabled: { ...prev.eventEnabled, [eventType]: enabled }
    }))
  }

  const testSound = (soundType: SoundType) => {
    soundService.playSound(soundType)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="text-gray-600 hover:text-gray-900 transition-colors"
                title="Back to Chat"
              >
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            <p className="text-sm text-gray-600 mt-1">Configure sound notifications for different events</p>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Master Sound Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Enable Sounds</h3>
                <p className="text-sm text-gray-600">Master toggle for all notification sounds</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.soundsEnabled}
                  onChange={(e) => handleMasterToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Event Sound Settings</h3>
              <p className="text-sm text-gray-600 mb-6">Choose what sound plays for each event type</p>
              
              {/* Event Sound Settings */}
              <div className="space-y-4">
                {soundService.getAvailableEventTypes().map((eventType) => (
                  <div key={eventType.value} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">
                          {eventType.value === 'dm' && '💬'}
                          {eventType.value === 'room_message' && '🏠'}
                          {eventType.value === 'room_created' && '➕'}
                          {eventType.value === 'user_joined' && '👋'}
                          {eventType.value === 'user_left' && '👋'}
                          {eventType.value === 'room_joined' && '🎉'}
                          {eventType.value === 'room_left' && '👋'}
                          {eventType.value === 'system' && '🔔'}
                          {eventType.value === 'error' && '⚠️'}
                        </span>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{eventType.label}</h4>
                          <p className="text-sm text-gray-600">{eventType.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.eventEnabled[eventType.value] || false}
                          onChange={(e) => handleEventEnabledChange(eventType.value, e.target.checked)}
                          disabled={!settings.soundsEnabled}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                      </label>
                      <select
                        value={settings.eventSounds[eventType.value] || 'chime'}
                        onChange={(e) => handleEventSoundChange(eventType.value, e.target.value as SoundType)}
                        disabled={!settings.soundsEnabled || !(settings.eventEnabled[eventType.value] || false)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {soundService.getAvailableSoundTypes().map((sound) => (
                          <option key={sound.value} value={sound.value}>
                            {sound.label}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => testSound(settings.eventSounds[eventType.value] || 'chime')}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!settings.soundsEnabled || !(settings.eventEnabled[eventType.value] || false)}
                      >
                        Test
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
