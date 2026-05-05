'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import ShinyText from '@/components/ShinyText';
import FuzzyText from '@/components/FuzzyText';
import { CollapsibleCard } from './CollapsibleCard';


interface ReferralCodeCardProps {
  referralCode: string;
  username?: string | null;
  referralCount: number;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
}

export function ReferralCodeCard({ referralCode, username, referralCount, defaultCollapsed = false, collapsible = false }: ReferralCodeCardProps) {
  const [copied, setCopied] = useState(false);

  const [linkCopied, setLinkCopied] = useState(false);

  // Share slug is the canonical referral identifier — username when set, else the 6-char code.
  // Always rendered/shared uppercase to match the existing referral-code visual treatment.
  const shareSlug = (username ?? referralCode).toUpperCase();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(referralCode.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [referralCode]);

  const isMobile = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleShareLink = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const referralLink = `${window.location.origin}/r/${shareSlug.trim()}`;

    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: 'Join Zenko',
          text: `Use my referral code ${referralCode} and we both earn bonus XP`,
          url: referralLink,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    navigator.clipboard.writeText(referralLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [shareSlug, referralCode, isMobile]);

  const handleShareOnTwitter = useCallback(() => {
    if (typeof window === 'undefined') return;

    const referralLink = `${window.location.origin}/r/${shareSlug}`;
    const tweetText = `Reputation has no off-season. I just joined @zenkogginc — The Origin.\n\nUse my code ${referralCode} and we both earn bonus XP 👇`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(referralLink)}`;

    window.open(twitterUrl, '_blank', 'width=550,height=420');
  }, [shareSlug, referralCode]);

  return (
    <div className="rounded-2xl bg-white/5 p-4 md:p-6 backdrop-blur-md border-2 border-purple-300/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col h-full w-full">
      <CollapsibleCard
        defaultCollapsed={defaultCollapsed}
        collapsible={collapsible}
        title={
          <div className="flex items-center gap-2">
            <Image
              src="/images/icons/zenko-rp.svg"
              alt="XP"
              width={20}
              height={20}
              className="h-5 w-5 flex-shrink-0"
              style={{ filter: 'brightness(0) saturate(100%) invert(65%) sepia(85%) saturate(1574%) hue-rotate(359deg) brightness(101%) contrast(98%)' }}
            />
            <h2 className="text-base md:text-lg font-semibold text-white whitespace-nowrap">Your referral code</h2>
            <div className="ml-auto flex items-center justify-end">
              <FuzzyText
                fontSize="clamp(11px, 1.5vw, 15px)"
                fontFamily="'Press Start 2P'"
                color="#FDB022"
                baseIntensity={0.05}
                fuzzRange={20}
                enableHover={false}
                glitchMode={true}
                glitchInterval={2800}
                glitchDuration={200}
                letterSpacing={-1}
                className=''
              >
                +10 XP
              </FuzzyText>
            </div>
          </div>
        }
      >
        <p className="mb-4 md:mb-6 text-sm text-neutral-800">
          Bring your squad. History isn&apos;t built solo.
        </p>

        {/* Share Display */}
        <div className="mb-4 md:mb-6 rounded-xl bg-black/40 p-4 md:p-6">
          {/* Hero: share slug + copy-link button */}
          <div className="flex items-center justify-between gap-4">
            <ShinyText
              text={shareSlug}
              speed={3}
              color="#9E77ED"
              shineColor="#E9D5FF"
              direction="right"
              className="text-xl md:text-3xl font-bold tracking-widest [font-family:var(--font-sora)] truncate"
            />

            {/* Copy Link Button */}
            <button
              onClick={handleShareLink}
              className="flex items-center gap-2 text-purple-300/80 transition-colors hover:text-purple-300 flex-shrink-0 cursor-pointer"
              aria-label={linkCopied ? "Copied!" : "Copy link"}
            >
              {linkCopied ? <CheckIcon /> : <CopyIcon />}
              <span className="text-sm font-medium">
                {linkCopied ? 'Copied!' : 'Copy link'}
              </span>
            </button>
          </div>

          {/* Referral URL */}
          <p className="mt-3 text-xs md:text-sm text-purple-400/40 truncate">
            {typeof window !== 'undefined' && `${window.location.host}/r/${shareSlug}`}
          </p>

          {/* Secondary: 6-char code (only when distinct from the hero — i.e. user has a username) */}
          {username && (
            <div className="mt-4 pt-4 border-t border-purple-300/10 flex items-center justify-between gap-4">
              <p className="text-xs md:text-sm text-purple-400/50">
                Code: <span className="font-semibold tracking-wider text-purple-300/70">{referralCode}</span>
              </p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-purple-300/60 transition-colors hover:text-purple-300 flex-shrink-0 cursor-pointer"
                aria-label={copied ? "Copied!" : "Copy code"}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                <span className="text-xs font-medium">
                  {copied ? 'Copied!' : 'Copy code'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Share Buttons */}
        <div className="flex flex-col gap-2 mt-auto">
          <button
            onClick={handleShareOnTwitter}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zenko-purple px-4 py-3 text-sm font-medium text-white transition-all hover:bg-purple-700 cursor-pointer"
          >
            <span>Share on</span>
            <TwitterIcon />
          </button>
          <button
            onClick={handleShareLink}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 border border-purple-300/20 px-4 py-3 text-sm font-medium text-neutral-600 transition-all hover:bg-white/10 cursor-pointer"
          >
            <span className="md:hidden">{linkCopied ? 'Link copied!' : 'Share link'}</span>
            <span className="hidden md:inline">{linkCopied ? 'Link copied!' : 'Copy link'}</span>
          </button>
        </div>
      </CollapsibleCard>
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

function TwitterIcon() {
  return (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
