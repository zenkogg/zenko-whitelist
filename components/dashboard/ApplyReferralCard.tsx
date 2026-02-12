'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { TicketIcon } from '@heroicons/react/24/outline';

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

      setIsApplyingReferral(true);

      try {
        const response = await fetch('/api/user/referral', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referralCode: referralCode.trim().toUpperCase(),
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
    const input = e.target.value;

    // Try to extract referral code from URL
    try {
      const url = new URL(input);
      const refParam = url.searchParams.get('ref');
      if (refParam) {
        setReferralCode(refParam.toUpperCase());
        return;
      }
    } catch {
      // Not a valid URL, treat as direct code
    }

    setReferralCode(input.toUpperCase());
  }, []);

  return (
    <div className={`rounded-2xl bg-white/5 p-6 backdrop-blur-md border-2 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col h-full w-full transition-all duration-500 ${
      shouldHighlight
        ? 'border-amber-500/60 shadow-[0_0_40px_rgba(251,176,34,0.3),0_8px_32px_0_rgba(0,0,0,0.37)] animate-pulse'
        : 'border-purple-300/20'
    }`}>
      <div className="mb-4 flex items-center gap-2">
        <TicketIcon className="h-5 w-5 text-purple-300" />
        <h2 className="text-lg font-semibold text-white">
          {usedReferralCode ? 'Applied Referral Code' : 'Have a referral code?'}
        </h2>
      </div>

      <form onSubmit={handleApplyReferral}>
        <div className="flex gap-2">
          <input
            type="text"
            value={usedReferralCode || referralCode}
            onChange={handleInputChange}
            placeholder="Code or link"
            disabled={isApplyingReferral || !!usedReferralCode}
            readOnly={!!usedReferralCode}
            maxLength={usedReferralCode ? 6 : undefined}
            className="flex-1 rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-purple-300 focus:outline-none focus:ring-1 focus:ring-purple-300 disabled:opacity-50 read-only:opacity-70"
            aria-label="Referral code"
            aria-invalid={!!referralError}
            aria-describedby={referralError ? 'referral-error' : undefined}
          />
          {usedReferralCode ? (
            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-3 min-w-32">
              {referrerInfo?.avatarUrl && (
                <Image
                  src={referrerInfo.avatarUrl}
                  alt={referrerInfo.displayName}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full object-cover border-2 border-purple-300/40"
                />
              )}
              <span className="text-xs text-neutral-700">
                by <span className="text-xs text-purple-400">{referrerInfo?.displayName || 'User'}</span>
              </span>
            </div>
          ) : (
            <button
              type="submit"
              disabled={!referralCode || isApplyingReferral}
              className={`rounded-lg px-6 py-3 text-base font-medium text-white transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                shouldHighlight
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-[0_0_20px_rgba(251,176,34,0.5)] animate-pulse'
                  : 'bg-purple-500 hover:bg-purple-600'
              }`}
            >
              {isApplyingReferral ? 'Applying...' : 'Apply'}
            </button>
          )}
        </div>
        {referralError && (
          <p id="referral-error" className="mt-2 text-sm text-red-400" role="alert">
            {referralError}
          </p>
        )}
        {referralSuccess && (
          <p className="mt-2 text-sm text-green-400" role="status">
            {referralSuccess}
          </p>
        )}
      </form>
    </div>
  );
}
