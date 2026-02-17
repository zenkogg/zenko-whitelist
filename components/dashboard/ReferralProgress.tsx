'use client';

import Image from 'next/image';

interface ReferralProgressProps {
  referralCount: number;
  reputationPoints: number;
}

export function ReferralProgress({ referralCount, reputationPoints }: ReferralProgressProps) {
  const progress = Math.min((referralCount / 50) * 100, 100);

  return (
    <div className="lg:col-span-6 rounded-2xl bg-white/5 p-6 backdrop-blur-md border-2 border-purple-300/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
      <h2 className="text-lg font-semibold text-white mb-2">Referral progress</h2>
      <p className="text-sm text-neutral-800 mb-4">
        Refer 50 friends to secure your founding spot and bonus reputation points.
      </p>

      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-neutral-700">
          <span className="text-amber-500 font-semibold">{referralCount}/50</span> referrals
        </span>
        <span className="text-neutral-700/60 font-medium">
          {50 - referralCount} more to go
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-white/20 mb-6">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-500/80 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stats Badges */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${
              referralCount >= 50 ? 'bg-purple-300' : 'bg-amber-500'
            }`} />
            <span className="text-sm text-neutral-700">Early Access</span>
          </div>
          <div className={`text-lg font-bold ${
            referralCount >= 50 ? 'text-purple-300' : 'text-amber-500'
          }`}>
            {referralCount >= 50 ? 'Access Granted' : 'On Waitlist'}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Image
              src="/images/icons/zenko-rp.svg"
              alt="Reputation"
              width={20}
              height={20}
              className="h-5 w-5"
              style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(85%) saturate(1574%) hue-rotate(359deg) brightness(101%) contrast(98%)' }}
            />
            <span className="text-sm text-neutral-700">Reputation Points</span>
          </div>
          <div className="text-2xl font-bold text-amber-500">{reputationPoints} XP</div>
        </div>
      </div>
    </div>
  );
}
