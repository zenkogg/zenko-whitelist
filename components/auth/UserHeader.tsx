'use client';

import { signOut } from 'next-auth/react';
import Image from 'next/image';
import type { Session } from 'next-auth';

interface UserHeaderProps {
  session: Session;
}

export function UserHeader({ session }: UserHeaderProps) {
  const user = session.user;
  const oauthProvider = (user as any)?.oauthProvider || 'google';

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  return (
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
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2">
            {user.image && (
              <Image
                src={user.image}
                alt={user.name || 'User'}
                width={32}
                height={32}
                className="h-8 w-8 rounded-full"
              />
            )}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">
                {user.name || user.email}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <ProviderIcon provider={oauthProvider} />
                {oauthProvider === 'google' ? 'Google' : oauthProvider === 'twitch' ? 'Twitch' : 'X'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            Log Out
          </button>
        </div>
      </div>
    </header>
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

  if (provider === 'twitter') {
    return (
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }

  // Google icon
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
