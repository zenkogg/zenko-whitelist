'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { BoltIcon } from '@heroicons/react/24/outline';
import FuzzyText from '@/components/FuzzyText';

interface ReferrerInfo {
  displayName: string;
  avatarUrl: string | null;
  oauthProvider: string;
}

interface ApplyReferralCardProps {
  userId: string;
  usedReferralCode: string | null;
  currentReputationPoints: number;
  onReferralApplied: () => void;
  referrerInfo?: ReferrerInfo | null;
  initialReferralCode?: string | null;
}

export function ApplyReferralCard({
  userId,
  usedReferralCode,
  currentReputationPoints,
  onReferralApplied,
  referrerInfo,
  initialReferralCode,
}: ApplyReferralCardProps) {
  // Only use initialReferralCode if user hasn't already applied one
  const [referralCode, setReferralCode] = useState(!usedReferralCode && initialReferralCode ? initialReferralCode : '');
  const [isApplyingReferral, setIsApplyingReferral] = useState(false);
  const [referralError, setReferralError] = useState('');
  const [referralSuccess, setReferralSuccess] = useState('');
  const [shouldHighlight, setShouldHighlight] = useState(!!initialReferralCode && !usedReferralCode);

  // Clear highlight after animation
  useEffect(() => {
    if (shouldHighlight) {
      const timer = setTimeout(() => setShouldHighlight(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [shouldHighlight]);

  const handleApplyReferral = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setReferralError('');
      setReferralSuccess('');

      if (!referralCode.trim()) {
        setReferralError('Please enter a referral code');
        return;
      }

      // Extract code from URL if pasted
      let codeToSubmit = referralCode.trim();
      try {
        const url = new URL(codeToSubmit);
        const refParam = url.searchParams.get('ref');
        if (refParam) {
          codeToSubmit = refParam;
        }
      } catch {
        // Not a valid URL, use as-is
      }

      setIsApplyingReferral(true);

      try {
        const response = await fetch('/api/user/referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referralCode: codeToSubmit.toUpperCase(),
            userId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to apply referral code');
        }

        const { data } = await response.json();

        const pointsEarned = data.user.reputationPoints - currentReputationPoints;
        setReferralSuccess(
          `Referral code applied! You earned ${pointsEarned} reputation points.`
        );
        setReferralCode('');

        // Refresh user stats
        onReferralApplied();
      } catch (error: unknown) {
        console.error('Apply referral error:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to apply referral code';
        setReferralError(errorMessage);
      } finally {
        setIsApplyingReferral(false);
      }
    },
    [referralCode, userId, currentReputationPoints, onReferralApplied]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setReferralCode(e.target.value);
  }, []);

  return (
    <div className={`rounded-2xl bg-white/5 p-6 backdrop-blur-md border-2 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col h-full w-full transition-all duration-500 ${
      shouldHighlight
        ? 'border-amber-500/60 shadow-[0_0_40px_rgba(251,176,34,0.3),0_8px_32px_0_rgba(0,0,0,0.37)] animate-pulse'
        : 'border-purple-300/20'
    }`}>
      {usedReferralCode ? (
        /* Applied State - Matches ProfileCard style */
        <>
          <div className="mb-4 flex items-center gap-2">
            <Image
              src="/images/icons/zenko-rp.svg"
              alt="XP"
              width={20}
              height={20}
              className="h-5 w-5"
              style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(85%) saturate(1574%) hue-rotate(359deg) brightness(101%) contrast(98%)' }}
            />
            <h2 className="text-lg font-semibold text-white">Applied code</h2>
          </div>

          <div className="w-full rounded-xl border-2 border-dashed border-purple-300/20 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Applied Code */}
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-widest text-purple-400/50" style={{ fontFamily: 'var(--font-sora)' }}>
                  {usedReferralCode}
                </span>
              </div>

              {/* Right: Referrer Info */}
              <div className="flex items-center gap-1.5">
                {referrerInfo?.avatarUrl && (
                  <Image
                    src={referrerInfo.avatarUrl}
                    alt={referrerInfo.displayName}
                    width={16}
                    height={16}
                    className="h-4 w-4 rounded-full object-cover border border-white/10 opacity-50"
                  />
                )}
                <p className="text-sm text-neutral-700/70">
                  Referred by{' '}
                  <span className="text-purple-300/40">
                    {referrerInfo?.oauthProvider === 'twitch' ? '@' : ''}
                    {referrerInfo?.displayName || 'a friend'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Not Applied State - Show input form */
        <>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1">
              <Image
                src="/images/icons/zenko-rp.svg"
                alt="XP"
                width={20}
                height={20}
                className="h-5 w-5"
                style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(85%) saturate(1574%) hue-rotate(359deg) brightness(101%) contrast(98%)' }}
              />
              <h2 className="text-lg font-semibold text-white">
                Have a referral code?
              </h2>
              <div className="ml-auto flex items-center justify-end">
                <FuzzyText
                  fontSize={15}
                  fontFamily="'Press Start 2P'"
                  color="#FDB022"
                  baseIntensity={0.05}
                  fuzzRange={20}
                  enableHover={false}
                  glitchMode={true}
                  glitchInterval={2800}
                  glitchDuration={200}
                  className='-mr-8'
                >
                  +10 XP
                </FuzzyText>
              </div>
            </div>
          </div>

          <p className="mb-6 text-sm text-neutral-800">
            Use a referral code and earn 10 points
          </p>

          <form onSubmit={handleApplyReferral} className="flex-1 flex flex-col">
            <div className="relative">
              <input
                type="text"
                value={referralCode}
                onChange={handleInputChange}
                placeholder="Enter code or link"
                disabled={isApplyingReferral}
                className="w-full rounded-xl bg-black/40 px-4 py-3 pr-28 text-white/60 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-purple-300 disabled:opacity-50"
                aria-label="Referral code"
                aria-invalid={!!referralError}
                aria-describedby={referralError ? 'referral-error' : undefined}
              />

              <button
                type="submit"
                disabled={!referralCode || isApplyingReferral}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg px-6 py-1.5 text-sm font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer ${
                  shouldHighlight
                    ? 'bg-amber-500 hover:bg-amber-600 shadow-[0_0_20px_rgba(251,176,34,0.5)] animate-pulse'
                    : 'bg-purple-500 hover:bg-purple-600'
                }`}
              >
                {isApplyingReferral ? 'Applying...' : 'Apply'}
              </button>
            </div>

            {referralError && (
              <p id="referral-error" className="text-xs text-error-300 mt-2" role="alert">
                {referralError}
              </p>
            )}
            {referralSuccess && (
              <p className="text-xs text-success-300 mt-2" role="status">
                {referralSuccess}
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}
