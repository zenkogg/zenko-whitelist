'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import ShinyText from '@/components/ShinyText';
import FuzzyText from '@/components/FuzzyText';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ReferralCodeCardProps {
  referralCode: string;
  referralCount: number;
}

export function ReferralCodeCard({ referralCode, referralCount }: ReferralCodeCardProps) {
  const earlyAccessStatus = referralCount >= 50 ? 'approved' : 'pending';
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'link'>('code');
  const [isHoveringLink, setIsHoveringLink] = useState(false);

  const handleCopy = useCallback(() => {
    if (activeTab === 'code') {
      navigator.clipboard.writeText(referralCode.trim());
    } else {
      if (typeof window === 'undefined') return;
      const referralLink = `${window.location.origin}/?ref=${referralCode.trim()}`;
      navigator.clipboard.writeText(referralLink);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [activeTab, referralCode]);

  const shouldShowLink = activeTab === 'link' || isHoveringLink;

  const handleShareOnTwitter = useCallback(() => {
    if (typeof window === 'undefined') return;

    const referralLink = `${window.location.origin}/?ref=${referralCode}`;
    const tweetText = `Join me on Zenko - where real performance determines the outcome! 🎮\n\nUse my referral code to skip the waitlist: ${referralCode}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(referralLink)}`;

    window.open(twitterUrl, '_blank', 'width=550,height=420');
  }, [referralCode]);

  return (
    <div className="rounded-2xl bg-white/5 p-6 backdrop-blur-md border-2 border-purple-300/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col h-full w-full">
      <div className="mb-4 flex items-center gap-2">
        <Image
          src="/images/icons/zenko-rp.svg"
          alt="XP"
          width={20}
          height={20}
          className="h-5 w-5"
          style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(85%) saturate(1574%) hue-rotate(359deg) brightness(101%) contrast(98%)' }}
        />
        <h2 className="text-lg font-semibold text-white">Your referral code</h2>
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
      <p className="mb-6 text-sm text-neutral-800">
        Share your unique referral code. Earn 10 referral points for every verified signup.
      </p>

      {/* Prominent Code/Link Display with Tabs */}
      <div className="mb-6 rounded-xl bg-black/40 p-6">
        {/* Header with Tabs */}
        <div className="flex items-center gap-3 mb-4">
          {/* Code Tab */}
          <button
            onClick={() => setActiveTab('code')}
            className={`text-xs font-medium uppercase tracking-wide transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'text-white [text-shadow:0_0_4px_rgba(179,142,243,0.3)]'
                : 'text-purple-300/30 hover:text-purple-300/60'
            }`}
          >
            Your Code
          </button>

          {/* Separator */}
          <div className="h-4 w-px bg-white/20" />

          {/* Link Tab */}
          <button
            onClick={() => setActiveTab('link')}
            onMouseEnter={() => setIsHoveringLink(true)}
            onMouseLeave={() => setIsHoveringLink(false)}
            className={`text-xs font-medium uppercase tracking-wide transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'text-white [text-shadow:0_0_4px_rgba(179,142,243,0.3)]'
                : 'text-purple-300/30 hover:text-purple-300/60'
            }`}
          >
            Your Link
          </button>
        </div>

        {/* Display Area with Copy Icon */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 relative h-12 overflow-hidden">
            {/* Code View */}
            <div className={`absolute left-0 top-0 w-full transition-transform duration-300 ease-out flex items-center h-12 ${
              shouldShowLink ? '-translate-y-full' : 'translate-y-0'
            }`}>
              <ShinyText
                text={referralCode}
                speed={3}
                color="#9E77ED"
                shineColor="#E9D5FF"
                direction="right"
                className="text-3xl font-bold tracking-widest [font-family:var(--font-sora)]"
              />
            </div>

            {/* Link View */}
            <div className={`absolute left-0 top-0 w-full transition-transform duration-300 ease-out flex items-center h-12 ${
              shouldShowLink ? 'translate-y-0' : 'translate-y-full'
            }`}>
              <span className="text-lg font-semibold text-amber-500">
                {typeof window !== 'undefined' && `${window.location.host}/?ref=${referralCode}`}
              </span>
            </div>
          </div>

          {/* Copy Button with Label */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 text-purple-300/80 transition-colors hover:text-purple-300 flex-shrink-0 cursor-pointer"
            aria-label={copied ? "Copied!" : `Copy ${activeTab}`}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span className="text-sm font-medium">
              {copied ? 'Copied!' : activeTab === 'code' ? 'Copy code' : 'Copy link'}
            </span>
          </button>
        </div>
      </div>

      {/* Share Button */}
      <button
        onClick={handleShareOnTwitter}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-zenko-purple px-4 py-3 text-base font-medium text-white transition-all hover:bg-purple-700 mt-auto cursor-pointer"
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
      className="h-6 w-6"
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
      className="h-6 w-6 text-green-400"
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

function LinkIcon() {
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
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
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
