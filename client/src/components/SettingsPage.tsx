import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { soundService, SoundSettings, SoundType } from '../services/soundService'
import { themeService, ThemeColor } from '../services/themeService'

export function SettingsPage() {
  const [settings, setSettings] = useState<SoundSettings>({
    soundsEnabled: true,
    eventSounds: {},
    eventEnabled: {}
  })
  const [isDark, setIsDark] = useState<boolean>(true)
  const [themeColor, setThemeColor] = useState<ThemeColor>('blue')

  // Load settings from services on mount
  useEffect(() => {
    const currentSettings = soundService.getSettings()
    setSettings(currentSettings)
    setIsDark(themeService.isDark())
    setThemeColor(themeService.getColor())
  }, [])

  const handleMasterToggle = (enabled: boolean) => {
    soundService.setEnabled(enabled)
    setSettings(prev => ({ ...prev, soundsEnabled: enabled }))
  }

  const handleThemeToggle = (enabled: boolean) => {
    const mode = enabled ? 'dark' : 'light'
    themeService.setMode(mode)
    setIsDark(enabled)
  }

  const handleThemeColorChange = (color: ThemeColor) => {
    themeService.setColor(color)
    setThemeColor(color)
  }

  const handleEventSoundChange = (eventType: string, soundType: SoundType) => {
    soundService.setEventSound(eventType, soundType)
    setSettings(prev => ({
      ...prev,
      eventSounds: { ...prev.eventSounds, [eventType]: soundType }
    }))
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
      <div className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
            <p className="text-sm text-gray-600">Configure preferences</p>
          </div>
          <Link to="/" className="text-blue-600 hover:text-blue-700">Back</Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto my-6 bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-md font-semibold text-gray-900">Appearance</h3>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-900">Dark Mode</span>
                <p className="text-xs text-gray-600">Switch between dark and light mode</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDark}
                  onChange={(e) => handleThemeToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-900">Theme Color</span>
                <p className="text-xs text-gray-600">Choose your preferred color scheme</p>
              </div>
              <select
                value={themeColor}
                onChange={(e) => handleThemeColorChange(e.target.value as ThemeColor)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="blue">Blue</option>
                <option value="red">Red</option>
                <option value="green">Green</option>
                <option value="yellow">Yellow</option>
                <option value="purple">Purple</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto my-6 bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-md font-semibold text-gray-900">Notifications</h3>
          <p className="text-sm text-gray-600">Configure sound notifications for different events</p>
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
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Event Sounds</h4>
            <p className="text-sm text-gray-600 mb-4">Choose a sound for each event. Toggle to enable/disable.</p>

            {/* Example: DM sound setting */}
            {Object.entries(soundService.getAvailableEventTypes()).map(({ 0: idx, 1: evt }) => (
              <div key={evt.value} className="flex items-center justify-between py-2 border-b border-gray-200">
                <div className="flex-1">
                  <div className="text-sm text-gray-900">{evt.label}</div>
                  <div className="text-xs text-gray-600">{evt.description}</div>
                </div>
                <div className="flex items-center space-x-3">
                  <select
                    className="border rounded-lg p-2 bg-white text-gray-900"
                    value={settings.eventSounds[evt.value] || 'chime'}
                    onChange={(e) => handleEventSoundChange(evt.value, e.target.value as SoundType)}
                  >
                    {soundService.getAvailableSounds().map(sound => (
                      <option key={sound} value={sound}>{sound}</option>
                    ))}
                  </select>
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.eventEnabled[evt.value] ?? false}
                      onChange={(e) => handleEventEnabledChange(evt.value, e.target.checked)}
                    />
                    <span className="text-sm text-gray-900">Enabled</span>
                  </label>
                  <button onClick={() => testSound(settings.eventSounds[evt.value] || 'chime')}>Test</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
