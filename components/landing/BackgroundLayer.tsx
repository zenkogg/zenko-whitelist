'use client';

import { useState } from 'react';
import Grainient from '@/components/Grainient';
import { GRAINIENT_PRESETS } from '@/components/Grainient/presets';
import { PresetSwitcher } from '@/components/Grainient/PresetSwitcher';

export function BackgroundLayer() {
  const [currentPreset, setCurrentPreset] = useState('current');
  const preset = GRAINIENT_PRESETS[currentPreset as keyof typeof GRAINIENT_PRESETS];

  return (
    <>
      <div className="absolute inset-0 z-0">
        <Grainient {...preset} />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 z-[1] bg-black/30 pointer-events-none" />

      {/* Preset Switcher (only in development) */}
      <PresetSwitcher currentPreset={currentPreset} onPresetChange={setCurrentPreset} />
    </>
  );
}
