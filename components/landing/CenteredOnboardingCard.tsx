'use client';

import { StepperOnboarding } from './StepperOnboarding';

export function CenteredOnboardingCard() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl bg-white/[0.07] p-4 md:p-8 backdrop-blur-md border-2 border-purple-300/30 shadow-[0_8px_32px_0_rgba(127,86,217,0.15)]">
      <StepperOnboarding />
    </div>
  );
}
