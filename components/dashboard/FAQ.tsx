'use client';

import { CollapsibleCard } from './CollapsibleCard';

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
        <ul className="space-y-1 text-sm text-neutral-800">
          <li>• Share your referral code with friends (+10 points per referral)</li>
          <li>• Connect your X/Twitter account (+5 points)</li>
          <li>• Share on X/Twitter (+5 points per share)</li>
          <li>• Reach 50 referrals for priority beta access</li>
        </ul>
      </CollapsibleCard>
    </div>
  );
}
