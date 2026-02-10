'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

interface UserStats {
  referralCode: string;
  referralCount: number;
  reputationPoints: number;
  twitterConnected: boolean;
  twitterHandle?: string;
  usedReferralCode?: string | null;
}

interface User {
  id: string;
  email: string | null;
  displayName: string;
  oauthProvider: string;
  oauthAvatarUrl: string | null;
  customAvatarUrl: string | null;
  games: string[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isApplyingReferral, setIsApplyingReferral] = useState(false);
  const [referralError, setReferralError] = useState('');
  const [referralSuccess, setReferralSuccess] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState('');

  useEffect(() => {
    // Check localStorage for user
    const storedUser = localStorage.getItem('waitlist_user');
    if (!storedUser) {
      router.push('/');
      return;
    }

    const userData = JSON.parse(storedUser);

    // Redirect if no games selected
    if (!userData.games || userData.games.length === 0) {
      router.push('/?step=games');
      return;
    }

    setUser(userData);
    fetchUserStats(userData.id);
  }, [router]);

  const fetchUserStats = async (userId: string) => {
    try {
      const response = await fetch('/api/user/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const result = await response.json();

      // Handle the API response format with nested data
      if (result.success && result.data) {
        setUserStats({
          referralCode: result.data.user.referralCode,
          referralCount: result.data.stats.referralCount,
          reputationPoints: result.data.stats.reputationPoints,
          twitterConnected: !!result.data.user.twitterHandle,
          twitterHandle: result.data.user.twitterHandle,
          usedReferralCode: result.data.user.usedReferralCode,
        });
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReferralLink = () => {
    const referralLink = `${window.location.origin}/?ref=${userStats?.referralCode}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareOnTwitter = () => {
    if (!userStats?.referralCode) return;

    const referralLink = `${window.location.origin}/?ref=${userStats.referralCode}`;
    const tweetText = `Join me on Zenko - where real performance determines the outcome! 🎮\n\nUse my referral code to skip the waitlist: ${userStats.referralCode}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(referralLink)}`;

    window.open(twitterUrl, '_blank', 'width=550,height=420');
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
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
          userId: user?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to apply referral code');
      }

      const { data } = await response.json();

      // Update user stats with new reputation points
      setReferralSuccess(`Referral code applied! You earned ${data.user.reputationPoints - (userStats?.reputationPoints || 0)} reputation points.`);
      setReferralCode('');

      // Refresh user stats
      if (user) {
        fetchUserStats(user.id);
      }
    } catch (error: any) {
      console.error('Apply referral error:', error);
      setReferralError(error.message || 'Failed to apply referral code');
    } finally {
      setIsApplyingReferral(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);
    setAvatarUploadError('');

    try {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('userId', user.id);

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload avatar');
      }

      const { data } = await response.json();

      // Update user in state and localStorage
      const updatedUser = { ...user, customAvatarUrl: data.avatarUrl };
      setUser(updatedUser);
      localStorage.setItem('waitlist_user', JSON.stringify(updatedUser));
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      setAvatarUploadError(error.message || 'Failed to upload avatar');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('waitlist_user');
    router.push('/');
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#7F56D9] border-t-transparent" />
      </div>
    );
  }

  if (!userStats) {
    return null;
  }

  const oauthProvider = user.oauthProvider || 'google';
  const progress = Math.min((userStats.referralCount / 50) * 100, 100);

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/mushrooms.png"
          alt="Background"
          fill
          className="object-cover blur-[2px]"
          priority
          quality={90}
        />
      </div>

      {/* Dim Overlay */}
      <div className="absolute inset-0 z-[1] bg-black/60" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Image
              src="/images/zenko-head.svg"
              alt="Zenko Logo"
              width={40}
              height={40}
              className="h-10 w-10"
            />
            <span className="text-xl font-semibold text-[#fdb022]">Zenko</span>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-xl">
              <Image
                src={user.customAvatarUrl || '/images/default-avatar.svg'}
                alt={user.displayName}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium text-white">
                  {oauthProvider === 'google' ? user.displayName : `@${user.displayName}`}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <ProviderIcon provider={oauthProvider} />
                  {oauthProvider === 'google' ? 'Google' : 'Twitch'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-xl transition-colors hover:bg-white/20"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 px-6 py-12">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Welcome Section */}
          <div className="text-center">
            <h1 className="mb-2 text-4xl font-semibold text-[#cbbaee]">
              Welcome to the Waitlist!
            </h1>
            <p className="text-gray-300">
              Refer friends to boost your reputation and get early access
            </p>
          </div>

          {/* Stats Grid - 3 Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Referrals Card */}
            <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
              <div className="mb-2 text-sm font-medium text-gray-300">Referrals</div>
              <div className="text-3xl font-bold text-white">{userStats.referralCount}</div>
              <div className="mt-1 text-xs text-gray-400">out of 50 for priority access</div>
            </div>

            {/* Reputation Card */}
            <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
              <div className="mb-2 text-sm font-medium text-gray-300">Reputation</div>
              <div className="text-3xl font-bold text-[#fdb022]">
                {userStats.reputationPoints}
              </div>
              <div className="mt-1 text-xs text-gray-400">points earned</div>
            </div>

            {/* Status Card */}
            <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
              <div className="mb-2 text-sm font-medium text-gray-300">Status</div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-lg font-semibold text-white">Pending</span>
              </div>
              <div className="mt-1 text-xs text-gray-400">Waiting for beta access</div>
            </div>
          </div>

          {/* Referral Progress Card */}
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Referral Progress</h2>
              <span className="text-sm text-gray-300">
                {userStats.referralCount}/50 referrals
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7F56D9] to-[#9b8afb] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-gray-300">
              Refer 50 friends to get priority beta access and bonus reputation
            </p>
          </div>

          {/* Referral Code Card */}
          <div className="rounded-2xl border border-[#7F56D9]/30 bg-gradient-to-br from-[#7F56D9]/20 to-white/10 p-6 backdrop-blur-xl">
            <h2 className="mb-4 text-lg font-semibold text-white">Your Referral Code</h2>

            {/* Referral Code Display */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-xl">
                <div className="text-xs text-gray-300">Referral Code</div>
                <div className="text-2xl font-bold tracking-wider text-[#fdb022]">
                  {userStats.referralCode}
                </div>
              </div>
              <button
                onClick={handleCopyReferralLink}
                className="flex h-full items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white backdrop-blur-xl transition-colors hover:bg-white/20"
              >
                {copied ? (
                  <>
                    <CheckIcon />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <CopyIcon />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Social Sharing */}
            <div className="space-y-3">
              <button
                onClick={handleShareOnTwitter}
                className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-base font-medium text-white backdrop-blur-xl transition-all hover:bg-white/20"
              >
                <TwitterIcon />
                <span>Share on X</span>
              </button>
            </div>

            {/* OG Preview */}
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-medium text-gray-300">Share Preview</h3>
              <p className="text-xs text-gray-400">
                This is how your referral link will appear when shared on social media
              </p>
              <div className="overflow-hidden rounded-lg border border-white/20 bg-black/40">
                <Image
                  src={`/api/og?ref=${userStats.referralCode}&t=${Date.now()}`}
                  alt="Referral share preview"
                  key={Date.now()}
                  width={1200}
                  height={630}
                  className="w-full h-auto"
                  unoptimized
                />
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <p className="text-xs text-gray-400">Share link:</p>
                <p className="text-sm text-[#7F56D9] break-all">
                  {typeof window !== 'undefined' && `${window.location.origin}/r/${userStats.referralCode}`}
                </p>
              </div>
            </div>
          </div>

          {/* Use Referral Code Card */}
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 backdrop-blur-xl">
            <h2 className="mb-2 text-lg font-semibold text-white">
              {userStats.usedReferralCode ? 'Referral Code Applied' : 'Have a Referral Code?'}
            </h2>

            {userStats.usedReferralCode ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-300">
                  You&apos;ve already used a referral code
                </p>
                <div className="rounded-lg border border-green-500/20 bg-green-500/20 px-4 py-3">
                  <div className="text-xs text-green-300 mb-1">Applied Code</div>
                  <div className="text-2xl font-bold tracking-wider text-green-400">
                    {userStats.usedReferralCode}
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  ✓ You can only use one referral code per account
                </p>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-gray-300">
                  Enter a friend&apos;s code to boost your reputation
                </p>

                <form onSubmit={handleApplyReferral} className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="Enter 6-character code"
                      maxLength={6}
                      disabled={isApplyingReferral}
                      className="flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-gray-400 backdrop-blur-xl transition-colors focus:border-green-500 focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingReferral || !referralCode.trim()}
                      className="rounded-lg border border-green-500/30 bg-green-500/20 px-6 py-3 text-sm font-medium text-white backdrop-blur-xl transition-colors hover:bg-green-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isApplyingReferral ? 'Applying...' : 'Apply'}
                    </button>
                  </div>

                  {referralError && (
                    <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                      {referralError}
                    </div>
                  )}

                  {referralSuccess && (
                    <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                      {referralSuccess}
                    </div>
                  )}
                </form>
              </>
            )}
          </div>

          {/* Profile Card */}
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">
            <h2 className="mb-4 text-lg font-semibold text-white">Your Profile</h2>

            <div className="flex items-center gap-6">
              {/* Avatar Display */}
              <div className="relative">
                <Image
                  src={user.customAvatarUrl || '/images/default-avatar.svg'}
                  alt={user.displayName}
                  width={100}
                  height={100}
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-white/20"
                />
                {isUploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#7F56D9] border-t-transparent" />
                  </div>
                )}
              </div>

              {/* Upload Section */}
              <div className="flex-1">
                <div className="mb-2">
                  <label
                    htmlFor="avatar-upload"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-xl transition-colors hover:bg-white/20"
                  >
                    <UploadIcon />
                    <span>{user.customAvatarUrl ? 'Change Avatar' : 'Upload Avatar'}</span>
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Upload a custom avatar (JPEG, PNG, or WebP, max 5MB)
                </p>
                {avatarUploadError && (
                  <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {avatarUploadError}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6 backdrop-blur-xl">
            <div className="flex gap-4">
              <div className="mt-1">
                <InfoIcon />
              </div>
              <div>
                <h3 className="mb-1 font-semibold text-white">How to Earn Reputation</h3>
                <ul className="space-y-1 text-sm text-gray-300">
                  <li>• Share your referral code with friends (+10 points per referral)</li>
                  <li>• Connect your X/Twitter account (+5 points)</li>
                  <li>• Share on X/Twitter (+5 points per share)</li>
                  <li>• Reach 50 referrals for priority beta access</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/40 px-6 py-6 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-sm uppercase tracking-wide">Built on</span>
            <Image
              src="/images/icons/sui.svg"
              alt="Sui"
              width={46}
              height={16}
              className="h-4 w-auto"
            />
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://www.instagram.com/zenkogg?igsh=YzdqYTc0N2ZuMzNx&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7F56D9] transition-colors hover:text-[#9b8afb]"
              aria-label="Instagram"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://x.com/zenkogginc?s=21&t=aZd4S6kCPZBx-rpP3YEdAg"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7F56D9] transition-colors hover:text-[#9b8afb]"
              aria-label="X (Twitter)"
            >
              <XIcon />
            </a>
          </div>

          <span className="text-xs text-gray-400">© 2026 Zenko, All rights reserved.</span>
        </div>
      </footer>
    </main>
  );
}

function ProviderIcon({ provider }: { provider: string }) {
  if (provider === 'twitch') {
    return (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
      </svg>
    );
  }

  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
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
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      className="h-5 w-5 text-blue-400"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="size-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}
