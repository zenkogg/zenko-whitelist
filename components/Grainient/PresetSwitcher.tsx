'use client';

import { useState } from 'react';

interface PresetSwitcherProps {
  currentPreset: string;
  onPresetChange: (preset: string) => void;
}

export function PresetSwitcher({ currentPreset, onPresetChange }: PresetSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    { id: 'current', name: 'Default', description: 'Deep purple gradient' },
    { id: 'midnight', name: 'Midnight', description: 'Near-black, faint purple' },
    { id: 'amethyst', name: 'Amethyst', description: 'Richer purple tones' },
    { id: 'ember', name: 'Ember', description: 'Dark with warm accent' },
    { id: 'abyss', name: 'Abyss', description: 'Almost fully black' },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen && (
        <div className="mb-3 rounded-xl border border-white/20 bg-black/80 backdrop-blur-xl p-3 shadow-2xl">
          <div className="mb-2 text-xs font-semibold text-white/60 uppercase tracking-wider px-2">
            Background Preset
          </div>
          <div className="space-y-1">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  onPresetChange(preset.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                  currentPreset === preset.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/5 text-white/80 hover:bg-white/10'
                }`}
              >
                <div className="font-medium text-sm">{preset.name}</div>
                <div className="text-xs text-white/60">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full border border-white/20 bg-black/80 backdrop-blur-xl px-4 py-3 text-sm font-medium text-white shadow-2xl transition-all hover:bg-black/90"
        title="Switch background preset"
      >
        <span>🎨</span>
        <span className="hidden sm:inline">Preset</span>
      </button>
    </div>
  );
}
