'use client';

import { StepperOnboarding } from './StepperOnboarding';

export function CenteredOnboardingCard() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-white/5 p-8 backdrop-blur-md border-2 border-purple-300/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
      <StepperOnboarding />
    </div>
  );
}
