import React, { useState, useEffect } from 'react';
import { auth, getUserSettings, updateUserSettings } from '../services/firebase';
import { CogIcon } from './icons/Icons';
import type { ProgrammingLanguage, Difficulty } from '../types';

interface UserSettings {
  level: Difficulty;
  languages: ProgrammingLanguage[];
  topics: string[];
  notifications: boolean;
  darkMode: boolean;
  autoSave: boolean;
}

const AVAILABLE_LANGUAGES: ProgrammingLanguage[] = ['JavaScript', 'Python', 'Go', 'Java', 'TypeScript', 'C++', 'C#', 'Rust'];
const AVAILABLE_DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const AVAILABLE_TOPICS = ['Algorithms', 'Data Structures', 'Web Development', 'System Design', 'Database', 'Machine Learning', 'DevOps', 'Security'];

export const SettingsPage: React.FC<{ onSettingsChange?: () => void }> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<UserSettings>({
    level: 'Intermediate',
    languages: ['JavaScript'],
    topics: ['Algorithms'],
    notifications: true,
    darkMode: true,
    autoSave: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    setError(null);
    try {
      const userSettings = await getUserSettings(auth.currentUser.uid);
      if (userSettings) {
        setSettings({
          level: userSettings.level || 'Intermediate',
          languages: userSettings.languages || ['JavaScript'],
          topics: userSettings.topics || ['Algorithms'],
          notifications: userSettings.notifications ?? true,
          darkMode: userSettings.darkMode ?? true,
          autoSave: userSettings.autoSave ?? true
        });
      }
    } catch (e: any) {
      console.error('Failed to load settings:', e);
      setError(e.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!auth.currentUser) return;
    
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await updateUserSettings(auth.currentUser.uid, settings);
      setSuccessMessage('Settings saved successfully!');
      onSettingsChange?.();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e: any) {
      console.error('Failed to save settings:', e);
      setError(e.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageToggle = (language: ProgrammingLanguage) => {
    setSettings(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }));
  };

  const handleTopicToggle = (topic: string) => {
    setSettings(prev => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic]
    }));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-400 border-dashed rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-black page-container">
      <div className="p-4 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <CogIcon className="w-8 h-8 text-sky-400" />
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
            <p className="text-green-400">{successMessage}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Difficulty Level */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Difficulty Level</h3>
            <p className="text-gray-400 text-sm mb-4">Choose your preferred challenge difficulty</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {AVAILABLE_DIFFICULTIES.map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => setSettings(prev => ({ ...prev, level: difficulty }))}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    settings.level === difficulty
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {difficulty}
                </button>
              ))}
            </div>
          </div>

          {/* Programming Languages */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Programming Languages</h3>
            <p className="text-slate-400 text-sm mb-4">Select languages you want to practice (at least one required)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {AVAILABLE_LANGUAGES.map((language) => (
                <button
                  key={language}
                  onClick={() => handleLanguageToggle(language)}
                  disabled={settings.languages.length === 1 && settings.languages.includes(language)}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    settings.languages.includes(language)
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  } ${
                    settings.languages.length === 1 && settings.languages.includes(language)
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  {language}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Selected: {settings.languages.join(', ')}
            </p>
          </div>

          {/* Topics */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Topics of Interest</h3>
            <p className="text-slate-400 text-sm mb-4">Choose topics you want to focus on</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {AVAILABLE_TOPICS.map((topic) => (
                <button
                  key={topic}
                  onClick={() => handleTopicToggle(topic)}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                    settings.topics.includes(topic)
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Selected: {settings.topics.length > 0 ? settings.topics.join(', ') : 'None'}
            </p>
          </div>

          {/* App Preferences */}
          <div className="bg-slate-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">App Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Notifications</p>
                  <p className="text-slate-400 text-sm">Receive notifications about new challenges</p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, notifications: !prev.notifications }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.notifications ? 'bg-sky-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Auto-save Progress</p>
                  <p className="text-slate-400 text-sm">Automatically save your code as you type</p>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, autoSave: !prev.autoSave }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.autoSave ? 'bg-sky-500' : 'bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.autoSave ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-3 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-600/50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};