'use client';

import Image from 'next/image';
import { CollapsibleCard } from './CollapsibleCard';
import { REFERRAL_MAX_COUNT } from '@/lib/referral-config';

interface ReferralProgressProps {
  referralCount: number;
  reputationPoints: number;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
}

export function ReferralProgress({ referralCount, reputationPoints, defaultCollapsed = false, collapsible = false }: ReferralProgressProps) {
  const progress = Math.min((referralCount / REFERRAL_MAX_COUNT) * 100, 100);

  return (
    <div className="rounded-2xl bg-white/5 p-4 md:p-6 backdrop-blur-md border-2 border-purple-300/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
      <CollapsibleCard
        defaultCollapsed={defaultCollapsed}
        collapsible={collapsible}
        title={
          <h2 className="text-base md:text-lg font-semibold text-white whitespace-nowrap">Fill the roster</h2>
        }
      >
        <p className="text-sm text-neutral-800 mb-4">
          Unlock Day One status. Bonus rep secured
        </p>

        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-neutral-700">
            <span className="text-amber-500 font-semibold">{referralCount}/{REFERRAL_MAX_COUNT}</span> referrals
          </span>
          <span className="text-neutral-700/60 font-medium">
            {REFERRAL_MAX_COUNT - referralCount} more to go
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/20 mb-4 md:mb-6">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-500/80 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Stats Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 md:px-4 py-2.5 md:py-3">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                referralCount >= REFERRAL_MAX_COUNT ? 'bg-purple-300' : 'bg-amber-500'
              }`} />
              <span className="text-xs md:text-sm text-neutral-700">Early Access</span>
            </div>
            <div className={`text-sm md:text-base font-bold ${
              referralCount >= REFERRAL_MAX_COUNT ? 'text-purple-300' : 'text-amber-500'
            }`}>
              {referralCount >= REFERRAL_MAX_COUNT ? 'Access Granted' : 'On Waitlist'}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 md:px-4 py-2.5 md:py-3">
            <div className="flex items-center gap-2">
              <Image
                src="/images/icons/zenko-rp.svg"
                alt="Reputation"
                width={20}
                height={20}
                className="h-4 w-4 md:h-5 md:w-5"
                style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(85%) saturate(1574%) hue-rotate(359deg) brightness(101%) contrast(98%)' }}
              />
              <span className="text-xs md:text-sm text-neutral-700">Reputation Points</span>
            </div>
            <div className="text-base md:text-xl font-bold text-amber-500">{reputationPoints} XP</div>
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}
