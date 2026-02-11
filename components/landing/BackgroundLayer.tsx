'use client';

import Grainient from '@/components/Grainient';
import { GRAINIENT_PRESETS } from '@/components/Grainient/presets';

export function BackgroundLayer() {
  const preset = GRAINIENT_PRESETS.tactical;

  return (
    <>
      {/* Background - Fixed to viewport to prevent stretching */}
      <div className="fixed inset-0 z-0">
        <Grainient {...preset} />
      </div>

      {/* Overlay - Fixed to viewport */}
      <div className="fixed inset-0 z-1 bg-black/30 pointer-events-none" />
    </>
  );
}
