'use client';

import { useState, useCallback } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

interface ReferralCodeCardProps {
  referralCode: string;
  referralCount: number;
}

export function ReferralCodeCard({ referralCode, referralCount }: ReferralCodeCardProps) {
  const earlyAccessStatus = referralCount >= 50 ? 'approved' : 'pending';
  const [copied, setCopied] = useState(false);

  const handleCopyReferralLink = useCallback(() => {
    if (typeof window === 'undefined') return;

    const referralLink = `${window.location.origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralCode]);

  const handleShareOnTwitter = useCallback(() => {
    if (typeof window === 'undefined') return;

    const referralLink = `${window.location.origin}/?ref=${referralCode}`;
    const tweetText = `Join me on Zenko - where real performance determines the outcome! 🎮\n\nUse my referral code to skip the waitlist: ${referralCode}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(referralLink)}`;

    window.open(twitterUrl, '_blank', 'width=550,height=420');
  }, [referralCode]);

  return (
    <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-md border-2 border-purple-300/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
      <div className="mb-4 flex items-center gap-2">
        <SparklesIcon className="h-5 w-5 text-purple-300" />
        <h2 className="text-lg font-semibold text-white">Your referral code</h2>
      </div>
      <p className="mb-4 text-sm text-neutral-800">
        Share your unique referral link. Earn 10 referral points for every verified signup.
      </p>

      {/* Referral Link */}
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-white/20 bg-black/40 px-4 py-3">
        <span className="flex-1 text-sm text-white">
          {typeof window !== 'undefined' && `${window.location.host}/r/${referralCode}`}
        </span>
        <button
          onClick={handleCopyReferralLink}
          className="text-neutral-700 transition-colors hover:text-white"
          aria-label={copied ? 'Copied to clipboard' : 'Copy referral link'}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>

      {/* Share Button */}
      <button
        onClick={handleShareOnTwitter}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-zenko-purple px-4 py-3 text-base font-medium text-white transition-all hover:bg-[#9b8afb]"
      >
        <span>Share on</span>
        <TwitterIcon />
      </button>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 text-green-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
