'use client';

import { useState, useCallback } from 'react';

interface ApplyReferralCardProps {
  userId: string;
  usedReferralCode: string | null;
  currentReputationPoints: number;
  onReferralApplied: () => void;
}

export function ApplyReferralCard({
  userId,
  usedReferralCode,
  currentReputationPoints,
  onReferralApplied,
}: ApplyReferralCardProps) {
  const [referralCode, setReferralCode] = useState('');
  const [isApplyingReferral, setIsApplyingReferral] = useState(false);
  const [referralError, setReferralError] = useState('');
  const [referralSuccess, setReferralSuccess] = useState('');

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
    setReferralCode(e.target.value.toUpperCase());
  }, []);

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-green-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
        <h2 className="text-lg font-semibold text-white">
          {usedReferralCode ? 'Referral Code Applied' : 'Have a referral code?'}
        </h2>
      </div>
      <p className="mb-4 text-sm text-gray-300">
        {usedReferralCode
          ? "You've already used a referral code"
          : 'Use the referral code to earn 10 points.'}
      </p>

      {usedReferralCode ? (
        <div className="rounded-lg border border-green-500/20 bg-green-500/20 px-4 py-3">
          <div className="mb-1 text-xs text-green-300">Applied Code</div>
          <div className="text-xl font-bold tracking-wider text-green-400">
            {usedReferralCode}
          </div>
        </div>
      ) : (
        <form onSubmit={handleApplyReferral}>
          <input
            type="text"
            value={referralCode}
            onChange={handleInputChange}
            placeholder="Add code or link"
            disabled={isApplyingReferral}
            maxLength={6}
            className="mb-3 w-full rounded-lg border border-white/20 bg-black/40 px-4 py-3 text-white placeholder-gray-500 focus:border-[#7F56D9] focus:outline-none focus:ring-1 focus:ring-[#7F56D9] disabled:opacity-50"
            aria-label="Referral code"
            aria-invalid={!!referralError}
            aria-describedby={referralError ? 'referral-error' : undefined}
          />
          <button
            type="submit"
            disabled={!referralCode || isApplyingReferral}
            className="w-full rounded-lg bg-white/10 px-4 py-3 text-base font-medium text-white transition-all hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApplyingReferral ? 'Applying...' : 'Apply Code'}
          </button>
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
      )}
    </div>
  );
}
