'use client';

import { CollapsibleCard } from './CollapsibleCard';
import { REFERRAL_MAX_COUNT } from '@/lib/referral-config';

export function FAQ() {
  return (
    <div className="my-8 lg:col-span-6 rounded-2xl bg-white/5 p-4 md:p-6 backdrop-blur-md border-2 border-purple-300/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
      <CollapsibleCard
        defaultCollapsed={true}
        collapsible={true}
        title={
          <h3 className="text-base md:text-lg font-semibold text-white">How to earn reputation</h3>
        }
      >
        <ul className="space-y-2 text-sm text-neutral-800">
          <li>• <strong className="text-neutral-600">Invite friends</strong> — share your referral code and earn +10 XP every time someone signs up with it</li>
          <li>• <strong className="text-neutral-600">Use a friend&apos;s code</strong> — entering someone else&apos;s referral code earns you +10 XP too</li>
          <li>• <strong className="text-neutral-600">Hit {REFERRAL_MAX_COUNT} referrals</strong> — reach the goal to unlock priority access to the beta</li>
        </ul>
      </CollapsibleCard>
    </div>
  );
}
