'use client';

/**
 * The dashboard's referral card: progress toward the referral cap, the
 * player's Early Access status and their reputation points.
 */

import Image from 'next/image';
import { CollapsibleCard } from './CollapsibleCard';
import { REFERRAL_MAX_COUNT } from '@/lib/referral-config';
import { ZENKO_SITE_URL } from '@/lib/zenko-open';

interface ReferralProgressProps {
  referralCount: number;
  reputationPoints: number;
  status: string;
  waitlistStatus: 'open' | 'closed';
  /** True only once the main backend reports Zenko open; see lib/zenko-open. */
  zenkoOpen?: boolean;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
}

export function ReferralProgress({ referralCount, reputationPoints, status, waitlistStatus, zenkoOpen = false, defaultCollapsed = false, collapsible = false }: ReferralProgressProps) {
  const isApproved = status !== 'PENDING';
  // Once Zenko is open nobody is waiting to be picked, so the open line
  // replaces Not Selected as well as On Waitlist.
  const isOpenToAll = zenkoOpen && !isApproved;
  const isNotSelected = !isOpenToAll && waitlistStatus === 'closed' && status === 'PENDING';
  const isGreen = isApproved || isOpenToAll;
  const progress = Math.min((referralCount / REFERRAL_MAX_COUNT) * 100, 100);

  return (
    <div className="rounded-2xl bg-white/5 p-4 md:p-6 backdrop-blur-md border-2 border-purple-300/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
      <CollapsibleCard
        defaultCollapsed={defaultCollapsed}
        collapsible={collapsible}
        title={
          <h2 className="text-base md:text-lg font-semibold text-white whitespace-nowrap">Gain priority access</h2>
        }
      >
        <p className="text-sm text-neutral-800 mb-4">
          Refer friends to boost your rank. Each referral earns you +10 XP and moves you up the waitlist.
        </p>

        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-neutral-700">
            <span className="text-amber-500 font-semibold">{Math.min(referralCount, REFERRAL_MAX_COUNT)}/{REFERRAL_MAX_COUNT}</span> referral boost
          </span>
          <span className="text-neutral-700/60 font-medium">
            {referralCount} total referrals
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-white/20 mb-4 md:mb-6">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-500/80 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 md:px-4 py-2.5 md:py-3">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
                isGreen ? 'bg-success' : isNotSelected ? 'bg-error' : 'bg-amber-500'
              }`} />
              <span className="text-xs md:text-sm text-neutral-700">Early Access</span>
            </div>
            <div className={`text-sm md:text-base font-bold ${
              isGreen ? 'text-success' : isNotSelected ? 'text-error' : 'text-amber-500'
            }`}>
              {isApproved ? (
                'Access Granted'
              ) : isOpenToAll ? (
                <>
                  Open, sign up at{' '}
                  <a
                    href={ZENKO_SITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-success/60 underline-offset-2 hover:decoration-success"
                  >
                    zenko.gg
                  </a>
                </>
              ) : isNotSelected ? (
                'Not Selected'
              ) : (
                'On Waitlist'
              )}
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
