'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import ShinyText from '@/components/ShinyText';
import FuzzyText from '@/components/FuzzyText';
import { CollapsibleCard } from './CollapsibleCard';


interface ReferralCodeCardProps {
  userId: string;
  referralCode: string;
  username?: string | null;
  referralCount: number;
  onUsernameUpdated?: (newUsername: string) => void;
  defaultCollapsed?: boolean;
  collapsible?: boolean;
}

type AvailabilityState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available' }
  | { status: 'invalid'; message: string };

export function ReferralCodeCard({ userId, referralCode, username, referralCount, onUsernameUpdated, defaultCollapsed = false, collapsible = false }: ReferralCodeCardProps) {
  const [linkCopied, setLinkCopied] = useState(false);

  // Share slug is the canonical referral identifier — username when set, else the 6-char code.
  // Always rendered/shared uppercase to match the existing referral-code visual treatment.
  const shareSlug = (username ?? referralCode).toUpperCase();

  // Edit-mode state for claiming/changing the username.
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(username ?? '');
  const [availability, setAvailability] = useState<AvailabilityState>({ status: 'idle' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const checkTokenRef = useRef(0);

  // Debounced availability check while typing.
  useEffect(() => {
    if (!isEditing) return;
    const value = draft.trim();
    // Same as current — skip check (no-op save would still succeed but UX-wise treat as idle).
    if (!value || value.toLowerCase() === (username ?? '').toLowerCase()) {
      setAvailability({ status: 'idle' });
      return;
    }
    setAvailability({ status: 'checking' });
    const myToken = ++checkTokenRef.current;
    const handle = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ username: value, userId });
        const res = await fetch(`/api/user/username?${params}`);
        const data = await res.json();
        if (myToken !== checkTokenRef.current) return; // stale response
        if (data.available) {
          setAvailability({ status: 'available' });
        } else {
          setAvailability({ status: 'invalid', message: data.error || 'Unavailable' });
        }
      } catch {
        if (myToken !== checkTokenRef.current) return;
        setAvailability({ status: 'idle' });
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [draft, isEditing, userId, username]);

  const startEdit = useCallback(() => {
    setDraft(username ?? '');
    setSaveError(null);
    setAvailability({ status: 'idle' });
    setIsEditing(true);
  }, [username]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setDraft(username ?? '');
    setSaveError(null);
    setAvailability({ status: 'idle' });
  }, [username]);

  const handleSave = useCallback(async () => {
    const value = draft.trim();
    if (!value) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/user/username', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.message || 'Could not update username');
        return;
      }
      const newUsername: string = data.data?.user?.username ?? value;
      onUsernameUpdated?.(newUsername);
      setIsEditing(false);
    } catch {
      setSaveError('Network error — try again');
    } finally {
      setIsSaving(false);
    }
  }, [draft, userId, onUsernameUpdated]);

  const canSave =
    !isSaving &&
    draft.trim().length > 0 &&
    draft.trim().toLowerCase() !== (username ?? '').toLowerCase() &&
    availability.status !== 'invalid' &&
    availability.status !== 'checking';

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
          {isEditing ? (
            <>
              {/* Edit mode: input + save/cancel */}
              <div className="flex items-center gap-2">
                <span className="text-sm md:text-base text-purple-400/60 [font-family:var(--font-sora)] flex-shrink-0">
                  {typeof window !== 'undefined' ? `${window.location.host}/r/` : '/r/'}
                </span>
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="username"
                  autoFocus
                  disabled={isSaving}
                  maxLength={30}
                  className="flex-1 min-w-0 rounded-lg bg-black/40 px-3 py-2 text-base md:text-lg font-bold text-purple-300 placeholder-purple-400/30 outline-none border border-purple-300/20 focus:border-purple-300/60 transition-colors uppercase tracking-wider [font-family:var(--font-sora)] disabled:opacity-50"
                  aria-label="Username"
                  aria-invalid={availability.status === 'invalid'}
                />
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="flex-shrink-0 rounded-lg bg-zenko-purple px-3 py-2 text-sm font-medium text-white transition-all hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={cancelEdit}
                  disabled={isSaving}
                  className="flex-shrink-0 rounded-lg border border-purple-300/20 px-3 py-2 text-sm font-medium text-purple-300/70 transition-all hover:bg-white/5 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              {/* Live availability + error feedback */}
              <p className="mt-3 text-xs min-h-[1rem]" role="status" aria-live="polite">
                {saveError ? (
                  <span className="text-error-300">{saveError}</span>
                ) : availability.status === 'checking' ? (
                  <span className="text-purple-400/50">Checking...</span>
                ) : availability.status === 'available' ? (
                  <span className="text-success-300">✓ Available</span>
                ) : availability.status === 'invalid' ? (
                  <span className="text-error-300">{availability.message}</span>
                ) : (
                  <span className="text-purple-400/40">3–30 chars · letters, numbers, hyphens</span>
                )}
              </p>
            </>
          ) : (
            <>
              {/* Hero: share slug + edit + copy-link button */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <ShinyText
                    text={shareSlug}
                    speed={3}
                    color="#9E77ED"
                    shineColor="#E9D5FF"
                    direction="right"
                    className="text-xl md:text-3xl font-bold tracking-widest [font-family:var(--font-sora)] truncate"
                  />
                  <button
                    onClick={startEdit}
                    className="flex-shrink-0 text-purple-300/40 transition-colors hover:text-purple-300 cursor-pointer p-1"
                    aria-label="Edit username"
                    title="Edit username"
                  >
                    <PencilIcon />
                  </button>
                </div>

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
            </>
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

function PencilIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
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
